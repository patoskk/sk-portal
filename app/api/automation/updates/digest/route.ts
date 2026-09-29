// El resumen mensual de novedades: el primer miércoles de cada mes, a cada cliente que tuvo novedades el
// mes anterior le llega UN mail con todas juntas (n8n: "SK — Novedades: resumen del mes").
//
// Existe porque una novedad que nadie ve no sirve: las lecturas de las lecciones vienen casi todas del
// mail, y la sección Novedades del portal solo la ve quien entra.
//
// Mismos destinatarios y misma baja que el aviso de lecciones (recipients.ts): el dueño en persona, y se
// saltea al que no tiene mail o pidió no recibir avisos. Idempotente: unique(client_id, period) en
// update_digests; si el workflow corre dos veces en el mes, el segundo no manda nada.
//
// Con `prueba`: UN mail al admin, armado con las novedades del primer cliente que tenga (o del panel de
// demostración), y nada queda registrado.
import { NextResponse, type NextRequest } from "next/server";
import { requireAutomation, testRecipient, DEMO_CLIENT_ID } from "@/lib/api/requireAutomation";
import { getLessonRecipients } from "@/lib/notify/recipients";
import { renderDigestEmail, digestSubject, type DigestItem } from "@/lib/notify/digestEmail";
import { dispatchToN8n, digestRef, fromName, portalUrl, type OutgoingRecipient } from "@/lib/notify/send";
import { previousPeriodAR, periodRange } from "@/lib/automation/week";
import { isUpdateKind } from "@/lib/updateKinds";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const b = (await req.json().catch(() => ({}))) as { period?: string; prueba?: boolean };
  const prueba = b.prueba === true;
  const period = (b.period ?? "").trim() || previousPeriodAR();
  const rango = periodRange(period);
  if (!rango) return NextResponse.json({ error: "period tiene que ser YYYY-MM" }, { status: 400 });

  const { data: novedades, error: e1 } = await admin!
    .from("updates")
    .select("client_id,kind,title,body,published_at")
    .gte("published_at", rango.from)
    .lt("published_at", rango.to)
    .order("published_at", { ascending: true });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: clientes, error: e2 } = await admin!.from("clients").select("id,name").order("created_at");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const deCliente = (id: string): DigestItem[] =>
    (novedades ?? [])
      .filter((u) => u.client_id === null || u.client_id === id)
      .map((u) => ({
        kind: isUpdateKind(u.kind as string) ? (u.kind as DigestItem["kind"]) : "mejora",
        title: u.title as string,
        body: (u.body as string | null) ?? null,
      }));

  const subject = digestSubject(rango.label);
  const updatesUrl = `${portalUrl()}/novedades`;
  const from = fromName();
  const render = (email: string, greetingName: string, clientName: string, items: DigestItem[]): OutgoingRecipient => {
    const { html, text } = renderDigestEmail({ greetingName, monthLabel: rango.label, items, updatesUrl, fromName: from });
    return { email, client_name: clientName, subject, html, text };
  };

  // ---------- prueba ----------
  if (prueba) {
    const to = await testRecipient(admin!);
    if (!to) return NextResponse.json({ error: "no encuentro el mail del admin para la prueba" }, { status: 500 });
    const conNovedades = (clientes ?? []).find((c) => deCliente(c.id as string).length) ?? { id: DEMO_CLIENT_ID, name: "Panel de demostración" };
    const items = deCliente(conNovedades.id as string);
    if (!items.length) return NextResponse.json({ error: `no hay novedades en ${rango.label} para armar la prueba` }, { status: 404 });
    const err = await dispatchToN8n({
      lesson_id: digestRef(period),
      lesson_title: `Resumen de ${rango.label} (prueba)`,
      test: true,
      recipients: [render(to, "Pato", conNovedades.name as string, items)],
    });
    if (err) return NextResponse.json({ error: err }, { status: 502 });
    return NextResponse.json({
      prueba: true,
      test_to: to,
      periodo: period,
      periodo_label: rango.label,
      enviados: [{ clientName: conNovedades.name, count: items.length }],
      salteados: [],
    });
  }

  // ---------- envío real ----------
  const { data: yaMandados } = await admin!.from("update_digests").select("client_id").eq("period", period);
  const mandado = new Set((yaMandados ?? []).map((r) => r.client_id as string));

  const salteados: { clientName: string; reason: string }[] = [];
  const envios: { clientId: string; clientName: string; recipient: OutgoingRecipient; items: number }[] = [];
  for (const c of clientes ?? []) {
    const id = c.id as string;
    const nombre = c.name as string;
    if (id === DEMO_CLIENT_ID) continue;
    const items = deCliente(id);
    if (!items.length) { salteados.push({ clientName: nombre, reason: "sin novedades ese mes" }); continue; }
    if (mandado.has(id)) { salteados.push({ clientName: nombre, reason: "ya se le mandó el resumen" }); continue; }
    const { recipients, skipped } = await getLessonRecipients(admin!, id);
    if (!recipients.length) { salteados.push({ clientName: nombre, reason: skipped[0]?.reason ?? "sin destinatario" }); continue; }
    const r = recipients[0]; // un aviso por cliente, al dueño
    envios.push({ clientId: id, clientName: nombre, recipient: render(r.email, r.greetingName, nombre, items), items: items.length });
  }

  if (!envios.length) return NextResponse.json({ prueba: false, periodo: period, periodo_label: rango.label, enviados: [], salteados });

  const ins = await admin!.from("update_digests").insert(
    envios.map((e) => ({ client_id: e.clientId, period, email: e.recipient.email, subject, items: e.items, status: "queued" })),
  );
  if (ins.error) return NextResponse.json({ error: "guardando el log: " + ins.error.message }, { status: 500 });

  const err = await dispatchToN8n({
    lesson_id: digestRef(period),
    lesson_title: `Resumen de ${rango.label}`,
    test: false,
    recipients: envios.map((e) => e.recipient),
  });
  if (err) {
    // el lote no salió: se borra el log para que el reintento del mes pueda mandarlo
    await admin!.from("update_digests").delete().eq("period", period).eq("status", "queued");
    return NextResponse.json({ error: err }, { status: 502 });
  }

  return NextResponse.json({
    prueba: false,
    periodo: period,
    periodo_label: rango.label,
    enviados: envios.map((e) => ({ clientName: e.clientName, count: e.items })),
    salteados,
  });
}
