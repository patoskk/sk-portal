// Página "Beneficios" — lo que el cliente tiene disponible por ser cliente:
// consultoría (servicio exclusivo) y el programa de referidos. Se separó del
// Panel a propósito: el dashboard es dato operativo, esto es oferta comercial;
// mezclarlos le bajaba credibilidad al reporte.
import { isAdmin } from "@/lib/data/role";
import { Nav } from "@/components/Nav";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ConsultingCard } from "@/components/ConsultingCard";
import { ReferralCard } from "@/components/ReferralCard";

export const dynamic = "force-dynamic";

export default async function BeneficiosPage() {
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

      <h1 className="page-title" style={{ marginBottom: 6 }}>Beneficios de ser cliente</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: 4, maxWidth: 720 }}>
        Servicios y ventajas reservados a las empresas que ya trabajan con nosotros.
      </p>

      <ConsultingCard />
      <ReferralCard />
    </main>
  );
}
