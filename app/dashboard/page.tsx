import { getDashboardData } from "@/lib/data/dashboard";
import { isAdmin } from "@/lib/data/role";
import { DateRangePicker } from "@/components/DateRangePicker";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Nav } from "@/components/Nav";
import { ReferralCard } from "@/components/ReferralCard";
import { ActivityBars, ActivityLine, HBarChart, UsageDonut } from "@/components/Charts";

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
  const admin = await isAdmin();

  const kpis = [
    { value: d.kpis.conversations, label: "Conversaciones" },
    { value: d.kpis.messagesHuman, label: "Mensajes de clientes" },
    { value: d.kpis.conversions, label: d.conversionLabel },
    { value: d.kpis.toolCalls, label: "Acciones del agente" },
  ];

  return (
    <main style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <Nav isAdmin={admin} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DateRangePicker from={from} to={to} />
          <SettingsMenu />
        </div>
      </header>

      <h1 style={{ fontSize: 34, margin: "0 0 24px", letterSpacing: "-.4px" }}>Tu agente de IA, en números</h1>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--accent-dark)" }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{k.label}</div>
          </div>
        ))}
      </section>

      <Grid>
        <Panel title="Uso de herramientas" insight={d.insight?.usage}>
          <UsageDonut data={d.tools} />
        </Panel>

        <div className="card">
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Indicadores</h3>
          {/* tasa de conversión con barra */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "var(--accent-dark)" }}>{d.conversionRate}%</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                de conversaciones llegan a {d.conversionLabel.toLowerCase()}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "var(--line)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(d.conversionRate, 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
            </div>
          </div>
          {/* mini-stats 2x2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <MiniStat value={d.kpis.toolCalls} label="Acciones del agente" />
            <MiniStat value={d.msgsPerConv} label="Mensajes por charla" />
            <MiniStat value={d.quality.errors} label="Errores" warn={d.quality.errors > 0} />
            <MiniStat value={d.quality.noResult} label="Consultas sin resultado" warn={d.quality.noResult > 0} />
          </div>
          {d.insight?.misses ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "14px 0 0" }}>{d.insight.misses}</p>
          ) : null}
        </div>

        <Panel title={`Lo más consultado por tus clientes`} insight={d.insight?.products} wide>
          <HBarChart data={d.topQueries} />
        </Panel>
        <Panel title="Actividad por día" insight={d.insight?.activity} wide>
          <ActivityLine data={d.activityDay} />
        </Panel>
        <Panel title="Actividad por hora" wide>
          <ActivityBars data={d.activityHour} />
        </Panel>
      </Grid>

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

      <ReferralCard />
    </main>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</section>;
}

function MiniStat({ value, label, warn }: { value: number | string; label: string; warn?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: warn ? "var(--warn)" : "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
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
