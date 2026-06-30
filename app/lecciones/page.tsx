import { getLessons } from "@/lib/data/lessons";
import { isAdmin } from "@/lib/data/role";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function LeccionesPage() {
  const lessons = await getLessons();
  const admin = await isAdmin();

  return (
    <main style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <Nav isAdmin={admin} />
        </div>
        <SettingsMenu />
      </header>

      <h1 style={{ fontSize: 34, margin: "0 0 6px", letterSpacing: "-.4px" }}>Lecciones de IA</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 24 }}>
        Material que preparamos para que aproveches al máximo la inteligencia artificial en tu negocio.
      </p>

      {lessons.length === 0 ? (
        <div className="card" style={{ color: "var(--ink-soft)" }}>
          Todavía no hay lecciones publicadas. Pronto vas a ver acá las lecturas que te vayamos enviando.
        </div>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {lessons.map((l) => (
            <article key={l.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{formatDate(l.published_at)}</div>
              <h3 style={{ margin: 0, fontSize: 17 }}>{l.title}</h3>
              {l.summary ? (
                <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14, flex: 1 }}>{l.summary}</p>
              ) : null}
              {l.url ? (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-dark)", fontWeight: 700, fontSize: 14, textDecoration: "none", marginTop: 4 }}
                >
                  Leer →
                </a>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
