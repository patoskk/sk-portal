// Envío del aviso de una lección. Paso explícito: solo corre cuando Pato aprieta
// el botón, con el copy que ya revisó.
//
//  test:true  -> un solo mail, al admin logueado. No toca el log ni notified_at.
//  force:true -> reenvío: borra el log de esa lección y vuelve a encolar a todos.
//
// Idempotencia: unique(lesson_id, email) en lesson_notifications. Sin force, a
// quien ya se le avisó no se le manda de nuevo (aparece en `skipped`).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { renderLessonEmail } from "@/lib/notify/lessonEmail";
import { getLessonRecipients, type Recipient } from "@/lib/notify/recipients";
import { estimateMinutes } from "@/lib/data/lessons";
import { dispatchToN8n, lessonUrl, fromName, type OutgoingRecipient } from "@/lib/notify/send";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  subject?: string;
  intro?: string;
  summary?: string;
  why?: string[];
  test?: boolean;
  force?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const b = (await req.json()) as Body;
  const subject = (b.subject ?? "").trim();
  const intro = (b.intro ?? "").trim();
  const summary = (b.summary ?? "").trim();
  const why = (b.why ?? []).map((w) => w.trim()).filter(Boolean);
  const isTest = b.test === true;
  if (!subject) return new NextResponse("falta el asunto", { status: 400 });
  if (!intro) return new NextResponse("falta el aviso", { status: 400 });

  const { data: lesson } = await admin!
    .from("lessons")
    .select("title,body,client_id")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) return new NextResponse("lección no encontrada", { status: 404 });

  const readMinutes = estimateMinutes(lesson.body as string | null);
  const url = lessonUrl(id);
  const from = fromName();

  // el copy revisado queda guardado en la lección: el resumen y el "por qué"
  // también se muestran en /lecciones
  if (!isTest) {
    await admin!
      .from("lessons")
      .update({ summary: summary || null, why: why.join("\n") || null })
      .eq("id", id);
  }

  const { recipients: all, skipped } = await getLessonRecipients(admin!, lesson.client_id as string | null);

  // ---------- prueba: un solo mail, al admin ----------
  if (isTest) {
    if (!user!.email) return new NextResponse("tu usuario no tiene mail", { status: 400 });
    // saludo del primer destinatario real, para que la prueba sea fiel
    const item = render({
      email: user!.email,
      greetingName: all[0]?.greetingName ?? "Pato",
      clientName: all[0]?.clientName ?? "tu negocio",
    });
    const err = await dispatchToN8n({
      lesson_id: id,
      lesson_title: lesson.title as string,
      test: true,
      recipients: [item],
    });
    if (err) return new NextResponse(err, { status: 502 });
    return NextResponse.json({ queued: 1, test: true, to: user!.email, skipped: [] });
  }

  // ---------- envío real ----------
  if (b.force === true) {
    await admin!.from("lesson_notifications").delete().eq("lesson_id", id);
  }

  const { data: logged } = await admin!
    .from("lesson_notifications")
    .select("email")
    .eq("lesson_id", id);
  const yaAvisado = new Set((logged ?? []).map((r) => (r.email as string).toLowerCase()));

  const toSend = all.filter((r) => !yaAvisado.has(r.email.toLowerCase()));
  const skippedOut = [
    ...skipped,
    ...all
      .filter((r) => yaAvisado.has(r.email.toLowerCase()))
      .map((r) => ({ clientName: r.clientName, reason: "ya se le avisó" })),
  ];

  if (!toSend.length) {
    return NextResponse.json({ queued: 0, skipped: skippedOut });
  }

  const rows = toSend.map((r) => ({
    lesson_id: id,
    client_id: r.clientId,
    email: r.email,
    subject,
    status: "queued",
  }));
  const ins = await admin!.from("lesson_notifications").insert(rows);
  if (ins.error) return new NextResponse("guardando el log: " + ins.error.message, { status: 500 });

  const err = await dispatchToN8n({
    lesson_id: id,
    lesson_title: lesson.title as string,
    test: false,
    recipients: toSend.map(render),
  });
  if (err) {
    // el lote no salió: dejamos el log en error para que se vea en el panel y
    // el reintento no quede bloqueado por el unique
    await admin!
      .from("lesson_notifications")
      .update({ status: "error", error: err })
      .eq("lesson_id", id)
      .eq("status", "queued");
    return new NextResponse(err, { status: 502 });
  }

  await admin!.from("lessons").update({ notified_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ queued: toSend.length, skipped: skippedOut });

  function render(r: Pick<Recipient, "email" | "greetingName" | "clientName">): OutgoingRecipient {
    const { html, text } = renderLessonEmail({
      greetingName: r.greetingName,
      title: lesson!.title as string,
      intro,
      summary,
      why,
      readMinutes,
      lessonUrl: url,
      fromName: from,
    });
    return { email: r.email, client_name: r.clientName, subject, html, text };
  }
}
