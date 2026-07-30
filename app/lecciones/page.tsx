import { getLessons } from "@/lib/data/lessons";
import { isAdmin } from "@/lib/data/role";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";

export const dynamic = "force-dynamic";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MES[Number(m) - 1]} ${y}`;
}
function esNueva(iso: string): boolean {
  return Date.now() - Date.parse(iso) < 7 * 86400000;
}

export default async function LeccionesPage() {
  const [lessons, admin] = await Promise.all([getLessons(), isAdmin()]);

  return (
    <main className="page">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <Nav isAdmin={admin} />
        </div>
        <SettingsMenu />
      </header>

      <h1 className="page-title" style={{ marginBottom: 6 }}>Lecciones de IA</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 24 }}>
        Material que preparamos para que aproveches al máximo la inteligencia artificial en tu negocio.
      </p>

      {lessons.length === 0 ? (
        <div className="card" style={{ color: "var(--ink-soft)" }}>
          Todavía no hay lecciones publicadas. Pronto vas a ver acá las lecturas que te vayamos enviando.
        </div>
      ) : (
        <section className="lessons-list">
          {lessons.map((l, i) => (
            <a
              key={l.id}
              className="lesson-row"
              href={`/api/lessons/${l.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="lesson-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="lesson-body">
                <h3 className="lesson-title">
                  {l.title}
                  {esNueva(l.published_at) ? <span className="lesson-new">Nueva</span> : null}
                </h3>
                {l.summary ? <p className="lesson-summary">{l.summary}</p> : null}
                {l.why.length ? (
                  <ul className="lesson-why">
                    {l.why.map((w, k) => (
                      <li key={k}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="lesson-meta">
                  {fmtFecha(l.published_at)}
                  {l.readMinutes ? ` · ${l.readMinutes} min de lectura` : ""}
                </p>
              </div>
              <span className="lesson-cta">Leer →</span>
            </a>
          ))}
        </section>
      )}
    </main>
  );
}
