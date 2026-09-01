// Inventario de lo que un cliente tiene guardado en la base central.
//
// Existe para que el RESPALDO y el BORRADO lean exactamente la misma lista: si
// una tabla se suma al borrado y no al respaldo, el archivo que se baja antes de
// borrar queda incompleto y nadie se entera hasta que hace falta.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Tablas con grano diario: se filtran por `date` (YYYY-MM-DD). */
export const DAILY_TABLES = [
  "metrics_daily",
  "conversions_daily",
  "tool_usage_daily",
  "tool_queries_daily",
  "product_queries_daily", // legacy (rubro almacén): ya no se escribe, pero puede tener historia
  "activity_hourly",
  "intent_daily",
] as const;

const PAGE = 1000; // PostgREST corta en 1000 filas: SIEMPRE paginar (misma trampa que el cómputo)

export interface ClientDump {
  exported_at: string;
  /** Corte aplicado: se incluyó todo lo ANTERIOR a esta fecha. null = todo. */
  before: string | null;
  client: Record<string, unknown> | null;
  source: Record<string, unknown> | null;
  users: { user_id: string; role: string; email: string | null }[];
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

/**
 * Medianoche LOCAL del cliente, en UTC. `tool_events.ts` se guarda en UTC, pero el
 * corte que elige el admin es un día local: con huso −3, el 01/09 local arranca a
 * las 03:00 Z. Sin esta conversión el borrado se come (o deja) tres horas de más.
 */
export function localMidnightIso(date: string, utcOffsetHours: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") - utcOffsetHours * 3600 * 1000).toISOString();
}

/** Corte "menor que": columna + valor. Sin corte, se lleva todo. */
interface Cut {
  col: string;
  lt: string;
}

async function fetchAll(
  admin: SupabaseClient,
  table: string,
  clientId: string,
  cut: Cut | null,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = admin.from(table).select("*").eq("client_id", clientId).range(from, from + PAGE - 1);
    if (cut) q = q.lt(cut.col, cut.lt);
    const { data, error } = await q;
    // Una tabla que no existe (migración sin correr) no puede tirar abajo el respaldo:
    // se anota vacía y el resto del volcado sigue.
    if (error) {
      console.warn(`[clientData] ${table}: ${error.message}`);
      return out;
    }
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Usuarios del portal mapeados a este cliente, con su mail. */
export async function getClientUsers(
  admin: SupabaseClient,
  clientId: string,
): Promise<{ user_id: string; role: string; email: string | null }[]> {
  const { data } = await admin.from("user_clients").select("user_id,role").eq("client_id", clientId);
  const rows = (data ?? []) as { user_id: string; role: string }[];
  return Promise.all(
    rows.map(async (r) => {
      const { data: u } = await admin.auth.admin.getUserById(r.user_id);
      return { user_id: r.user_id, role: r.role, email: u.user?.email ?? null };
    }),
  );
}

/**
 * Volcado completo de un cliente. Con `before`, solo lo anterior a esa fecha
 * (exactamente lo mismo que borraría `deleteClientMetrics`).
 */
export async function dumpClient(
  admin: SupabaseClient,
  clientId: string,
  before: string | null,
): Promise<ClientDump> {
  const { data: client } = await admin.from("clients").select("*").eq("id", clientId).maybeSingle();
  const { data: source } = await admin.from("client_sources").select("*").eq("client_id", clientId).maybeSingle();
  const utc = Number((client as { utc_offset?: number } | null)?.utc_offset ?? -3);

  const data: Record<string, unknown[]> = {};
  for (const t of DAILY_TABLES) {
    data[t] = await fetchAll(admin, t, clientId, before ? { col: "date", lt: before } : null);
  }
  data.tool_events = await fetchAll(
    admin,
    "tool_events",
    clientId,
    before ? { col: "ts", lt: localMidnightIso(before, utc) } : null,
  );
  // un insight que arranca antes del corte describe días que se van a borrar
  data.insights = await fetchAll(admin, "insights", clientId, before ? { col: "period_start", lt: before } : null);
  // novedades y lecciones propias solo van en el volcado completo (el borrado por
  // fecha no las toca: son texto nuestro, no métricas)
  if (!before) {
    data.updates = await fetchAll(admin, "updates", clientId, null);
    data.lessons = await fetchAll(admin, "lessons", clientId, null);
  }

  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) counts[k] = v.length;

  return {
    exported_at: new Date().toISOString(),
    before,
    client: (client as Record<string, unknown> | null) ?? null,
    source: (source as Record<string, unknown> | null) ?? null,
    users: await getClientUsers(admin, clientId),
    counts,
    data,
  };
}
