// Capa de datos del dashboard (rubro-agnóstica). Lee las tablas resumen del rango
// y arma métricas que valen para cualquier agente. RLS filtra por client_id.
import { createClient } from "@/lib/supabase/server";

export interface DashboardRange {
  from: string;
  to: string;
}

export interface DashboardData {
  conversionLabel: string; // "Pedidos" / "Turnos" / "Conversiones"
  kpis: {
    conversations: number;
    messagesHuman: number;
    conversions: number; // ≈ pedidos (sesiones con evento clave)
    avgResponse: string; // "12s" / "1m 5s" / "—"
  };
  conversionRate: number; // % de conversaciones que llegan al evento
  tools: { label: string; value: number }[];
  activityDay: { date: string; value: number }[];
  activityHour: { hour: string; value: number }[];
  quality: { errors: number; noResult: number };
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

function fmtSecs(sumSec: number, count: number): string {
  if (!count) return "—";
  const s = Math.round(sumSec / count);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export async function getDashboardData(range: DashboardRange): Promise<DashboardData> {
  const sb = await createClient();
  const { from, to } = range;

  const [metrics, tools, hourly, insightRow, clientRow] = await Promise.all([
    sb.from("metrics_daily").select("*").gte("date", from).lte("date", to),
    sb.from("tool_usage_daily").select("*").gte("date", from).lte("date", to),
    sb.from("activity_hourly").select("*").gte("date", from).lte("date", to),
    sb
      .from("insights")
      .select("*")
      .lte("period_end", to)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("clients").select("conversion_label").maybeSingle(),
  ]);

  const conversionLabel = (clientRow.data?.conversion_label as string) || "Conversiones";

  const md = metrics.data ?? [];
  const sum = (k: string) => md.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const byTool = new Map<string, number>();
  for (const r of tools.data ?? []) byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + (Number(r.count) || 0));

  const byDay = new Map<string, number>();
  for (const r of md) byDay.set(r.date, (byDay.get(r.date) ?? 0) + (Number(r.messages_total) || 0));
  const byHour = new Array(24).fill(0);
  for (const r of hourly.data ?? []) byHour[Number(r.hour)] += Number(r.count) || 0;

  const ins = insightRow.data;
  const conversations = sum("conversations");
  const convSessions = sum("conversion_sessions");

  return {
    conversionLabel,
    kpis: {
      conversations,
      messagesHuman: sum("messages_human"),
      conversions: convSessions,
      avgResponse: fmtSecs(sum("response_sum_sec"), sum("response_count")),
    },
    conversionRate: conversations ? Math.round((100 * convSessions) / conversations) : 0,
    tools: [...byTool.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    activityDay: [...byDay.entries()].sort().map(([date, value]) => ({ date, value })),
    activityHour: byHour.map((value, h) => ({ hour: `${String(h).padStart(2, "0")}h`, value })),
    quality: { errors: sum("errors"), noResult: sum("no_result") },
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
