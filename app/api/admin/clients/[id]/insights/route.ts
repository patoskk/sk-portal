// Genera y publica los insights de un cliente (acción de admin = ya revisado).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInsight } from "@/lib/insights/generate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse("no autenticado", { status: 401 });
  const admin = createAdminClient();
  const { data: me } = await admin.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  if (me?.role !== "admin") return new NextResponse("requiere rol admin", { status: 403 });

  const { id } = await params;
  const cli = await admin.from("clients").select("name,rubro").eq("id", id).maybeSingle();
  if (!cli.data) return new NextResponse("cliente no encontrado", { status: 404 });

  const range = await admin.from("metrics_daily").select("date").eq("client_id", id).order("date");
  if (!range.data?.length) return new NextResponse("el cliente no tiene métricas (corré el cómputo)", { status: 400 });
  const fromS = range.data[0].date;
  const toS = range.data[range.data.length - 1].date;

  const [metrics, tools, intents] = await Promise.all([
    admin.from("metrics_daily").select("*").eq("client_id", id).gte("date", fromS).lte("date", toS),
    admin.from("tool_usage_daily").select("*").eq("client_id", id).gte("date", fromS).lte("date", toS),
    admin.from("intent_daily").select("*").eq("client_id", id).gte("date", fromS).lte("date", toS),
  ]);
  const summary = { client: cli.data, period: { from: fromS, to: toS }, metrics: metrics.data, tools: tools.data, intents: intents.data };

  let insight;
  try {
    insight = await generateInsight(summary);
  } catch (e) {
    return new NextResponse("Claude: " + (e instanceof Error ? e.message : String(e)), { status: 500 });
  }

  const ins = await admin.from("insights").insert({
    client_id: id,
    period_start: fromS,
    period_end: toS,
    opportunities: insight.opportunities ?? [],
    funnel_insight: insight.funnel_insight,
    products_insight: insight.products_insight,
    usage_insight: insight.usage_insight,
    activity_insight: insight.activity_insight,
    misses_insight: insight.misses_insight,
    proxima_etapa: insight.proxima_etapa,
    reviewed: true,
  });
  if (ins.error) return new NextResponse("guardando: " + ins.error.message, { status: 500 });
  return NextResponse.json({ ok: true, opportunities: insight.opportunities?.length ?? 0 });
}
