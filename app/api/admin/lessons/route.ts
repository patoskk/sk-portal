// Publica una lección (solo admins). Sube el archivo a Storage si vino uno, o usa el link.
// Verifica el rol con la sesión del usuario y escribe con service role.
// La validación y el insert viven en lib/lessons/createLesson.ts (los comparte la lección automática).
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { insertLesson, parseStarterOrder, parseTopic } from "@/lib/lessons/createLesson";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1-2. quién llama y si es admin
  const { admin: adminOrNull, error: gate } = await requireAdmin();
  if (gate) return gate;
  const admin = adminOrNull!;

  // 3. datos del form
  const fd = await req.formData();
  const title = String(fd.get("title") ?? "").trim();
  const summary = String(fd.get("summary") ?? "").trim() || null;
  const clientId = null; // targeting por cliente: a futuro — hoy toda lección es global
  if (!title) return new NextResponse("falta el título", { status: 400 });

  const t = parseTopic(String(fd.get("topic") ?? ""));
  if ("error" in t) return new NextResponse(t.error, { status: 400 });
  const so = parseStarterOrder(String(fd.get("starter_order") ?? ""));
  if ("error" in so) return new NextResponse(so.error, { status: 400 });

  let url = String(fd.get("url") ?? "").trim() || null;
  let body: string | null = null;

  // 4. archivo: HTML -> lo guardamos como texto y lo servimos desde la app
  //    (Storage fuerza text/plain en HTML). PDF -> Storage (renderiza bien).
  const file = fd.get("file");
  if (file && file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    if (ext === "html" || ext === "htm") {
      body = await file.text();
    } else {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const up = await admin.storage.from("lessons").upload(path, buf, {
        contentType: ext === "pdf" ? "application/pdf" : file.type || "application/octet-stream",
        upsert: false,
      });
      if (up.error) return new NextResponse("subiendo archivo: " + up.error.message, { status: 500 });
      url = admin.storage.from("lessons").getPublicUrl(path).data.publicUrl;
    }
  }

  if (!url && !body) return new NextResponse("falta archivo o link", { status: 400 });

  // 5. insertar (devolvemos el id: el front sigue con el aviso por mail)
  const ins = await insertLesson(admin, {
    title,
    summary,
    url,
    body,
    client_id: clientId,
    topic: t.topic,
    starter_order: so.starterOrder,
  });
  if ("error" in ins) return new NextResponse(ins.error, { status: 500 });

  return NextResponse.json({ ok: true, id: ins.id });
}
