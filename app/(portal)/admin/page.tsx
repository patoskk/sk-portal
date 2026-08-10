import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/data/role";
import { getLessonsForAdmin } from "@/lib/data/lessons";
import { getUpdatesForAdmin } from "@/lib/data/updates";
import { getClients } from "@/lib/data/clients";
import { UpdateForm } from "@/components/UpdateForm";
import { UpdatesAdminList } from "@/components/UpdatesAdminList";
import { LessonForm } from "@/components/LessonForm";
import { LessonsAdminList } from "@/components/LessonsAdminList";
import { ClientForm } from "@/components/ClientForm";
import { ClientsAdminList } from "@/components/ClientsAdminList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  // el gate corre en paralelo con los datos: si no es admin, redirect y
  // lo consultado se descarta (getClients usa service role, pero acá nunca
  // llega a renderizarse para un no-admin)
  const [role, lessons, clients, updates] = await Promise.all([
    getCurrentRole(),
    getLessonsForAdmin(),
    getClients(),
    getUpdatesForAdmin(),
  ]);
  if (role !== "admin") redirect("/dashboard");

  return (
    <main className="page" id="contenido">
      <div className="page-head">
        <h1 className="page-title">Administración</h1>
      </div>

      <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Clientes</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 16 }}>
        Agregá un cliente (su tabla vive en tu proyecto de Supabase). Se crea, se calcula y queda listo.
      </p>
      <div className="admin-grid" style={{ marginBottom: 40 }}>
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
      <div className="admin-grid" style={{ marginBottom: 40 }}>
        <LessonForm />
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Publicadas ({lessons.length})</h3>
          <LessonsAdminList lessons={lessons} />
        </div>
      </div>

      <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Novedades</h2>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 16 }}>
        Lo que le fuiste haciendo al agente. Es lo que hace visible el trabajo del mes: sin esto, el
        cliente ve los números pero no se entera de qué mejoraste.
      </p>
      <div className="admin-grid">
        <UpdateForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Publicadas ({updates.length})</h3>
          <UpdatesAdminList updates={updates} clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
    </main>
  );
}
