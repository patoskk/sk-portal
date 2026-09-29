// Publicar novedades de un cliente sin sesión de admin. Lo llama `publicar-novedad.mjs` del probador,
// cuando una tanda ya está pegada y verificada en producción y Pato dijo que sí.
//
// Una llamada = los items de UNA tanda (uno por tipo: nuevo, mejora, arreglo). La fecha es la del día en
// que el cambio empezó a andar, no la de hoy. Con `prueba`, van al panel de demostración.
//
// Idempotente: si ese cliente ya tiene una novedad con el mismo título y la misma fecha, no la duplica.
import { NextResponse, type NextRequest } from "next/server";
import { requireAutomation, DEMO_CLIENT_ID } from "@/lib/api/requireAutomation";
import { isUpdateKind } from "@/lib/updateKinds";

export const runtime = "nodejs";

interface Item {
  kind?: string;
  title?: string;
  body?: string;
}

const MAX_TITULO = 110;
const MAX_CUERPO = 1500;

export async function POST(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const b = (await req.json()) as { client_id?: string; published_at?: string; items?: Item[]; prueba?: boolean };
  const prueba = b.prueba === true;
  const clientId = prueba ? DEMO_CLIENT_ID : (b.client_id ?? "").trim();
  const fecha = (b.published_at ?? "").trim() || new Date().toISOString().slice(0, 10);
  const items = Array.isArray(b.items) ? b.items : [];

  if (!clientId) return NextResponse.json({ error: "falta client_id" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: "published_at tiene que ser YYYY-MM-DD" }, { status: 400 });
  if (!items.length) return NextResponse.json({ error: "no hay novedades" }, { status: 400 });

  const { data: cli } = await admin!.from("clients").select("id,name").eq("id", clientId).maybeSingle();
  if (!cli) return NextResponse.json({ error: "ese cliente no existe en el portal" }, { status: 404 });

  const filas = [];
  for (const [i, it] of items.entries()) {
    const kind = (it.kind ?? "").trim();
    const title = (it.title ?? "").trim();
    const body = (it.body ?? "").trim() || null;
    if (!isUpdateKind(kind)) return NextResponse.json({ error: `item ${i + 1}: tipo inválido "${kind}"` }, { status: 400 });
    if (!title || title.length > MAX_TITULO) return NextResponse.json({ error: `item ${i + 1}: el título falta o pasa de ${MAX_TITULO} caracteres` }, { status: 400 });
    if (body && body.length > MAX_CUERPO) return NextResponse.json({ error: `item ${i + 1}: el texto pasa de ${MAX_CUERPO} caracteres` }, { status: 400 });
    filas.push({ client_id: clientId, kind, title, body, published_at: fecha });
  }

  const { data: yaEstan } = await admin!
    .from("updates")
    .select("id,title")
    .eq("client_id", clientId)
    .eq("published_at", fecha);
  const existentes = new Map((yaEstan ?? []).map((u) => [u.title as string, u.id as string]));
  const nuevas = filas.filter((f) => !existentes.has(f.title));

  let ids: string[] = [];
  if (nuevas.length) {
    const ins = await admin!.from("updates").insert(nuevas).select("id");
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    ids = (ins.data ?? []).map((r) => r.id as string);
  }

  return NextResponse.json({
    ok: true,
    cliente: cli.name,
    publicadas: ids,
    ya_estaban: filas.filter((f) => existentes.has(f.title)).map((f) => existentes.get(f.title)),
    prueba,
  });
}
