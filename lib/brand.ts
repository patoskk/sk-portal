// Paleta de marca SK Optimal para lo que se pinta desde JS (gráficos de Recharts y
// los mails). Es la paleta "Noche" de ~/.claude/skills/carruseles/assets/marca/
// marca.json, la fuente única: si cambia un color, cambia allá primero.
// marca-check.mjs revisa este archivo junto con el resto del portal.

export const BRAND = {
  paper: "#F2F4F5", // niebla
  card: "#FFFFFF",
  accent: "#4AB39F", // verde del logo: relleno y acento, nunca texto sobre claro
  accentDark: "#1E7565", // verde texto: links y etiquetas sobre claro
  tint: "#E4F2EF", // verde suave
  ink: "#0A1218", // noche
  inkSoft: "#5B6770",
  line: "#E3E7EA",
  chartSoft: "#D5DBDF", // serie de fondo de un gráfico en tema claro
  warn: "#B25B4E", // SOLO error o pérdida
} as const;

// No hay paleta categórica a propósito. La de la marca es un solo verde más
// grises: probada con dataviz/scripts/validate_palette.js, el gris medio contra
// el verde da ΔE 2,8 con deuteranopía y 9,7 con visión normal (piso: 15), y la
// alerta no se puede usar de "color 5" porque es solo para errores. Por eso el
// uso de herramientas es un ranking de barras de UN color con su número al lado,
// y la hora pico se resalta contra gris (ΔE 21 en claro y oscuro).
