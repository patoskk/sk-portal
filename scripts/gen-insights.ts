// Genera los insights/oportunidades (Claude) para un cliente sobre TODO su período
// con datos, y los guarda en `insights` (reviewed=false, para tu revisión previa).
//   npx tsx scripts/gen-insights.ts [client_id]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { generateInsight } from "../lib/insights/generate.ts";

const CLIENT_ID = process.argv[2] || "d3b9967f-a5c9-465e-a42c-c4b116be71ba";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const c = await admin.from("clients").select("name,rubro").eq("id", CLIENT_ID).single();
  if (c.error) throw c.error;

  // rango completo con datos
  const range = await admin
    .from("metrics_daily")
    .select("date")
    .eq("client_id", CLIENT_ID)
    .order("date");
  if (range.error) throw range.error;
  if (!range.data.length) throw new Error("el cliente no tiene métricas cargadas (corré el cron primero)");
  const fromS = range.data[0].date;
  const toS = range.data[range.data.length - 1].date;

  const [metrics, tools, queries, intents] = await Promise.all([
    admin.from("metrics_daily").select("*").eq("client_id", CLIENT_ID).gte("date", fromS).lte("date", toS),
    admin.from("tool_usage_daily").select("*").eq("client_id", CLIENT_ID).gte("date", fromS).lte("date", toS),
    admin.from("tool_queries_daily").select("query,count").eq("client_id", CLIENT_ID).gte("date", fromS).lte("date", toS),
    admin.from("intent_daily").select("*").eq("client_id", CLIENT_ID).gte("date", fromS).lte("date", toS),
  ]);

  const summary = {
    client: c.data,
    period: { from: fromS, to: toS },
    metrics: metrics.data,
    tools: tools.data,
    top_consultas: queries.data,
    intents: intents.data,
  };

  console.log(`Generando insights de "${c.data.name}" (${fromS} -> ${toS})…`);
  const insight = await generateInsight(summary);

  const ins = await admin
    .from("insights")
    .insert({
      client_id: CLIENT_ID,
      period_start: fromS,
      period_end: toS,
      opportunities: insight.opportunities ?? [],
      funnel_insight: insight.funnel_insight,
      products_insight: insight.products_insight,
      usage_insight: insight.usage_insight,
      activity_insight: insight.activity_insight,
      misses_insight: insight.misses_insight,
      proxima_etapa: insight.proxima_etapa,
      reviewed: false,
    })
    .select("id");
  if (ins.error) throw ins.error;

  console.log("\n=== OPORTUNIDADES ===");
  (insight.opportunities ?? []).forEach((o, i) => console.log(`${i + 1}. ${o.title}\n   ${o.text}\n`));
  console.log("funnel:", insight.funnel_insight);
  console.log("productos:", insight.products_insight);
  console.log("quiebres:", insight.misses_insight);
  console.log("\nGuardado en insights (id:", ins.data[0].id, ", reviewed=false).");
  console.log("Para publicarlo al cliente: update insights set reviewed=true where id='" + ins.data[0].id + "';");
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
