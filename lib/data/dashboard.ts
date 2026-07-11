// Capa de datos del dashboard (rubro-agnóstica). Lee las tablas resumen del rango
// y arma métricas que valen para cualquier agente. RLS filtra por client_id.
// Un admin puede ver el dashboard de un cliente puntual (asClientId): en ese caso
// se lee con service role + filtro explícito — la página gatea el rol antes.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toolLabel } from "@/lib/toolLabels";

export interface DashboardRange {
  from: string;
  to: string;
}

export interface KpiSet {
  conversations: number;
  messagesHuman: number;
  conversions: number; // ≈ pedidos (sesiones con evento clave)
  toolCalls: number; // acciones del agente
}

export interface DashboardData {
  clientName: string | null; // nombre del negocio (personaliza el panel)
  conversionLabel: string; // "Pedidos" / "Turnos" / "Conversiones"
  kpis: KpiSet;
  kpisPrev: KpiSet | null; // mismo largo de ventana, inmediatamente anterior
  prevPeriod: DashboardRange | null;
  conversionRate: number; // % de conversaciones que llegan al evento
  msgsPerConv: number; // mensajes por conversación (personas + agente)
  tools: { label: string; value: number }[];
  topQueries: { label: string; value: number }[]; // lo más consultado
  activityDay: { date: string; value: number }[];
  activityHour: { hour: string; value: number }[];
  quality: { errors: number; noResult: number };
  lastSyncedAt: string | null; // última corrida OK del cómputo
  insight: {
    opportunities: { title: string; text: string }[];
    periodStart: string;
    periodEnd: string;
    funnel?: string;
    products?: string;
    usage?: string;
    activity?: string;
    misses?: string;
    proximaEtapa?: string;
  } | null;
  period: DashboardRange;
}

export async function getDashboardData(
  range: DashboardRange,
  opts?: { asClientId?: string },
): Promise<DashboardData> {
  const { from, to } = range;
  const asClientId = opts?.asClientId;
  const sb = asClientId ? createAdminClient() : await createClient();
  // con service role, RLS no filtra: el filtro por cliente es explícito
  const daily = (table: string, f = from, t = to) => {
    const q = sb.from(table).select("*").gte("date", f).lte("date", t);
    return asClientId ? q.eq("client_id", asClientId) : q;
  };
  // ventana anterior del mismo largo, pegada al rango elegido (para los deltas)
  const DAY = 86400000;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  const prevTo = new Date(Date.parse(from) - DAY).toISOString().slice(0, 10);
  const prevFrom = new Date(Date.parse(from) - days * DAY).toISOString().slice(0, 10);
  // solo insights cuyo período SOLAPA el rango elegido: nada de prosa vieja
  // contradiciendo los gráficos de otro período.
  const insightQ = sb.from("insights").select("*").lte("period_start", to).gte("period_end", from);

  const [metrics, metricsPrev, tools, queries, hourly, insightRow, clientRow, lastSyncedAt] = await Promise.all([
    daily("metrics_daily"),
    daily("metrics_daily", prevFrom, prevTo),
    daily("tool_usage_daily"),
    daily("tool_queries_daily"),
    daily("activity_hourly"),
    (asClientId ? insightQ.eq("client_id", asClientId) : insightQ)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    asClientId
      ? sb.from("clients").select("name,conversion_label").eq("id", asClientId).maybeSingle()
      : sb.from("clients").select("name,conversion_label").maybeSingle(),
    getLastSyncedAt(asClientId), // su mini-cadena corre en paralelo con todo lo demás
  ]);

  const conversionLabel = (clientRow.data?.conversion_label as string) || "Conversiones";
  const clientName = (clientRow.data?.name as string) || null;

  const md = metrics.data ?? [];
  const sum = (k: string) => md.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const mdPrev = metricsPrev.data ?? [];
  const sumPrev = (k: string) => mdPrev.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const byTool = new Map<string, number>();
  for (const r of tools.data ?? []) byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + (Number(r.count) || 0));

  const byQuery = new Map<string, number>();
  for (const r of queries.data ?? []) byQuery.set(r.query, (byQuery.get(r.query) ?? 0) + (Number(r.count) || 0));

  const byDay = new Map<string, number>();
  for (const r of md) byDay.set(r.date, (byDay.get(r.date) ?? 0) + (Number(r.messages_total) || 0));
  const byHour = new Array(24).fill(0);
  for (const r of hourly.data ?? []) byHour[Number(r.hour)] += Number(r.count) || 0;

  const ins = insightRow.data;
  const conversations = sum("conversations");
  const convSessions = sum("conversion_sessions");
  // mensajes reales de la charla (personas + agente), sin los resultados de tools
  const msgsConv = sum("messages_human") + sum("messages_agent");

  // sin datos previos no hay comparación honesta (cliente nuevo o rango muy viejo)
  const kpisPrev: KpiSet | null = mdPrev.length
    ? {
        conversations: sumPrev("conversations"),
        messagesHuman: sumPrev("messages_human"),
        conversions: sumPrev("conversion_sessions"),
        toolCalls: sumPrev("tool_calls"),
      }
    : null;

  return {
    clientName,
    conversionLabel,
    kpis: {
      conversations,
      messagesHuman: sum("messages_human"),
      conversions: convSessions,
      toolCalls: sum("tool_calls"),
    },
    kpisPrev,
    prevPeriod: kpisPrev ? { from: prevFrom, to: prevTo } : null,
    conversionRate: conversations ? Math.round((100 * convSessions) / conversations) : 0,
    msgsPerConv: conversations ? Math.round((10 * msgsConv) / conversations) / 10 : 0,
    tools: [...byTool.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ label: toolLabel(name), value })),
    topQueries: [...byQuery.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value })),
    activityDay: [...byDay.entries()].sort().map(([date, value]) => ({ date, value })),
    activityHour: byHour.map((value, h) => ({ hour: `${String(h).padStart(2, "0")}h`, value })),
    quality: { errors: sum("errors"), noResult: sum("no_result") },
    lastSyncedAt,
    insight: ins
      ? {
          opportunities: (ins.opportunities as { title: string; text: string }[]) ?? [],
          periodStart: ins.period_start,
          periodEnd: ins.period_end,
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

// client_sources no tiene policy para authenticated (deny total): la última
// sincronización se lee con service role, acotada al client_id del usuario.
async function getLastSyncedAt(asClientId?: string): Promise<string | null> {
  let clientId = asClientId ?? null;
  if (!clientId) {
    // sin auth.getUser() previo: la policy "own mapping" ya devuelve solo la fila propia
    const sb = await createClient();
    const { data } = await sb.from("user_clients").select("client_id").maybeSingle();
    clientId = data?.client_id ?? null;
  }
  if (!clientId) return null;
  const { data } = await createAdminClient()
    .from("client_sources")
    .select("last_synced_at")
    .eq("client_id", clientId)
    .maybeSingle();
  return data?.last_synced_at ?? null;
}
