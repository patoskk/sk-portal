// Vista previa del mail: el MISMO render que usa el envío, así lo que se ve en
// el iframe de /admin es exactamente lo que le llega al cliente.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { renderLessonEmail } from "@/lib/notify/lessonEmail";
import { getLessonRecipients } from "@/lib/notify/recipients";
import { estimateMinutes } from "@/lib/data/lessons";
import { lessonUrl, fromName } from "@/lib/notify/send";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const b = (await req.json()) as { intro?: string; summary?: string; why?: string[] };

  const { data: lesson } = await admin!
    .from("lessons")
    .select("title,body,client_id")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) return new NextResponse("lección no encontrada", { status: 404 });

  // el saludo del primer destinatario real, para que el preview sea fiel
  const { recipients, skipped } = await getLessonRecipients(admin!, lesson.client_id as string | null);

  const { html } = renderLessonEmail({
    greetingName: recipients[0]?.greetingName ?? "Fernando",
    title: lesson.title as string,
    intro: b.intro ?? "",
    summary: b.summary ?? "",
    why: b.why ?? [],
    readMinutes: estimateMinutes(lesson.body as string | null),
    lessonUrl: lessonUrl(id),
    fromName: fromName(),
  });

  // los salteados viajan al panel: casi siempre es "falta el mail del dueño",
  // que es accionable desde la sección Clientes
  return NextResponse.json({ html, recipients: recipients.length, skipped });
}
