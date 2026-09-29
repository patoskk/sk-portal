// El estado de la semana de la lección, que escribe n8n:
//   ofrecida -> el lunes se mandaron los temas (offered = sus ids)
//   elegida  -> Pato tocó uno
//   salteada -> tocó "Esta semana no"
// En prueba no se toca nada: una prueba no puede cambiar lo que pasa el lunes de verdad.
import { NextResponse, type NextRequest } from "next/server";
import { requireAutomation } from "@/lib/api/requireAutomation";
import { weekStartAR } from "@/lib/automation/week";

export const runtime = "nodejs";

const ESTADOS = ["ofrecida", "elegida", "salteada"];

export async function POST(req: NextRequest) {
  const { admin, error } = requireAutomation(req);
  if (error) return error;

  const b = (await req.json()) as { status?: string; offered?: unknown; prueba?: boolean };
  if (b.prueba === true) return NextResponse.json({ ok: true, ignorado: "prueba" });
  if (!b.status || !ESTADOS.includes(b.status)) return NextResponse.json({ error: "estado inválido" }, { status: 400 });

  const fila: Record<string, unknown> = { week_start: weekStartAR(), status: b.status, updated_at: new Date().toISOString() };
  // solo se pisa lo que vino: marcar "elegida" no borra los temas que se habían ofrecido
  if (Array.isArray(b.offered)) fila.offered = b.offered.filter((x) => typeof x === "string").slice(0, 10);

  const { error: e } = await admin!.from("lesson_weeks").upsert(fila);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, week_start: fila.week_start });
}
