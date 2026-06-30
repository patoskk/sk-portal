// Capa de datos del dashboard. Lee las tablas resumen para un rango de fechas y
// las agrega a la forma que consumen los gráficos (mismo vocabulario que el reporte).
// RLS ya filtra por client_id: NO filtramos por cliente en el código.
import { createClient } from "@/lib/supabase/server";

export interface DashboardRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface DashboardData {
  kpis: { conversations: number; messagesHuman: number; conversionPct: number; stockQueries: number };
  funnel: { labels: string[]; values: number[] };
  topProducts: { label: string; value: number }[];
  stockMisses: { label: string; value: number }[];
  usage: { label: string; value: number }[];
  activityDay: { date: string; value: number }[];
  activityHour: { hour: string; value: number }[];
  insight: {
    opportunities: { title: string; text: string }[];
    funnel?: string;
    products?: string;
    usage?: string;
    activity?: string;
    misses?: string;
    proximaEtapa?: string;
  } | null;
  period: DashboardRange;
}

const USAGE_LABELS: Record<string, string> = {
  STOCK: "Precio / stock",
  GET_PROMOS: "Promos",
  IMAGENES: "Imágenes",
  PEDIDOS: "Pedidos",
};

function topN<T extends { value: number }>(arr: T[], n: number): T[] {
  return [...arr].sort((a, b) => b.value - a.value).slice(0, n);
}

export async function getDashboardData(range: DashboardRange): Promise<DashboardData> {
  const sb = await createClient();
  const { from, to } = range;

  const [metrics, products, tools, hourly, insightRow] = await Promise.all([
    sb.from("metrics_daily").select("*").gte("date", from).lte("date", to),
    sb.from("product_queries_daily").select("*").gte("date", from).lte("date", to),
    sb.from("tool_usage_daily").select("*").gte("date", from).lte("date", to),
    sb.from("activity_hourly").select("*").gte("date", from).lte("date", to),
    sb
      .from("insights")
      .select("*")
      .lte("period_end", to)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const md = metrics.data ?? [];
  const sum = (k: string) => md.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const conversations = sum("conversations");
  const orderSessions = sum("order_sessions");
  const stockSessions = sum("stock_sessions");
  const conversionPct = conversations ? Math.round((100 * orderSessions) / conversations) : 0;

  // top productos (found) y quiebres (no found), sumando por producto sobre el rango
  const byProduct = new Map<string, number>();
  const byMiss = new Map<string, number>();
  for (const r of products.data ?? []) {
    const m = r.found ? byProduct : byMiss;
    m.set(r.product, (m.get(r.product) ?? 0) + (Number(r.count) || 0));
  }
  const toArr = (m: Map<string, number>) =>
    [...m.entries()].map(([label, value]) => ({ label, value }));

  // donut de uso por herramienta
  const byTool = new Map<string, number>();
  for (const r of tools.data ?? []) byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + (Number(r.count) || 0));

  // actividad por día y por hora (0-23)
  const byDay = new Map<string, number>();
  for (const r of md) byDay.set(r.date, (byDay.get(r.date) ?? 0) + (Number(r.messages_total) || 0));
  const byHour = new Array(24).fill(0);
  for (const r of hourly.data ?? []) byHour[Number(r.hour)] += Number(r.count) || 0;

  const ins = insightRow.data;

  return {
    kpis: {
      conversations,
      messagesHuman: sum("messages_human"),
      conversionPct,
      stockQueries: sum("stock_queries"),
    },
    funnel: {
      labels: ["Escribieron", "Consultaron precio", "Hicieron pedido"],
      values: [conversations, stockSessions, orderSessions],
    },
    topProducts: topN(toArr(byProduct), 10),
    stockMisses: topN(toArr(byMiss), 10),
    usage: [...byTool.entries()].map(([k, value]) => ({ label: USAGE_LABELS[k] ?? k, value })),
    activityDay: [...byDay.entries()].sort().map(([date, value]) => ({ date, value })),
    activityHour: byHour.map((value, h) => ({ hour: `${String(h).padStart(2, "0")}h`, value })),
    insight: ins
      ? {
          opportunities: (ins.opportunities as { title: string; text: string }[]) ?? [],
          funnel: ins.funnel_insight ?? undefined,
          products: ins.products_insight ?? undefined,
          usage: ins.usage_insight ?? undefined,
          activity: ins.activity_insight ?? undefined,
          misses: ins.misses_insight ?? undefined,
          proximaEtapa: ins.proxima_etapa ?? undefined,
        }
      : null,
    period: range,
  };
}
