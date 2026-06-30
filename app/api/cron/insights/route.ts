// Job semanal de insights. Por cliente: arma el resumen de la última semana desde
// las tablas resumen, le pide a Claude las oportunidades + prosa (regla de oro de
// metrics-pdf-report: rankear por impacto, ventas perdidas > confiabilidad > fricción),
// y guarda en `insights` con reviewed=false (gate de revisión antes de mostrar al cliente).
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInsight } from "@/lib/insights/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 86400000);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);

  const { data: clients } = await admin.from("clients").select("id, name, rubro");
  const results: Record<string, unknown> = {};

  for (const c of clients ?? []) {
    try {
      const [metrics, tools, queries, intents] = await Promise.all([
        admin.from("metrics_daily").select("*").eq("client_id", c.id).gte("date", fromS).lte("date", toS),
        admin.from("tool_usage_daily").select("*").eq("client_id", c.id).gte("date", fromS).lte("date", toS),
        admin.from("tool_queries_daily").select("query,count").eq("client_id", c.id).gte("date", fromS).lte("date", toS),
        admin.from("intent_daily").select("*").eq("client_id", c.id).gte("date", fromS).lte("date", toS),
      ]);
      const summary = { client: { name: c.name, rubro: c.rubro }, period: { from: fromS, to: toS },
        metrics: metrics.data, tools: tools.data, top_consultas: queries.data, intents: intents.data };

      const insight = await generateInsight(summary);
      await admin.from("insights").insert({
        client_id: c.id,
        period_start: fromS,
        period_end: toS,
        opportunities: insight.opportunities ?? [],
        funnel_insight: insight.funnel_insight,
        products_insight: insight.products_insight,
        usage_insight: insight.usage_insight,
        activity_insight: insight.activity_insight,
        misses_insight: insight.misses_insight,
        proxima_etapa: insight.proxima_etapa,
        reviewed: true, // automático semanal: se publica solo
      });
      results[c.id] = { ok: true, opportunities: insight.opportunities?.length ?? 0 };
    } catch (e) {
      results[c.id] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return NextResponse.json({ ok: true, results });
}
