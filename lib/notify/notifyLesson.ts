// El envío del aviso de una lección. Lo usan el botón "Avisar" de /admin y la lección automática de los
// lunes (/api/automation/lessons/[id]/notify): el mismo código, así los dos mandan el mismo mail.
//
//  testTo  -> un solo mail, a esa dirección. No toca el log ni notified_at.
//  force   -> reenvío: borra el log de esa lección y vuelve a encolar a todos.
//
// Idempotencia: unique(lesson_id, email) en lesson_notifications. Sin force, a quien ya se le avisó no
// se le manda de nuevo (aparece en `skipped`).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderLessonEmail } from "@/lib/notify/lessonEmail";
import { getLessonRecipients, type Recipient } from "@/lib/notify/recipients";
import { estimateMinutes } from "@/lib/data/lessons";
import { dispatchToN8n, lessonUrl, fromName, type OutgoingRecipient } from "@/lib/notify/send";

export interface NoticeCopy {
  subject: string;
  intro: string;
  summary: string;
  why: string[];
}

export type NoticeResult =
  | {
      ok: true;
      queued: number;
      test?: true;
      to?: string;
      skipped: { clientName: string; reason: string }[];
      recipients: { clientName: string; greetingName: string }[];
    }
  | { ok: false; status: number; message: string };

export async function sendLessonNotice(
  admin: SupabaseClient,
  lessonId: string,
  copy: NoticeCopy,
  opts: { force?: boolean; testTo?: string | null } = {},
): Promise<NoticeResult> {
  const subject = copy.subject.trim();
  const intro = copy.intro.trim();
  const summary = copy.summary.trim();
  const why = copy.why.map((w) => w.trim()).filter(Boolean);
  const isTest = Boolean(opts.testTo);
  if (!subject) return { ok: false, status: 400, message: "falta el asunto" };
  if (!intro) return { ok: false, status: 400, message: "falta el aviso" };

  const { data: lesson } = await admin
    .from("lessons")
    .select("title,body,client_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return { ok: false, status: 404, message: "lección no encontrada" };

  const readMinutes = estimateMinutes(lesson.body as string | null);
  const url = lessonUrl(lessonId);
  const from = fromName();

  const render = (r: Pick<Recipient, "email" | "greetingName" | "clientName">): OutgoingRecipient => {
    const { html, text } = renderLessonEmail({
      greetingName: r.greetingName,
      title: lesson.title as string,
      intro,
      summary,
      why,
      readMinutes,
      lessonUrl: url,
      fromName: from,
    });
    return { email: r.email, client_name: r.clientName, subject, html, text };
  };

  // el copy revisado queda guardado en la lección: el resumen y el "por qué"
  // también se muestran en /lecciones
  if (!isTest) {
    await admin
      .from("lessons")
      .update({ summary: summary || null, why: why.join("\n") || null })
      .eq("id", lessonId);
  }

  const { recipients: all, skipped } = await getLessonRecipients(admin, lesson.client_id as string | null);

  // ---------- prueba: un solo mail ----------
  if (isTest) {
    // saludo del primer destinatario real, para que la prueba sea fiel
    const item = render({
      email: opts.testTo!,
      greetingName: all[0]?.greetingName ?? "Pato",
      clientName: all[0]?.clientName ?? "tu negocio",
    });
    const err = await dispatchToN8n({
      lesson_id: lessonId,
      lesson_title: lesson.title as string,
      test: true,
      recipients: [item],
    });
    if (err) return { ok: false, status: 502, message: err };
    return { ok: true, queued: 1, test: true, to: opts.testTo!, skipped: [], recipients: [] };
  }

  // ---------- envío real ----------
  if (opts.force === true) {
    await admin.from("lesson_notifications").delete().eq("lesson_id", lessonId);
  }

  const { data: logged } = await admin.from("lesson_notifications").select("email").eq("lesson_id", lessonId);
  const yaAvisado = new Set((logged ?? []).map((r) => (r.email as string).toLowerCase()));

  const toSend = all.filter((r) => !yaAvisado.has(r.email.toLowerCase()));
  const skippedOut = [
    ...skipped,
    ...all
      .filter((r) => yaAvisado.has(r.email.toLowerCase()))
      .map((r) => ({ clientName: r.clientName, reason: "ya se le avisó" })),
  ];

  if (!toSend.length) return { ok: true, queued: 0, skipped: skippedOut, recipients: [] };

  const rows = toSend.map((r) => ({
    lesson_id: lessonId,
    client_id: r.clientId,
    email: r.email,
    subject,
    status: "queued",
  }));
  const ins = await admin.from("lesson_notifications").insert(rows);
  if (ins.error) return { ok: false, status: 500, message: "guardando el log: " + ins.error.message };

  const err = await dispatchToN8n({
    lesson_id: lessonId,
    lesson_title: lesson.title as string,
    test: false,
    recipients: toSend.map(render),
  });
  if (err) {
    // el lote no salió: dejamos el log en error para que se vea en el panel y
    // el reintento no quede bloqueado por el unique
    await admin
      .from("lesson_notifications")
      .update({ status: "error", error: err })
      .eq("lesson_id", lessonId)
      .eq("status", "queued");
    return { ok: false, status: 502, message: err };
  }

  await admin.from("lessons").update({ notified_at: new Date().toISOString() }).eq("id", lessonId);
  return {
    ok: true,
    queued: toSend.length,
    skipped: skippedOut,
    recipients: toSend.map((r) => ({ clientName: r.clientName, greetingName: r.greetingName })),
  };
}
