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
}

// Key de lectura de la fuente. Todas las tablas en un mismo proyecto => key compartida
// (SOURCE_DEFAULT_KEY). Se mantiene el fallback por-cliente (SOURCE_KEY_<id>) por compatibilidad.
export function resolveSourceKey(clientId: string): string | null {
  const perClient = process.env[`SOURCE_KEY_${clientId.replace(/-/g, "_").toUpperCase()}`];
  return (perClient || process.env.SOURCE_DEFAULT_KEY || "").trim() || null;
}

export async function computeClient(admin: SupabaseClient, src: SourceDescriptor) {
  const client = createSupabase(src.supabase_url, src.key, { auth: { persistSession: false } });
  const { data: rows, error } = await client.from(src.table_name).select("*");
  if (error) throw new Error(`leyendo ${src.table_name}: ${error.message}`);

  const out = computeDaily((rows ?? []) as RawRow[], src.utc_offset);
  const withId = <T,>(arr: T[]) => arr.map((r) => ({ ...r, client_id: src.client_id }));

  await Promise.all([
    admin.from("metrics_daily").upsert(withId(out.metricsDaily), { onConflict: "client_id,date" }),
    admin.from("tool_usage_daily").upsert(withId(out.toolUsage), { onConflict: "client_id,date,tool" }),
    admin.from("activity_hourly").upsert(withId(out.activityHourly), { onConflict: "client_id,date,hour" }),
    admin.from("intent_daily").upsert(withId(out.intentDaily), { onConflict: "client_id,date,intent" }),
  ]);
  await admin.from("client_sources").update({ last_synced_at: new Date().toISOString() }).eq("client_id", src.client_id);

  return { days: out.metricsDaily.length };
}
