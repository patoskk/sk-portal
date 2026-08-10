// Editar (PATCH) y eliminar (DELETE) una novedad. Solo admins.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { isUpdateKind } from "@/lib/updateKinds";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const b = (await req.json()) as { title?: string; body?: string; kind?: string };
  const patch: Record<string, string | null> = {};
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.body === "string") patch.body = b.body.trim() || null;
  if (typeof b.kind === "string") {
    if (!isUpdateKind(b.kind)) return new NextResponse("tipo inválido", { status: 400 });
    patch.kind = b.kind;
  }
  if (!Object.keys(patch).length) return new NextResponse("nada para actualizar", { status: 400 });
  const { error: e } = await admin!.from("updates").update(patch).eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const { error: e } = await admin!.from("updates").delete().eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
