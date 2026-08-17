// Publica una lección (solo admins). Sube el archivo a Storage si vino uno, o usa el link.
// Verifica el rol con la sesión del usuario y escribe con service role.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { isLessonTopic } from "@/lib/lessonTopics";

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

  // la categoría se valida contra la lista canónica (la columna es texto libre):
  // un valor raro dejaría un chip fantasma en /lecciones
  const rawTopic = String(fd.get("topic") ?? "").trim();
  if (rawTopic && !isLessonTopic(rawTopic)) return new NextResponse("categoría desconocida", { status: 400 });
  const topic = rawTopic || null;

  const rawStarter = String(fd.get("starter_order") ?? "").trim();
  const starterOrder = rawStarter ? Number(rawStarter) : null;
  if (starterOrder !== null && (!Number.isInteger(starterOrder) || starterOrder < 1 || starterOrder > 99)) {
    return new NextResponse("el orden de la ruta tiene que ser un número del 1 al 99", { status: 400 });
  }

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
  const ins = await admin
    .from("lessons")
    .insert({ title, summary, url, body, client_id: clientId, topic, starter_order: starterOrder })
    .select("id")
    .single();
  if (ins.error) return new NextResponse("guardando: " + ins.error.message, { status: 500 });

  return NextResponse.json({ ok: true, id: ins.data.id });
}
