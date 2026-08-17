// Editar (PATCH) y eliminar (DELETE) una lección. Solo admins.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { isLessonTopic } from "@/lib/lessonTopics";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const b = (await req.json()) as {
    title?: string;
    summary?: string;
    why?: string;
    topic?: string;
    starter_order?: string | number | null;
  };
  const patch: Record<string, string | number | null> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.summary === "string") patch.summary = b.summary.trim() || null;
  if (typeof b.why === "string") patch.why = b.why.trim() || null;
  if (typeof b.topic === "string") {
    const t = b.topic.trim();
    if (t && !isLessonTopic(t)) return new NextResponse("categoría desconocida", { status: 400 });
    patch.topic = t || null;
  }
  if (b.starter_order !== undefined) {
    const raw = String(b.starter_order ?? "").trim();
    const n = raw ? Number(raw) : null;
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 99)) {
      return new NextResponse("el orden de la ruta tiene que ser un número del 1 al 99", { status: 400 });
    }
    patch.starter_order = n;
  }
  if (!Object.keys(patch).length) return new NextResponse("nada para actualizar", { status: 400 });
  const { error: e } = await admin!.from("lessons").update(patch).eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  // si el archivo vive en Storage, lo borramos también
  const { data: lesson } = await admin!.from("lessons").select("url").eq("id", id).maybeSingle();
  if (lesson?.url && lesson.url.includes("/lessons/")) {
    const path = lesson.url.split("/lessons/")[1]?.split("?")[0];
    if (path) await admin!.storage.from("lessons").remove([path]);
  }
  const { error: e } = await admin!.from("lessons").delete().eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
