// Cómputo de métricas de un cliente, reutilizable por el cron y por el alta desde Admin.
import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { computeDaily } from "./compute";
import type { RawRow } from "./parse";

export interface SourceDescriptor {
  client_id: string;
  supabase_url: string;
  table_name: string;
  utc_offset: number;
  key: string;
  /** Última sincronización OK (ISO). Si viene, el cómputo es incremental. */
  last_synced_at?: string | null;
}

// Key de lectura de la fuente. Todas las tablas en un mismo proyecto => key compartida
// (SOURCE_DEFAULT_KEY). Se mantiene el fallback por-cliente (SOURCE_KEY_<id>) por compatibilidad.
export function resolveSourceKey(clientId: string): string | null {
  const perClient = process.env[`SOURCE_KEY_${clientId.replace(/-/g, "_").toUpperCase()}`];
  return (perClient || process.env.SOURCE_DEFAULT_KEY || "").trim() || null;
}

const PAGE = 1000; // PostgREST corta en 1000 filas por default: SIEMPRE paginar.
const MARGIN_MS = 48 * 3600 * 1000; // margen para filas tardías al recomputar incremental

/**
 * Corte incremental: arranque (UTC, ISO) del día LOCAL que contiene
 * `last_synced_at - margen`. Así los días recomputados se releen COMPLETOS
 * (el upsert por (client_id, date) pisa el día entero).
 */
function incrementalSinceIso(lastSyncedAt: string, utcOffsetHours: number): string | null {
  const last = Date.parse(lastSyncedAt);
  if (Number.isNaN(last)) return null;
  const off = utcOffsetHours * 3600 * 1000;
  const cutoff = last - MARGIN_MS;
  const localDayStart = Math.floor((cutoff + off) / 86400000) * 86400000 - off;
  return new Date(localDayStart).toISOString();
}

/**
 * Lee la tabla fuente paginando (sin esto, PostgREST devuelve solo 1000 filas y
 * las métricas quedan mal en silencio). Si `sinceIso` viene, filtra por fecha;
 * si la fuente no tiene esa columna (esquema distinto), cae a lectura completa.
 */
async function fetchRows(
  client: SupabaseClient,
  table: string,
  sinceIso: string | null,
): Promise<RawRow[]> {
  const readPage = async (from: number, withSince: boolean, orderCol: string | null) => {
    let q = client.from(table).select("*").range(from, from + PAGE - 1);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    if (withSince && sinceIso) q = q.gte("fecha", sinceIso);
    return q;
  };

  let withSince = Boolean(sinceIso);
  let orderCol: string | null = "id";
  const rows: RawRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let { data, error } = await readPage(from, withSince, orderCol);
    // columna inexistente (42703): probar sin filtro incremental y/o sin orden
    if (error && withSince) {
      withSince = false;
      ({ data, error } = await readPage(from, withSince, orderCol));
    }
    if (error && orderCol === "id") {
      orderCol = "fecha";
      ({ data, error } = await readPage(from, withSince, orderCol));
    }
    if (error) throw new Error(`leyendo ${table}: ${error.message}`);
    rows.push(...((data ?? []) as RawRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function computeClient(admin: SupabaseClient, src: SourceDescriptor) {
  const client = createSupabase(src.supabase_url, src.key, { auth: { persistSession: false } });
  const sinceIso = src.last_synced_at ? incrementalSinceIso(src.last_synced_at, src.utc_offset) : null;
  const rows = await fetchRows(client, src.table_name, sinceIso);

  const out = computeDaily(rows, src.utc_offset);
  const withId = <T,>(arr: T[]) => arr.map((r) => ({ ...r, client_id: src.client_id }));

  await Promise.all([
    admin.from("metrics_daily").upsert(withId(out.metricsDaily), { onConflict: "client_id,date" }),
    admin.from("tool_usage_daily").upsert(withId(out.toolUsage), { onConflict: "client_id,date,tool" }),
    admin.from("tool_queries_daily").upsert(withId(out.toolQueries), { onConflict: "client_id,date,query" }),
    admin.from("activity_hourly").upsert(withId(out.activityHourly), { onConflict: "client_id,date,hour" }),
    admin.from("intent_daily").upsert(withId(out.intentDaily), { onConflict: "client_id,date,intent" }),
  ]);
  await admin.from("client_sources").update({ last_synced_at: new Date().toISOString() }).eq("client_id", src.client_id);

  return { days: out.metricsDaily.length, rows: rows.length, incremental: Boolean(sinceIso) };
}
