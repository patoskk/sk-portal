import { getDashboardData } from "@/lib/data/dashboard";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  ActivityBars,
  ActivityLine,
  FunnelChart,
  HBarChart,
  UsageDonut,
} from "@/components/Charts";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? isoDaysAgo(30);
  const to = sp.to ?? isoDaysAgo(0);
  const d = await getDashboardData({ from, to });

  const kpis = [
    { value: d.kpis.conversations, label: "Conversaciones" },
    { value: d.kpis.messagesHuman, label: "Mensajes de clientes" },
    { value: `${d.kpis.conversionPct}%`, label: "Llegan a pedido" },
    { value: d.kpis.stockQueries, label: "Búsquedas de productos" },
  ];

  return (
    <main style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0" }}>
        <div className="wordmark">
          <span className="sk">SK</span> <span className="op">OPTIMAL</span>
        </div>
        <DateRangePicker from={from} to={to} />
      </header>

      <h1 style={{ fontSize: 34, margin: "0 0 24px", letterSpacing: "-.4px" }}>Tu agente de IA, en números</h1>

      {/* KPIs */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <div style={{ fontSize: 30, fontWeight: 800, color: BRAND.accentDark }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{k.label}</div>
          </div>
        ))}
      </section>

      <Grid>
        <Panel title="Embudo de conversación" insight={d.insight?.funnel}>
          <FunnelChart labels={d.funnel.labels} values={d.funnel.values} />
        </Panel>
        <Panel title="Uso del agente" insight={d.insight?.usage}>
          <UsageDonut data={d.usage} />
        </Panel>
        <Panel title="Productos más buscados" insight={d.insight?.products}>
          <HBarChart data={d.topProducts} />
        </Panel>
        <Panel title="Búsquedas sin resultado (ventas perdidas)" insight={d.insight?.misses}>
          <HBarChart data={d.stockMisses} color={BRAND.warn} />
        </Panel>
        <Panel title="Actividad por día" insight={d.insight?.activity} wide>
          <ActivityLine data={d.activityDay} />
        </Panel>
        <Panel title="Actividad por hora" wide>
          <ActivityBars data={d.activityHour} />
        </Panel>
      </Grid>

      {/* Oportunidades al final: la conclusión accionable (la regla de oro) */}
      {d.insight?.opportunities?.length ? (
        <section className="card" style={{ marginTop: 22, background: "var(--tint)", border: 0 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Oportunidades de mejora</h2>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {d.insight.opportunities.map((o, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{o.title}.</strong> {o.text}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {d.insight?.proximaEtapa ? (
        <p style={{ color: "var(--ink-soft)", marginTop: 16, fontSize: 13 }}>{d.insight.proximaEtapa}</p>
      ) : null}
    </main>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</section>;
}

function Panel({
  title,
  insight,
  wide,
  children,
}: {
  title: string;
  insight?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>{title}</h3>
      {children}
      {insight ? <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 0 }}>{insight}</p> : null}
    </div>
  );
}
