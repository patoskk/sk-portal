// Vista de impresión del Panel: mismos datos, maquetado A4 y sin navegación.
// Vive FUERA del route group (portal) a propósito — no lleva sidebar.
//
// El PDF lo genera el navegador ("Guardar como PDF"). La alternativa era
// Chromium en la función serverless de Vercel: pesado, frágil y una segunda
// maqueta que mantener. Así, lo que se imprime es exactamente lo que se ve.
import type { Metadata } from "next";
import { getDashboardData } from "@/lib/data/dashboard";
import { isAdmin } from "@/lib/data/role";
import { ActivityBars, ActivityLine, HBarChart, UsageDonut } from "@/components/Charts";
import { AutoPrint } from "@/components/AutoPrint";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reporte" };

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cliente?: string; print?: string }>;
}) {
  const sp = await searchParams;
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const from = sp.from ?? to;

  // mismo gate que el Panel: solo un admin puede pedir el reporte de otro cliente
  let admin = false;
  if (sp.cliente) admin = await isAdmin();
  const d = await getDashboardData({ from, to }, { asClientId: admin ? sp.cliente : undefined });

  return (
    <main className="report">
      <header className="report-head">
        <div>
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <h1 className="report-title">
            {d.clientName ? `${d.clientName} — ` : ""}tu agente de IA, en números
          </h1>
          <p className="report-period">
            Período del {fmtDate(from)} al {fmtDate(to)}
          </p>
        </div>
        <AutoPrint auto={sp.print === "1"} />
      </header>

      <section className="report-kpis">
        {d.conversions.map((c) => (
          <div key={c.key} className="report-kpi">
            <div className="report-kpi-value">{c.value}</div>
            <div className="report-kpi-label">{c.label}</div>
            <div className="report-kpi-sub">{c.rate}% de las conversaciones</div>
          </div>
        ))}
        <div className="report-kpi">
          <div className="report-kpi-value">{d.kpis.conversations}</div>
          <div className="report-kpi-label">Conversaciones</div>
        </div>
        <div className="report-kpi">
          <div className="report-kpi-value">{d.kpis.messagesHuman}</div>
          <div className="report-kpi-label">Mensajes de clientes</div>
        </div>
        <div className="report-kpi">
          <div className="report-kpi-value">{d.kpis.toolCalls}</div>
          <div className="report-kpi-label">Acciones del agente</div>
        </div>
      </section>

      <section className="report-grid">
        <Block title="Uso de herramientas" note={d.insight?.usage}>
          <UsageDonut data={d.tools} />
        </Block>
        <Block title="Calidad de las respuestas" note={d.insight?.misses}>
          <div className="ministat-grid">
            <div>
              <div className="ministat-value">{d.msgsPerConv}</div>
              <div className="stat-label">Mensajes por charla</div>
            </div>
            <div>
              <div className="ministat-value" style={d.quality.errors ? { color: "var(--warn)" } : undefined}>
                {d.quality.errors}
              </div>
              <div className="stat-label">Errores</div>
            </div>
            <div>
              <div className="ministat-value" style={d.quality.noResult ? { color: "var(--warn)" } : undefined}>
                {d.quality.noResult}
              </div>
              <div className="stat-label">Consultas sin resultado</div>
            </div>
          </div>
        </Block>
      </section>

      <Block title="Lo más consultado por tus clientes" note={d.insight?.products} wide>
        <HBarChart data={d.topQueries} />
      </Block>
      <Block title="Actividad por día" note={d.insight?.activity} wide>
        <ActivityLine data={d.activityDay} />
      </Block>
      <Block title="Actividad por hora" wide>
        <ActivityBars data={d.activityHour} />
      </Block>

      {d.insight?.opportunities?.length ? (
        <section className="report-opps page-break">
          <h2 className="section-title">Oportunidades de mejora</h2>
          <p className="section-sub">
            Análisis del {fmtDate(d.insight.periodStart)} al {fmtDate(d.insight.periodEnd)}
          </p>
          <ol className="opps" style={{ marginTop: "var(--sp-4)" }}>
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
        <section className="report-next">
          <h2 className="card-title">Próxima etapa</h2>
          <p className="card-note">{d.insight.proximaEtapa}</p>
        </section>
      ) : null}

      <footer className="report-foot">
        SK Optimal · reporte generado el {fmtDate(new Date().toISOString().slice(0, 10))}
      </footer>
    </main>
  );
}

function Block({
  title,
  note,
  wide,
  children,
}: {
  title: string;
  note?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`report-block${wide ? " report-block-wide" : ""}`}>
      <h2 className="card-title">{title}</h2>
      {children}
      {note ? <p className="card-note">{note}</p> : null}
    </section>
  );
}
