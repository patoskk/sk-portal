import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/data/role";
import { getLessons } from "@/lib/data/lessons";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";
import { LessonForm } from "@/components/LessonForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");
  const lessons = await getLessons();

  return (
    <main style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 24px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div className="wordmark">
            <span className="sk">SK</span> <span className="op">OPTIMAL</span>
          </div>
          <Nav isAdmin />
        </div>
        <SettingsMenu />
      </header>

      <h1 style={{ fontSize: 30, margin: "0 0 6px" }}>Administración</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 24 }}>
        Publicá lecciones para tus clientes. Las globales las ven todos.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "620px 1fr", gap: 24, alignItems: "start" }}>
        <LessonForm />
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Publicadas ({lessons.length})</h3>
          {lessons.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Todavía ninguna.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {lessons.map((l) => (
                <li key={l.id} style={{ marginBottom: 6, fontSize: 13.5 }}>
                  {l.title}
                  <a href={`/api/lessons/${l.id}/view`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-dark)", marginLeft: 6 }}>
                    ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
