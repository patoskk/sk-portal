// El resumen de novedades, CADA DOS SEMANAS (Pato, 30/09: "quiero que las novedades se avisen a los clientes
// cada dos semanas, no cada mes"). n8n ("SK — Novedades: resumen quincenal") llama acá un miércoles sí y otro no.
//
// Existe porque una novedad que nadie ve no sirve: las lecturas de las lecciones vienen casi todas del mail,
// y la sección Novedades del portal solo la ve quien entra.
//
// QUÉ ENTRA en el mail de cada cliente: todo lo publicado para él (y lo global) DESDE SU ÚLTIMO RESUMEN,
// medido por cuándo se cargó en el portal (created_at), no por la fecha de la novedad. Así una novedad que
// se publica tarde, con la fecha del día en que empezó a andar, igual le llega. Un resumen que falló en el
// Gmail (status error) no cuenta: lo suyo vuelve a entrar en el siguiente.
//
// Mismos destinatarios y misma baja que el aviso de lecciones (recipients.ts). Idempotente: unique(client_id,
// period) en update_digests, con period = el día del envío (YYYY-MM-DD): si el workflow corre dos veces el
// mismo día, el segundo no manda nada.
//
// Con `prueba`: UN mail al admin, armado con lo pendiente del primer cliente que tenga algo, y nada queda
// registrado (el resumen de verdad sale igual).
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAutomation, testRecipient, DEMO_CLIENT_ID } from "@/lib/api/requireAutomation";
import { getLessonRecipients } from "@/lib/notify/recipients";
import { renderDigestEmail, digestSubject, type DigestItem } from "@/lib/notify/digestEmail";
import { dispatchToN8n, digestRef, fromName, portalUrl, type OutgoingRecipient } from "@/lib/notify/send";
import { todayAR } from "@/lib/automation/week";
import { isUpdateKind } from "@/lib/updateKinds";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Lo publicado antes de esta fecha no se manda nunca: la sección no se usaba (novedades desde el 01/09). */
const DESDE = "2026-09-01T03:00:00Z"; // 01/09 00:00 en Argentina

/** Desde cuándo le debemos novedades a un cliente: su último resumen que no falló, o DESDE. */
async function cursorDe(admin: SupabaseClient, clientId: string): Promise<string> {
  const { data } = await admin
    .from("update_digests")
    .select("created_at")
    .eq("client_id", clientId)
    .neq("status", "error")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.created_at as string | undefined) ?? DESDE;
}

async function pendientes(admin: SupabaseClient, clientId: string): Promise<DigestItem[]> {
  const desde = await cursorDe(admin, clientId);
  const { data, error } = await admin
    .from("updates")
    .select("kind,title,body,published_at,created_at,client_id")
    .or(`client_id.eq.${clientId},client_id.is.null`)
    .gt("created_at", desde)
    .order("published_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => ({
    kind: isUpdateKind(u.kind as string) ? (u.kind as DigestItem["kind"]) : "mejora",
    title: u.title as string,
    body: (u.body as string | null) ?? null,
  }));
}

export async function POST(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as { prueba?: boolean };
  const prueba = b.prueba === true;
  const period = todayAR();

  const { data: clientes, error: e2 } = await admin!.from("clients").select("id,name").order("created_at");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const subject = digestSubject();
  const updatesUrl = `${portalUrl()}/novedades`;
  const from = fromName();
  const render = (email: string, greetingName: string, clientName: string, items: DigestItem[]): OutgoingRecipient => {
    const { html, text } = renderDigestEmail({ greetingName, items, updatesUrl, fromName: from });
    return { email, client_name: clientName, subject, html, text };
  };

  try {
    // ---------- prueba ----------
    if (prueba) {
      const to = await testRecipient(admin!);
      if (!to) return NextResponse.json({ error: "no encuentro el mail del admin para la prueba" }, { status: 500 });
      for (const c of clientes ?? []) {
        const items = await pendientes(admin!, c.id as string);
        if (!items.length) continue;
        const err = await dispatchToN8n({
          lesson_id: digestRef(period),
          lesson_title: "Resumen de novedades (prueba)",
          test: true,
          recipients: [render(to, "Pato", c.name as string, items)],
        });
        if (err) return NextResponse.json({ error: err }, { status: 502 });
        return NextResponse.json({ prueba: true, test_to: to, periodo: period, enviados: [{ clientName: c.name, count: items.length }], salteados: [] });
      }
      return NextResponse.json({ error: "ningún cliente tiene novedades pendientes para armar la prueba" }, { status: 404 });
    }

    // ---------- envío real ----------
    const { data: deHoy } = await admin!.from("update_digests").select("client_id").eq("period", period);
    const mandadoHoy = new Set((deHoy ?? []).map((r) => r.client_id as string));

    const salteados: { clientName: string; reason: string }[] = [];
    const envios: { clientId: string; clientName: string; recipient: OutgoingRecipient; items: number }[] = [];
    for (const c of clientes ?? []) {
      const id = c.id as string;
      const nombre = c.name as string;
      if (id === DEMO_CLIENT_ID) continue;
      if (mandadoHoy.has(id)) { salteados.push({ clientName: nombre, reason: "ya se le mandó hoy" }); continue; }
      const items = await pendientes(admin!, id);
      if (!items.length) { salteados.push({ clientName: nombre, reason: "sin novedades nuevas" }); continue; }
      const { recipients, skipped } = await getLessonRecipients(admin!, id);
      if (!recipients.length) { salteados.push({ clientName: nombre, reason: skipped[0]?.reason ?? "sin destinatario" }); continue; }
      const r = recipients[0]; // un aviso por cliente, al dueño
      envios.push({ clientId: id, clientName: nombre, recipient: render(r.email, r.greetingName, nombre, items), items: items.length });
    }

    if (!envios.length) return NextResponse.json({ prueba: false, periodo: period, enviados: [], salteados });

    const ins = await admin!.from("update_digests").insert(
      envios.map((e) => ({ client_id: e.clientId, period, email: e.recipient.email, subject, items: e.items, status: "queued" })),
    );
    if (ins.error) return NextResponse.json({ error: "guardando el log: " + ins.error.message }, { status: 500 });

    const err = await dispatchToN8n({
      lesson_id: digestRef(period),
      lesson_title: "Resumen de novedades",
      test: false,
      recipients: envios.map((e) => e.recipient),
    });
    if (err) {
      // el lote no salió: se borra el log, así el cursor no avanza y lo pendiente entra en el siguiente
      await admin!.from("update_digests").delete().eq("period", period).eq("status", "queued");
      return NextResponse.json({ error: err }, { status: 502 });
    }

    return NextResponse.json({
      prueba: false,
      periodo: period,
      enviados: envios.map((e) => ({ clientName: e.clientName, count: e.items })),
      salteados,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
