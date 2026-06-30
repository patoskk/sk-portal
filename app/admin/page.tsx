import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/data/role";
import { getLessons } from "@/lib/data/lessons";
import { getClients } from "@/lib/data/clients";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";
import { LessonForm } from "@/components/LessonForm";
import { LessonsAdminList } from "@/components/LessonsAdminList";
import { ClientForm } from "@/components/ClientForm";
import { ClientsAdminList } from "@/components/ClientsAdminList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");
  const lessons = await getLessons();
  const clients = await getClients();

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

      <h1 style={{ fontSize: 30, margin: "0 0 24px" }}>Administración</h1>

      <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Clientes</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 16 }}>
        Agregá un cliente (su tabla vive en tu proyecto de Supabase). Se crea, se calcula y queda listo.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "620px 1fr", gap: 24, alignItems: "start", marginBottom: 40 }}>
        <ClientForm />
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Clientes ({clients.length})</h3>
          <ClientsAdminList clients={clients} />
        </div>
      </div>

      <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Lecciones</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 16 }}>
        Publicá material de IA. Las globales las ven todos los clientes.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "620px 1fr", gap: 24, alignItems: "start" }}>
        <LessonForm />
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Publicadas ({lessons.length})</h3>
          <LessonsAdminList lessons={lessons} />
        </div>
      </div>
    </main>
  );
}
