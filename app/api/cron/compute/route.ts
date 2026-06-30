// Cron de cómputo. Por cada cliente: lee filas crudas de SU Supabase, corre la
// lógica portada de analyze.py y upserta las tablas resumen en la base central.
// Protegido por CRON_SECRET. Disparado por Vercel Cron (ver vercel.json) o n8n.
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDaily } from "@/lib/metrics/compute";
import type { RawRow } from "@/lib/metrics/parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron manda Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sources, error } = await admin
    .from("client_sources")
    .select("client_id, supabase_url, table_name, vault_secret_id, clients(utc_offset)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Record<string, unknown> = {};
  for (const src of sources ?? []) {
    try {
      const key = await resolveSourceKey(admin, src.client_id, src.vault_secret_id);
      const client = createSupabase(src.supabase_url, key, {
        auth: { persistSession: false },
      });

      // Histórico completo en el piloto. Para incrementalidad: filtrar por fecha > last_synced_at.
      const { data: rows, error: readErr } = await client
        .from(src.table_name)
        .select("*");
      if (readErr) throw new Error(`read ${src.table_name}: ${readErr.message}`);

      const utcOffset = Number((src.clients as { utc_offset?: number } | null)?.utc_offset ?? -3);
      const out = computeDaily((rows ?? []) as RawRow[], utcOffset);

      const withId = <T,>(arr: T[]) => arr.map((r) => ({ ...r, client_id: src.client_id }));
      await Promise.all([
        admin.from("metrics_daily").upsert(withId(out.metricsDaily), { onConflict: "client_id,date" }),
        admin
          .from("product_queries_daily")
          .upsert(withId(out.productQueries), { onConflict: "client_id,date,product,found" }),
        admin.from("tool_usage_daily").upsert(withId(out.toolUsage), { onConflict: "client_id,date,tool" }),
        admin.from("activity_hourly").upsert(withId(out.activityHourly), { onConflict: "client_id,date,hour" }),
        admin.from("intent_daily").upsert(withId(out.intentDaily), { onConflict: "client_id,date,intent" }),
      ]);
      await admin
        .from("client_sources")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("client_id", src.client_id);

      results[src.client_id] = { days: out.metricsDaily.length };
    } catch (e) {
      results[src.client_id] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ ok: true, results });
}

// Resuelve la key de lectura del Supabase del cliente.
// Piloto: env SOURCE_KEY_<CLIENT_ID>. Producción: Supabase Vault (vault_secret_id).
async function resolveSourceKey(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  vaultSecretId: string | null,
): Promise<string> {
  const envKey = process.env[`SOURCE_KEY_${clientId.replace(/-/g, "_").toUpperCase()}`];
  if (envKey) return envKey.trim();
  if (vaultSecretId) {
    const { data, error } = await admin
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("id", vaultSecretId)
      .single();
    if (!error && data?.decrypted_secret) return data.decrypted_secret as string;
  }
  throw new Error(`sin credencial de lectura para el cliente ${clientId}`);
}
