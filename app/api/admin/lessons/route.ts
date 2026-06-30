// Publica una lección (solo admins). Sube el archivo a Storage si vino uno, o usa el link.
// Verifica el rol con la sesión del usuario y escribe con service role.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. quién llama
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse("no autenticado", { status: 401 });

  // 2. ¿es admin?
  const admin = createAdminClient();
  const { data: uc } = await admin.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  if (uc?.role !== "admin") return new NextResponse("requiere rol admin", { status: 403 });

  // 3. datos del form
  const fd = await req.formData();
  const title = String(fd.get("title") ?? "").trim();
  const summary = String(fd.get("summary") ?? "").trim() || null;
  const global = fd.get("global") != null;
  const clientId = global ? null : null; // (targeting por cliente: a futuro)
  if (!title) return new NextResponse("falta el título", { status: 400 });

  let url = String(fd.get("url") ?? "").trim() || null;

  // 4. archivo -> Storage
  const file = fd.get("file");
  if (file && file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const up = await admin.storage.from("lessons").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) return new NextResponse("subiendo archivo: " + up.error.message, { status: 500 });
    url = admin.storage.from("lessons").getPublicUrl(path).data.publicUrl;
  }

  if (!url) return new NextResponse("falta archivo o link", { status: 400 });

  // 5. insertar
  const ins = await admin.from("lessons").insert({ title, summary, url, client_id: clientId });
  if (ins.error) return new NextResponse("guardando: " + ins.error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}
