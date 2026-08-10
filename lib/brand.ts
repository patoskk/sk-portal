// Paleta de marca SK Optimal para gráficos (Recharts). Espejo de la constante `C`
// y de USAGE_COLORS de los templates de metrics-pdf-report. No inventar colores.

export const BRAND = {
  paper: "#F2F4F3",
  card: "#FFFFFF",
  accent: "#3DA08C",
  accentDark: "#2C7C6C",
  accentSoft: "#8FC9BD",
  tint: "#EAF3EF",
  ink: "#16221F",
  inkSoft: "#5C6B66",
  line: "#E4E2DD",
  gold: "#C2A36B",
  grey: "#C9C9C4",
  warn: "#B25B4E", // quiebres / pérdida
} as const;

// Orden del donut de uso: [Precio/stock, Promos, Imágenes, Pedidos, ...]
// 6 tonos de la marca antes de repetir (agentes con muchas tools).
//
// El ORDEN no es estético: en un donut los colores contiguos son los que hay que
// poder distinguir. El orden viejo dejaba juntos accentSoft y gold (ΔE 12,7: se
// confunden incluso con visión de color normal) y warn con accentDark (ΔE 5,0
// con protanopía). Este orden los separa — mismos colores de marca, otra
// secuencia. Si agregás o movés uno, revalidalo antes de commitear:
//   node <skills>/dataviz/scripts/validate_palette.js "<hex,hex,…>" --mode light --surface "#FFFFFF"
export const USAGE_COLORS = [
  BRAND.accent,
  BRAND.gold,
  BRAND.accentDark,
  BRAND.accentSoft,
  BRAND.warn,
  BRAND.grey,
];
