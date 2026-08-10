// "Novedades de tu agente" — la bitácora del trabajo que hacemos cada mes.
// El cliente ve métricas y lecciones, pero no tenía dónde enterarse de qué le
// mejoramos al agente; el trabajo existía y era invisible.
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getUpdates, type UpdateKind } from "@/lib/data/updates";
import { EmptyState, Badge, type BadgeTone } from "@/components/ui";
import { SeenMarker } from "@/components/SeenMarker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novedades" };

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const KIND_UI: Record<UpdateKind, { label: string; tone: BadgeTone }> = {
  nuevo: { label: "Nuevo", tone: "solid" },
  mejora: { label: "Mejora", tone: "accent" },
  arreglo: { label: "Arreglo", tone: "gold" },
};

export default async function NovedadesPage() {
  const updates = await getUpdates();

  return (
    <main className="page" id="contenido" style={{ maxWidth: 820 }}>
      {/* deja registrado que ya las vio: apaga el punto del sidebar */}
      <SeenMarker latest={updates[0]?.published_at ?? null} />

      <div className="page-head">
        <h1 className="page-title">Novedades de tu agente</h1>
        <p className="page-sub">Lo que le fuimos sumando, mejorando y arreglando. De lo más nuevo a lo más viejo.</p>
      </div>

      {updates.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Sparkles size={20} strokeWidth={1.9} />} title="Todavía no hay novedades">
            Cuando le hagamos un cambio a tu agente lo vas a ver acá, con la fecha y qué significa para tu negocio.
          </EmptyState>
        </div>
      ) : (
        <ol className="timeline">
          {updates.map((u) => {
            const [y, m, d] = u.published_at.split("-");
            const ui = KIND_UI[u.kind];
            return (
              <li key={u.id} className="tl-item">
                <div className="tl-date">
                  <span className="tl-day">{Number(d)}</span>
                  <span className="tl-mon">
                    {MES[Number(m) - 1]} {y.slice(2)}
                  </span>
                </div>
                <div className="tl-rail" aria-hidden="true">
                  <span className={`tl-dot tl-dot-${u.kind}`} />
                </div>
                <div className="tl-card">
                  <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                    <Badge tone={ui.tone}>{ui.label}</Badge>
                  </div>
                  <h2 className="tl-title">{u.title}</h2>
                  {u.body ? <p className="tl-text">{u.body}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
