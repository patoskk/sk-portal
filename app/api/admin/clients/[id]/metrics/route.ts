// Borrado de métricas por fecha de corte: cierra el período de prueba/garantía y
// deja el panel del cliente limpio para producción, sin mezclar los dos.
//   DELETE /api/admin/clients/<id>/metrics?before=YYYY-MM-DD
//
// Borra todo lo ANTERIOR a `before` (ese día ya cuenta como producción) y sube el
// piso `clients.metrics_from`. El piso es la parte que importa: sin él, la próxima
// vez que se fuerce un recómputo completo el período borrado vuelve entero desde la
// tabla de conversaciones, que nunca se toca. Ver lib/metrics/runCompute.ts.
//
// NO toca lecciones, novedades ni el contacto del dueño: eso no es métrica.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { DAILY_TABLES, isIsoDate, localMidnightIso } from "@/lib/data/clientData";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const before = req.nextUrl.searchParams.get("before");
  if (!isIsoDate(before)) return new NextResponse("falta la fecha de corte (YYYY-MM-DD)", { status: 400 });

  const { data: client } = await admin!
    .from("clients")
    .select("name,utc_offset,metrics_from")
    .eq("id", id)
    .maybeSingle();
  if (!client) return new NextResponse("cliente no encontrado", { status: 404 });
  const c = client as { name: string; utc_offset: number | null; metrics_from: string | null };

  const borradas: Record<string, number> = {};
  for (const t of DAILY_TABLES) {
    const { count, error: e } = await admin!
      .from(t)
      .delete({ count: "exact" })
      .eq("client_id", id)
      .lt("date", before);
    // product_queries_daily puede no tener filas nunca; un error de tabla ausente
    // no debería frenar el resto del borrado, pero sí quedar visible en la respuesta.
    if (e) return new NextResponse(`borrando ${t}: ${e.message}`, { status: 500 });
    borradas[t] = count ?? 0;
  }

  // tool_events se guarda en UTC: el corte es la medianoche LOCAL del cliente
  const utc = Number(c.utc_offset ?? -3);
  const ev = await admin!
    .from("tool_events")
    .delete({ count: "exact" })
    .eq("client_id", id)
    .lt("ts", localMidnightIso(before, utc));
  if (ev.error) return new NextResponse(`borrando tool_events: ${ev.error.message}`, { status: 500 });
  borradas.tool_events = ev.count ?? 0;

  // los insights que arrancan antes del corte hablan de días que ya no existen
  const ins = await admin!
    .from("insights")
    .delete({ count: "exact" })
    .eq("client_id", id)
    .lt("period_start", before);
  if (ins.error) return new NextResponse(`borrando insights: ${ins.error.message}`, { status: 500 });
  borradas.insights = ins.count ?? 0;

  // el piso solo avanza: bajarlo dejaría volver un período que ya se dio por cerrado
  const piso = c.metrics_from && c.metrics_from > before ? c.metrics_from : before;
  const upd = await admin!.from("clients").update({ metrics_from: piso }).eq("id", id);
  if (upd.error) return new NextResponse(`guardando el piso: ${upd.error.message}`, { status: 500 });

  const total = Object.values(borradas).reduce((s, n) => s + n, 0);
  return NextResponse.json({ ok: true, before, metrics_from: piso, total, borradas });
}
