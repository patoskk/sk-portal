// Programa de referidos (estático, al final de /beneficios). Bloque verde
// profundo plano: sigue al de Consultoría (noche) sin repetir el mismo fondo.
// El número de contacto vive en lib/contact.ts.
import { ArrowRight } from "lucide-react";
import { waLink as wa } from "@/lib/contact";

export function ReferralCard() {
  const waLink = wa("¡Hola! Quiero recomendar a alguien para el servicio de SK Optimal.");

  return (
    <section className="offer offer-referral">
      <div className="offer-top">
        <span className="offer-eyebrow">Programa de referidos</span>
      </div>
      <h2 className="offer-title">
        Recomendá SK Optimal y obtené <em>beneficios</em>.
      </h2>
      <p className="offer-text">
        Si recomendás a alguien y contrata el servicio,{" "}
        <strong>tenés un 50% de descuento en tu cuota mensual durante 2 meses</strong>, y la persona
        que recomendaste <strong>empieza con un 20% de descuento en la implementación</strong>.
      </p>
      <p className="offer-note">
        Sin límite: <strong>cada</strong> recomendación que contrata vuelve a sumar el beneficio.
      </p>
      <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-solid offer-cta">
        Quiero recomendar <ArrowRight size={16} strokeWidth={2.2} />
      </a>
    </section>
  );
}
