// Sección "Recomendá y ganá" — programa de referidos (estático, al final del dashboard).
// Cambiá CONTACT_WHATSAPP por el número real (formato internacional sin +, ej. 549351...).
const CONTACT_WHATSAPP = "5490000000000";

export function ReferralCard() {
  const waLink =
    `https://wa.me/${CONTACT_WHATSAPP}?text=` +
    encodeURIComponent("¡Hola! Quiero recomendar a alguien para el servicio de SK Optimal.");

  return (
    <section
      style={{
        marginTop: 22,
        borderRadius: 16,
        padding: "26px 28px",
        background: "linear-gradient(135deg, var(--accent-dark), var(--accent))",
        color: "#fff",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, opacity: 0.9 }}>
        RECOMENDÁ Y GANÁ
      </div>
      <h2 style={{ margin: "8px 0 10px", fontSize: 24, lineHeight: 1.15 }}>
        Recomendá SK Optimal y ahorrá los dos.
      </h2>
      <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, maxWidth: 640, opacity: 0.95 }}>
        Si recomendás a alguien y contrata el servicio:{" "}
        <strong>vos te llevás 50% de descuento en tu fee mensual durante 2 meses</strong> y tu
        referido arranca con <strong>20% off en su instalación inicial</strong>.
      </p>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          background: "#fff",
          color: "var(--accent-dark)",
          fontWeight: 700,
          fontSize: 14,
          padding: "11px 20px",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        Quiero recomendar →
      </a>
    </section>
  );
}
