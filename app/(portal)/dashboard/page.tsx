import type { Metadata } from "next";
import { getDashboardData } from "@/lib/data/dashboard";
import { getClients } from "@/lib/data/clients";
import { isAdmin } from "@/lib/data/role";
import { ClientPicker } from "@/components/ClientPicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PrintLink } from "@/components/PrintLink";
import { InfoHint } from "@/components/InfoHint";
import Link from "next/link";
import { ArrowRight, Lightbulb, Flag } from "lucide-react";
import { ActivityBars, ActivityLine, HBarChart, Sparkline, UsageDonut } from "@/components/Charts";
import { Card, CardHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel" };

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

// Qué significa cada métrica, para alguien que no es técnico.
const AYUDA: Record<string, string> = {
  Conversaciones: "Charlas distintas que tuvo el agente. Si una persona escribe tres veces en el día, es una sola.",
  "Mensajes de clientes": "Cuántos mensajes escribieron las personas. Mide el trabajo que se ahorró tu equipo.",
  "Acciones del agente": "Veces que el agente consultó precios, stock, promociones o cargó un pedido.",
  "Mensajes por charla": "Cuántos mensajes hacen falta, en promedio, para resolver una consulta. Menos suele ser mejor.",
  Errores: "Consultas donde algo falló y el agente no pudo responder.",
  "Consultas sin resultado": "Le preguntaron por algo que no encontró. Suelen ser ventas que se pierden.",
};

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

  // El evento de negocio (Pedidos / Turnos) va como tarjeta destacada: es el
  // único número que le cambia el día al dueño. El resto son de contexto y van
  // más chicas — antes eran cinco rectángulos del mismo peso, sin foco.
  const secundarios = [
    { value: d.kpis.conversations, prev: d.kpisPrev?.conversations, label: "Conversaciones", series: d.series.conversations },
    { value: d.kpis.messagesHuman, prev: d.kpisPrev?.messagesHuman, label: "Mensajes de clientes", series: d.series.messagesHuman },
    { value: d.kpis.toolCalls, prev: d.kpisPrev?.toolCalls, label: "Acciones del agente", series: d.series.toolCalls },
  ];
  const prevRangeLabel = d.prevPeriod
    ? `vs. ${fmtDate(d.prevPeriod.from)} – ${fmtDate(d.prevPeriod.to)}`
    : "";
  const reporteHref = `/reporte?from=${from}&to=${to}${asClientId ? `&cliente=${asClientId}` : ""}`;

  return (
    <main className="page" id="contenido">
      <div className="page-head-row">
        <div>
          {d.clientName ? <div className="page-eyebrow">{d.clientName}</div> : null}
          <h1 className="page-title">Tu agente de IA, en números</h1>
          <p className="page-sub" style={{ fontSize: "var(--fs-md)" }}>
            {fmtDate(from)} – {fmtDate(to)}
            {d.lastSyncedAt ? (
              <>
                {" · última actualización de datos "}
                {new Date(d.lastSyncedAt).toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
                {" hs"}
              </>
            ) : null}
          </p>
        </div>
        <div className="page-toolbar">
          {admin ? <ClientPicker clients={clients} current={asClientId} /> : null}
          <DateRangePicker from={from} to={to} />
          <PrintLink href={reporteHref} />
        </div>
      </div>

      <section className="hero-grid">
        {d.conversions.map((c) => (
          <div key={c.key} className="card hero-kpi">
            <div className="hero-kpi-label">{c.label}</div>
            <div className="row" style={{ alignItems: "baseline", gap: "var(--sp-3)" }}>
              <span className="hero-kpi-value">{c.value}</span>
              <Delta curr={c.value} prev={c.prev ?? undefined} title={prevRangeLabel} />
            </div>
            <p className="hero-kpi-rate">
              {c.rate}% de las conversaciones terminan en {c.label.toLowerCase()}
            </p>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(c.rate, 100)}%` }} />
            </div>
            <Sparkline values={c.series} height={40} grow />
          </div>
        ))}

        <div className="stat-col">
          {secundarios.map((k) => (
            <div key={k.label} className="card stat-tile">
              <div className="row" style={{ alignItems: "baseline", gap: "var(--sp-2)" }}>
                <span className="stat-value">{k.value}</span>
                <Delta curr={k.value} prev={k.prev} title={prevRangeLabel} />
              </div>
              <div className="stat-label">
                {k.label}
                <InfoHint text={AYUDA[k.label]} />
              </div>
              <Sparkline values={k.series} height={26} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel-grid">
        <Card>
          <CardHeader as="h3" title="Uso de herramientas" hint="Qué le pide la gente al agente." />
          <UsageDonut data={d.tools} />
          {d.insight?.usage ? <p className="card-note">{d.insight.usage}</p> : null}
        </Card>

        <Card className="quality-card">
          <CardHeader as="h3" title="Calidad de las respuestas" hint="Dónde el agente todavía se traba." />
          <div className="ministat-stack">
            <MiniStat value={d.msgsPerConv} label="Mensajes por charla" />
            <MiniStat value={d.quality.errors} label="Errores" warn={d.quality.errors > 0} />
            <MiniStat value={d.quality.noResult} label="Consultas sin resultado" warn={d.quality.noResult > 0} />
          </div>
          {d.insight?.misses ? <p className="card-note">{d.insight.misses}</p> : null}
        </Card>

        <Card className="span-2">
          <CardHeader as="h3" title="Lo más consultado por tus clientes" />
          <HBarChart data={d.topQueries} />
          {d.insight?.products ? <p className="card-note">{d.insight.products}</p> : null}
        </Card>
        <Card className="span-2">
          <CardHeader as="h3" title="Actividad por día" />
          <ActivityLine data={d.activityDay} />
          {d.insight?.activity ? <p className="card-note">{d.insight.activity}</p> : null}
        </Card>
        <Card className="span-2">
          <CardHeader as="h3" title="Actividad por hora" hint="La hora pico va en teal pleno." />
          <ActivityBars data={d.activityHour} />
        </Card>
      </section>

      {d.insight?.opportunities?.length ? (
        <section style={{ marginTop: "var(--sp-6)" }}>
          <div className="section-head">
            <div className="section-icon">
              <Lightbulb size={18} strokeWidth={1.9} />
            </div>
            <div>
              <h2 className="section-title">Oportunidades de mejora</h2>
              <p className="section-sub">
                Ordenadas por lo que más mueve la aguja · análisis del {fmtDate(d.insight.periodStart)} al{" "}
                {fmtDate(d.insight.periodEnd)}
              </p>
            </div>
          </div>
          <ol className="opps">
            {d.insight.opportunities.map((o, i) => (
              <li key={i} className="opp">
                <span className="opp-rank">{i + 1}</span>
                <div>
                  <h3 className="opp-title">{o.title}</h3>
                  <p className="opp-text">{o.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {d.insight?.proximaEtapa ? (
        <Card className="next-step">
          <div className="section-icon" style={{ flex: "none" }}>
            <Flag size={18} strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="card-title">Próxima etapa</h2>
            <p className="card-note" style={{ marginTop: 4 }}>{d.insight.proximaEtapa}</p>
          </div>
        </Card>
      ) : null}

      {/* El Panel es solo métricas. La oferta comercial vive en /beneficios; esta
          línea la mantiene a la vista sin volver a mezclar reporte con venta. */}
      <Link href="/beneficios" className="beneficios-hint">
        <span style={{ flex: 1 }}>
          ¿Querés llevar la IA al resto de tu empresa?{" "}
          <span style={{ color: "var(--ink-soft)" }}>
            Mirá el servicio de consultoría y el programa de referidos.
          </span>
        </span>
        <span className="row" style={{ color: "var(--accent-dark)", fontWeight: 700, whiteSpace: "nowrap", gap: 6 }}>
          Ver beneficios <ArrowRight size={16} strokeWidth={2.2} />
        </span>
      </Link>
    </main>
  );
}

// Variación vs. la ventana anterior del mismo largo. Sin período previo (cliente
// nuevo) no se muestra nada: un delta inventado es peor que ninguno.
function Delta({ curr, prev, title }: { curr: number; prev: number | undefined; title: string }) {
  if (prev === undefined || (curr === 0 && prev === 0)) return null;
  if (prev === 0) return <span className="delta" title={title}>nuevo</span>;
  const pct = Math.round((100 * (curr - prev)) / prev);
  if (pct === 0) return <span className="delta delta-flat" title={title}>= igual</span>;
  const up = pct > 0;
  return (
    <span className={`delta${up ? "" : " delta-down"}`} title={title}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function MiniStat({ value, label, warn }: { value: number | string; label: string; warn?: boolean }) {
  return (
    <div>
      <div className="ministat-value" style={warn ? { color: "var(--warn)" } : undefined}>{value}</div>
      <div className="stat-label">
        {label}
        <InfoHint text={AYUDA[label]} />
      </div>
    </div>
  );
}
