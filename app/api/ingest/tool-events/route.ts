// Ingesta del uso de herramientas que reporta n8n.
//
// La memoria del agente guarda solo los turnos de texto, así que las tool calls
// no quedan en ninguna tabla (ver supabase/migrations/0014_tool_events.sql). n8n
// las manda acá, y este endpoint las guarda YA SANEADAS.
//
// Regla que no se negocia: los args crudos y la salida de la tool NO se persisten
// nunca. Se usan para derivar dos cosas — la consulta (solo en tools de búsqueda)
// y el resultado (ok / sin_resultado / error) — y se descartan. Tampoco se loguea
// el body: los logs de Vercel no son lugar para el pedido de un cliente.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONVERSION_TOOL_RE, ERR_RE, NO_RESULT_RE, PII_RE } from "@/lib/metrics/parse";

export const dynamic = "force-dynamic";

const MAX_EVENTOS = 200; // un turno de agente no llega ni cerca; corta un envío desbocado
const MAX_QUERY = 60;

interface EventoEntrante {
  client_id?: string;
  event_id?: string;
  ts?: string;
  session_id?: string;
  tool?: string;
  query?: string;
  outcome?: string;
  /** salida de la tool: se usa para derivar `outcome` y se tira. Nunca se guarda. */
  observation?: string;
}

/** Consulta publicable: corta, sin datos personales y solo de tools de búsqueda. */
function sanearQuery(tool: string, query: unknown): string | null {
  if (typeof query !== "string") return null;
  // Una tool de cierre (pedido, turno, reserva) lleva el detalle y el nombre del
  // cliente: eso no es "lo más consultado" y no entra ni saneado.
  if (CONVERSION_TOOL_RE.test(tool)) return null;
  const q = query.trim();
  if (!q || q.length > MAX_QUERY || PII_RE.test(q)) return null;
  return q;
}

/** ok | sin_resultado | error, derivado de lo que devolvió la tool. */
function derivarOutcome(e: EventoEntrante): string {
  const declarado = (e.outcome ?? "").trim().toLowerCase();
  if (declarado === "ok" || declarado === "sin_resultado" || declarado === "error") return declarado;
  const obs = typeof e.observation === "string" ? e.observation : "";
  if (!obs) return "ok";
  if (ERR_RE.test(obs)) return "error";
  if (NO_RESULT_RE.test(obs)) return "sin_resultado";
  return "ok";
}

export async function POST(req: NextRequest) {
  const secreto = process.env.INGEST_SECRET?.trim();
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }
  const entrantes: EventoEntrante[] = Array.isArray(body)
    ? (body as EventoEntrante[])
    : [body as EventoEntrante];
  if (!entrantes.length) return NextResponse.json({ ok: true, guardados: 0 });
  if (entrantes.length > MAX_EVENTOS) {
    return NextResponse.json({ error: `demasiados eventos (max ${MAX_EVENTOS})` }, { status: 413 });
  }

  const clientId = String(entrantes[0]?.client_id ?? "").trim();
  if (!clientId) return NextResponse.json({ error: "falta client_id" }, { status: 400 });
  if (entrantes.some((e) => String(e.client_id ?? "").trim() !== clientId)) {
    return NextResponse.json({ error: "todos los eventos tienen que ser del mismo cliente" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cliente } = await admin.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!cliente) return NextResponse.json({ error: "client_id desconocido" }, { status: 404 });

  const filas = [];
  const rechazados: string[] = [];
  for (const e of entrantes) {
    const tool = String(e.tool ?? "").trim();
    const eventId = String(e.event_id ?? "").trim();
    if (!tool || !eventId) {
      rechazados.push(eventId || "(sin event_id)");
      continue;
    }
    const ts = e.ts ? new Date(e.ts) : new Date();
    filas.push({
      client_id: clientId,
      event_id: eventId.slice(0, 120),
      ts: (Number.isNaN(ts.getTime()) ? new Date() : ts).toISOString(),
      session_id: String(e.session_id ?? "").trim().slice(0, 120),
      tool: tool.slice(0, 80),
      query: sanearQuery(tool, e.query),
      outcome: derivarOutcome(e),
    });
  }

  if (filas.length) {
    // (client_id, event_id) es la PK: un reintento de n8n pisa la misma fila.
    const { error } = await admin.from("tool_events").upsert(filas, { onConflict: "client_id,event_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, guardados: filas.length, rechazados: rechazados.length });
}
