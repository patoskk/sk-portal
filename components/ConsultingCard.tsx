// Sección "Consultoría" — servicio high-ticket para clientes actuales (estático,
// va justo arriba de ReferralCard). A propósito NO usa el gradiente teal de los
// referidos: fondo ink fijo + acento oro para que se lea como el escalón premium
// y no como otra promo. Fondo fijo en ambos temas (el texto es siempre blanco).
import { waLink as wa } from "@/lib/contact";

const SERVICIOS = [
  {
    title: "Software a medida",
    text: "Sistemas internos construidos para cómo trabaja tu empresa, no al revés.",
  },
  {
    title: "Automatización de procesos",
    text: "Pedidos, stock, facturación, reportes: lo repetitivo deja de ocupar gente.",
  },
  {
    title: "IA adentro de la empresa",
    text: "Tu equipo trabajando con IA todos los días, con procesos y capacitación.",
  },
  {
    title: "Marketing con IA",
    text: "Videos UGC, piezas de producto y campañas producidas sin set ni productora.",
  },
];

export function ConsultingCard() {
  const waLink = wa(
    "¡Hola! Soy cliente de SK Optimal y quiero saber más sobre el servicio de consultoría."
  );

  return (
    <section
      style={{
        marginTop: 22,
        borderRadius: 16,
        padding: "30px 28px",
        background:
          "radial-gradient(120% 140% at 100% 0%, rgba(61,160,140,.22) 0%, rgba(61,160,140,0) 55%), linear-gradient(135deg, #101A18 0%, #1B2C27 100%)",
        border: "1px solid rgba(143, 201, 189, .18)",
        color: "#fff",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--accent-soft)" }}>
          CONSULTORÍA
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: "var(--gold)",
            border: "1px solid rgba(194, 163, 107, .45)",
            borderRadius: 99,
            padding: "3px 9px",
          }}
        >
          Exclusivo para clientes
        </span>
      </div>

      <h2 style={{ margin: "10px 0 10px", fontSize: 25, lineHeight: 1.15, letterSpacing: "-.3px" }}>
        Lo que ya automatizamos en tu atención, lo podemos hacer en toda tu empresa.
      </h2>

      <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.6, maxWidth: 740, opacity: 0.88 }}>
        Tu agente es la punta del iceberg. Entramos a tu operación, encontramos dónde se pierde
        plata y tiempo, y lo resolvemos con tecnología propia. No vendemos herramientas sueltas:
        somos tu socio de IA.
      </p>

      <div className="consulting-grid">
        {SERVICIOS.map((s) => (
          <div
            key={s.title}
            style={{
              background: "rgba(255, 255, 255, .05)",
              border: "1px solid rgba(255, 255, 255, .09)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>
              <span style={{ color: "var(--accent-soft)", marginRight: 8 }}>—</span>
              {s.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.72 }}>{s.text}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: "20px 0 18px", fontSize: 13.5, lineHeight: 1.55, maxWidth: 680, opacity: 0.8 }}>
        Tomamos <strong>pocos proyectos por vez</strong> y cada uno se diseña de cero. Por eso la
        consultoría está reservada a empresas que ya trabajan con nosotros.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="referral-cta"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            padding: "11px 20px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Quiero saber más →
        </a>
        <span style={{ fontSize: 12.5, opacity: 0.65 }}>
          Contanos qué querés resolver y te decimos si es para vos.
        </span>
      </div>
    </section>
  );
}
