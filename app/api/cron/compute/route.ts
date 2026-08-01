// Cron de cómputo. Por cada cliente: lee filas crudas de su tabla fuente, corre la
// lógica portada de analyze.py y upserta las tablas resumen en la base central.
// Protegido por CRON_SECRET. Disparado por Vercel Cron (ver vercel.json) o n8n.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeClient, resolveSourceKey } from "@/lib/metrics/runCompute";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sources, error } = await admin
    .from("client_sources")
    .select("client_id, supabase_url, table_name, last_synced_at, clients(utc_offset, conversion_kinds)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Record<string, unknown> = {};
  for (const src of sources ?? []) {
    try {
      const key = resolveSourceKey(src.client_id);
      if (!key) throw new Error("sin credencial de lectura (SOURCE_DEFAULT_KEY)");
      const cfg = src.clients as { utc_offset?: number; conversion_kinds?: unknown } | null;
      const utc_offset = Number(cfg?.utc_offset ?? -3);
      results[src.client_id] = await computeClient(admin, {
        client_id: src.client_id,
        supabase_url: src.supabase_url,
        table_name: src.table_name,
        utc_offset,
        key,
        last_synced_at: src.last_synced_at,
        conversion_kinds: cfg?.conversion_kinds,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron/compute] cliente ${src.client_id}: ${msg}`);
      results[src.client_id] = { error: msg };
    }
  }

  return NextResponse.json({ ok: true, results });
}
