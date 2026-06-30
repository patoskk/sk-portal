// Publica (reviewed=true) el insight más reciente de un cliente, para que aparezca
// en su dashboard. Es el "gate" de revisión: nada se muestra al cliente hasta esto.
//   npx tsx scripts/publish-insights.ts [client_id]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const CLIENT_ID = process.argv[2] || "d3b9967f-a5c9-465e-a42c-c4b116be71ba";

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const latest = await admin
    .from("insights")
    .select("id, period_start, period_end")
    .eq("client_id", CLIENT_ID)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();
  if (latest.error) throw latest.error;

  const upd = await admin.from("insights").update({ reviewed: true }).eq("id", latest.data.id);
  if (upd.error) throw upd.error;
  console.log(`✓ publicado insight ${latest.data.id} (${latest.data.period_start} -> ${latest.data.period_end})`);
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
