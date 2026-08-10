// Página "Beneficios" — lo que el cliente tiene disponible por ser cliente:
// consultoría (servicio exclusivo) y el programa de referidos. Se separó del
// Panel a propósito: el dashboard es dato operativo, esto es oferta comercial;
// mezclarlos le bajaba credibilidad al reporte.
import type { Metadata } from "next";
import { ConsultingCard } from "@/components/ConsultingCard";
import { ReferralCard } from "@/components/ReferralCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Beneficios" };

export default function BeneficiosPage() {
  return (
    <main className="page" id="contenido">
      <div className="page-head">
        <h1 className="page-title">Beneficios de ser cliente</h1>
        <p className="page-sub" style={{ maxWidth: 720 }}>
          Servicios y ventajas reservados a las empresas que ya trabajan con nosotros.
        </p>
      </div>

      <ConsultingCard />
      <ReferralCard />
    </main>
  );
}
