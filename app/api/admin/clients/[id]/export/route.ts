// Respaldo de un cliente: el archivo que se baja ANTES de cualquier borrado.
// También sirve de preview — el panel muestra sus `counts` y sus `users` para que
// el admin vea qué se va a llevar puesto antes de confirmar.
//   GET /api/admin/clients/<id>/export            → todo
//   GET /api/admin/clients/<id>/export?before=YYYY-MM-DD → solo lo anterior a esa fecha
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { dumpClient, isIsoDate } from "@/lib/data/clientData";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const raw = req.nextUrl.searchParams.get("before");
  if (raw && !isIsoDate(raw)) return new NextResponse("fecha de corte inválida (YYYY-MM-DD)", { status: 400 });
  const before = raw || null;

  const { data: client } = await admin!.from("clients").select("name").eq("id", id).maybeSingle();
  if (!client) return new NextResponse("cliente no encontrado", { status: 404 });

  const dump = await dumpClient(admin!, id, before);

  // nombre del archivo: cliente + corte, para que dos respaldos no se pisen en Descargas
  const slug = String((client as { name: string }).name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const nombre = `respaldo-${slug}-${before ?? "todo"}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${nombre}"`,
    },
  });
}
