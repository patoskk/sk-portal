import { getDashboardData } from "@/lib/data/dashboard";
import { getClients } from "@/lib/data/clients";
import { isAdmin } from "@/lib/data/role";
import { ClientPicker } from "@/components/ClientPicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Nav } from "@/components/Nav";
import Link from "next/link";
import { ActivityBars, ActivityLine, HBarChart, UsageDonut } from "@/components/Charts";

export const dynamic = "force-dynamic";

const UTC_OFFSET_H = -3; // huso de referencia del portal (Argentina, sin DST)

// "hace n días" en hora LOCAL del cliente: con UTC, de 21 a 24 h el rango
// por defecto apuntaría a un día que todavía no existe acá.
function isoDaysAgo(n: number): string {
  const local = new Date(Date.now() + UTC_OFFSET_H * 3600 * 1000);
  local.setUTCDate(local.getUTCDate() - n);
  return local.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cliente?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? isoDaysAgo(30);
  const to = sp.to ?? isoDaysAgo(0);
  // "ver como cliente" es solo para admins; para un viewer, RLS manda.
  // Sin ?cliente, rol y datos se piden EN PARALELO (el rol no condiciona la query);
  // con ?cliente hay que confirmar el rol antes de usar el service role.
  let admin: boolean;
  let d: Awaited<ReturnType<typeof getDashboardData>>;
  if (sp.cliente) {
    admin = await isAdmin();
    d = await getDashboardData({ from, to }, { asClientId: admin ? sp.cliente : undefined });
  } else {
    [admin, d] = await Promise.all([isAdmin(), getDashboardData({ from, to })]);
  }
  const asClientId = admin && sp.cliente ? sp.cliente : undefined;
  const clients = admin ? await getClients() : [];

  // Los eventos clave van como KPI propio cada uno: un cliente que vende Y agenda
  // (pedidos + turnos) necesita ver cuál de los dos funciona, no la suma.
  const kpis = [
    { value: d.kpis.conversations, prev: d.kpisPrev?.conversations, label: "Conversaciones" },
    { value: d.kpis.messagesHuman, prev: d.kpisPrev?.messagesHuman, label: "Mensajes de clientes" },
    ...d.conversions.map((c) => ({ value: c.value, prev: c.prev ?? undefined, label: c.label })),
    { value: d.kpis.toolCalls, prev: d.kpisPrev?.toolCalls, label: "Acciones del agente" },
  ];
  const prevRangeLabel = d.prevPeriod
    ? `vs. ${fmtDate(d.prevPeriod.from)} – ${fmtDate(d.prevPeriod.to)}`
    : "";

  return (
    <main className="page">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <Nav isAdmin={admin} />
        </div>
        <div className="topbar-actions">
          {admin ? <ClientPicker clients={clients} current={asClientId} /> : null}
          <DateRangePicker from={from} to={to} />
          <SettingsMenu />
        </div>
      </header>

      {d.clientName ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "var(--accent-dark)",
            marginBottom: 4,
          }}
        >
          {d.clientName}
        </div>
      ) : null}
      <h1 className="page-title" style={d.clientName ? { marginTop: 0 } : undefined}>
        Tu agente de IA, en números
      </h1>
      {d.lastSyncedAt ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "-16px 0 20px" }}>
          Última actualización de datos:{" "}
          {new Date(d.lastSyncedAt).toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}{" "}
          hs
        </p>
      ) : null}

      <section className={`kpi-grid${kpis.length > 4 ? " kpi-grid-5" : ""}`}>
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--accent-dark)" }}>{k.value}</span>
              <Delta curr={k.value} prev={k.prev} title={prevRangeLabel} />
            </div>
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
          {/* tasa de conversión con barra — una por tipo de evento (pedidos, turnos…) */}
          <div style={{ marginBottom: 18 }}>
            {d.conversions.map((c, i) => (
              <div key={c.key} style={i ? { marginTop: 14 } : undefined}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{
                      fontSize: d.conversions.length > 1 ? 27 : 34,
                      fontWeight: 800,
                      color: "var(--accent-dark)",
                    }}
                  >
                    {c.rate}%
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    de conversaciones llegan a {c.label.toLowerCase()}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "var(--line)", marginTop: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(c.rate, 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
                </div>
              </div>
            ))}
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
          <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>Oportunidades de mejora</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: "0 0 12px" }}>
            Análisis del {fmtDate(d.insight.periodStart)} al {fmtDate(d.insight.periodEnd)}
          </p>
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

      {/* El Panel es solo métricas. La oferta comercial vive en /beneficios; esta
          línea la mantiene a la vista sin volver a mezclar reporte con venta. */}
      <Link
        href="/beneficios"
        className="beneficios-hint"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 26,
          padding: "13px 18px",
          borderRadius: 12,
          background: "var(--card)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow)",
          color: "var(--ink)",
          textDecoration: "none",
          fontSize: 13.5,
          lineHeight: 1.45,
        }}
      >
        <span style={{ flex: 1 }}>
          ¿Querés llevar la IA al resto de tu empresa?{" "}
          <span style={{ color: "var(--ink-soft)" }}>
            Mirá el servicio de consultoría y el programa de referidos.
          </span>
        </span>
        <span style={{ color: "var(--accent-dark)", fontWeight: 700, whiteSpace: "nowrap" }}>
          Ver beneficios →
        </span>
      </Link>
    </main>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <section className="panel-grid">{children}</section>;
}

// Variación vs. la ventana anterior del mismo largo. Sin período previo (cliente
// nuevo) no se muestra nada: un delta inventado es peor que ninguno.
function Delta({ curr, prev, title }: { curr: number; prev: number | undefined; title: string }) {
  if (prev === undefined || (curr === 0 && prev === 0)) return null;
  const base = {
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    whiteSpace: "nowrap" as const,
  };
  if (prev === 0)
    return (
      <span title={title} style={{ ...base, color: "var(--accent-dark)", background: "var(--tint)" }}>
        nuevo
      </span>
    );
  const pct = Math.round((100 * (curr - prev)) / prev);
  if (pct === 0)
    return (
      <span title={title} style={{ ...base, color: "var(--ink-soft)", background: "var(--tint)" }}>
        = igual
      </span>
    );
  const up = pct > 0;
  return (
    <span
      title={title}
      style={{
        ...base,
        color: up ? "var(--accent-dark)" : "var(--warn)",
        background: "var(--tint)",
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
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
