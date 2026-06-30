// Editar (PATCH) y eliminar (DELETE) una lección. Solo admins.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: new NextResponse("no autenticado", { status: 401 }) };
  const admin = createAdminClient();
  const { data: uc } = await admin.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  if (uc?.role !== "admin") return { error: new NextResponse("requiere rol admin", { status: 403 }) };
  return { admin };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const b = (await req.json()) as { title?: string; summary?: string };
  const patch: Record<string, string | null> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.summary === "string") patch.summary = b.summary.trim() || null;
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
