// Editar el contacto del DUEÑO de un cliente (nombre + mail personal).
// Es lo que usa la campaña de avisos de lecciones; no toca la cuenta del portal
// (esa se creó con el mail de la empresa y sigue igual).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const b = (await req.json()) as {
    contact_name?: string;
    contact_email?: string;
    notify_lessons?: boolean;
  };

  const patch: Record<string, string | boolean | null> = {};
  if (typeof b.contact_name === "string") patch.contact_name = b.contact_name.trim() || null;
  if (typeof b.contact_email === "string") {
    const mail = b.contact_email.trim().toLowerCase();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return new NextResponse("el mail del dueño no parece válido", { status: 400 });
    }
    patch.contact_email = mail || null;
  }
  if (typeof b.notify_lessons === "boolean") patch.notify_lessons = b.notify_lessons;

  if (!Object.keys(patch).length) return new NextResponse("nada para actualizar", { status: 400 });

  const { error: e } = await admin!.from("clients").update(patch).eq("id", id);
  if (e) return new NextResponse(e.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
