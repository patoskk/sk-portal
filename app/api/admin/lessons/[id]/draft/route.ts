// Borrador del mail de aviso escrito por Claude. Devuelve texto EDITABLE:
// no manda nada. El envío es un paso aparte y explícito (/notify).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { draftLessonEmail } from "@/lib/notify/draft";
import { defaultSubject } from "@/lib/notify/lessonEmail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const { data: lesson } = await admin!
    .from("lessons")
    .select("title,summary,body,url")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) return new NextResponse("lección no encontrada", { status: 404 });

  try {
    const draft = await draftLessonEmail({
      title: lesson.title as string,
      summary: lesson.summary as string | null,
      body: lesson.body as string | null,
      url: lesson.url as string | null,
    });
    // si el modelo devolvió un asunto vacío o gigante, cae al patrón por default
    if (!draft.subject || draft.subject.length > 78) draft.subject = defaultSubject(lesson.title as string);
    return NextResponse.json(draft);
  } catch (e) {
    return new NextResponse("redactando: " + (e instanceof Error ? e.message : String(e)), { status: 500 });
  }
}
