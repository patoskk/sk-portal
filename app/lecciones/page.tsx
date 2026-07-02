import { getLessons } from "@/lib/data/lessons";
import { isAdmin } from "@/lib/data/role";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";

export const dynamic = "force-dynamic";

export default async function LeccionesPage() {
  const lessons = await getLessons();
  const admin = await isAdmin();

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
            <article key={l.id} className="lesson-row">
              <span className="lesson-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="lesson-body">
                <h3 className="lesson-title">{l.title}</h3>
                {l.summary ? <p className="lesson-summary">{l.summary}</p> : null}
              </div>
              <a
                className="lesson-cta"
                href={`/api/lessons/${l.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Leer →
              </a>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
