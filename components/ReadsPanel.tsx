// Panel de lectura por cliente (Admin). Server component: no tiene estado.
import { Eye } from "lucide-react";
import type { ClientReads } from "@/lib/data/lessonReads";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFechaCorta(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MES[d.getMonth()]}`;
}

export function ReadsPanel({ rows }: { rows: ClientReads[] }) {
  if (!rows.length) return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Todavía no hay clientes.</p>;

  // los que menos leyeron, primero: son los que hay que mirar
  const orden = [...rows].sort((a, b) => a.read / (a.total || 1) - b.read / (b.total || 1));

  return (
    <ul className="reads-list">
      {orden.map((r) => {
        const pct = r.total ? Math.round((100 * r.read) / r.total) : 0;
        const frio = r.read === 0;
        return (
          <li key={r.clientId} className="reads-row">
            <div className="reads-head">
              <span className="reads-name">{r.name}</span>
              <span className="reads-count" style={frio ? { color: "var(--warn)" } : undefined}>
                {r.read} de {r.total}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: frio ? "var(--warn)" : undefined }}
              />
            </div>
            <p className="reads-meta">
              {r.lastReadAt ? (
                <>
                  <Eye size={12} strokeWidth={2} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Última: {fmtFechaCorta(r.lastReadAt)} · {r.lastTitle}
                </>
              ) : (
                "Nunca abrió una lección"
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
