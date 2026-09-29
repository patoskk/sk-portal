// El aviso por mail de la lección automática: Claude redacta el copy (el mismo borrador que ve Pato en
// /admin) y sale sin revisión humana, por decisión de Pato del 28/09. Mismo envío que el botón "Avisar"
// (lib/notify/notifyLesson.ts): un mail por dueño, sin tracking, de a uno.
//
// Con `prueba`, un solo mail al admin del portal y nada más.
import { NextResponse, type NextRequest } from "next/server";
import { requireAutomation, testRecipient } from "@/lib/api/requireAutomation";
import { draftLessonEmail } from "@/lib/notify/draft";
import { defaultSubject } from "@/lib/notify/lessonEmail";
import { sendLessonNotice } from "@/lib/notify/notifyLesson";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { prueba?: boolean };
  const prueba = b.prueba === true;

  const { data: lesson } = await admin!.from("lessons").select("title,summary,body,url").eq("id", id).maybeSingle();
  if (!lesson) return NextResponse.json({ error: "lección no encontrada" }, { status: 404 });

  let draft;
  try {
    draft = await draftLessonEmail({
      title: lesson.title as string,
      summary: lesson.summary as string | null,
      body: lesson.body as string | null,
      url: lesson.url as string | null,
    });
  } catch (e) {
    return NextResponse.json({ error: "redactando el mail: " + (e instanceof Error ? e.message : String(e)) }, { status: 502 });
  }
  // si el modelo devolvió un asunto vacío o gigante, cae al patrón por default
  if (!draft.subject || draft.subject.length > 78) draft.subject = defaultSubject(lesson.title as string);

  let testTo: string | null = null;
  if (prueba) {
    testTo = await testRecipient(admin!);
    if (!testTo) return NextResponse.json({ error: "no encuentro el mail del admin para la prueba" }, { status: 500 });
  }

  const r = await sendLessonNotice(admin!, id, draft, { testTo });
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status });

  return NextResponse.json({
    queued: r.queued,
    recipients: r.recipients,
    skipped: r.skipped,
    subject: draft.subject,
    prueba,
    test_to: r.test ? r.to : null,
  });
}
