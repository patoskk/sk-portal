// Sección "Consultoría" — servicio high-ticket para clientes actuales (estático,
// va justo arriba de ReferralCard). Bloque NOCHE plano para que se lea como el
// escalón premium y no como otra promo; los referidos van en verde profundo.
// Sin degradés ni resplandores: la marca usa fondos planos (marca.json).
import { ArrowRight } from "lucide-react";
import { waLink as wa } from "@/lib/contact";
import { Arco } from "@/components/Arco";

const SERVICIOS = [
  {
    title: "Software a medida",
    text: "Sistemas internos construidos para cómo trabaja tu empresa, no al revés.",
  },
  {
    title: "Automatización de procesos",
    text: "Pedidos, stock, facturación, reportes: lo repetitivo deja de ocupar a tu equipo.",
  },
  {
    title: "IA dentro de tu empresa",
    text: "Tu equipo trabajando con IA todos los días, con procesos y capacitación.",
  },
  {
    title: "Marketing con IA",
    text: "Videos con formato de testimonio, piezas de producto y campañas, producidos sin set ni productora.",
  },
];

export function ConsultingCard() {
  const waLink = wa(
    "¡Hola! Soy cliente de SK Optimal y quiero saber más sobre el servicio de consultoría."
  );

  return (
    <section className="offer offer-consulting">
      <div className="offer-top">
        <span className="offer-eyebrow">Consultoría</span>
        <span className="offer-tag">Exclusivo para clientes</span>
      </div>

      <h2 className="offer-title">
        Lo que ya automatizamos en tu atención, lo podemos hacer en <em>toda tu empresa</em>.
      </h2>

      <p className="offer-text">
        Tu agente es el primer paso. Analizamos tu operación, encontramos dónde se pierden ventas y
        horas de trabajo, y lo resolvemos con sistemas construidos a medida. No vendemos
        herramientas sueltas: somos tu socio de IA.
      </p>

      <div className="consulting-grid">
        {SERVICIOS.map((s) => (
          <div key={s.title} className="offer-tile">
            <div className="offer-tile-title">
              <Arco />
              {s.title}
            </div>
            <div className="offer-tile-text">{s.text}</div>
          </div>
        ))}
      </div>

      <p className="offer-note">
        Tomamos <strong>pocos proyectos a la vez</strong> y cada uno se diseña desde cero. Por eso la
        consultoría está reservada a empresas que ya trabajan con nosotros.
      </p>

      <div className="row" style={{ gap: 14 }}>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-solid offer-cta">
          Quiero saber más <ArrowRight size={16} strokeWidth={2.2} />
        </a>
        <span className="offer-small">Contanos qué querés resolver y te decimos si es para vos.</span>
      </div>
    </section>
  );
}
