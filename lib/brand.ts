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
export const USAGE_COLORS = [
  BRAND.accent,
  BRAND.accentSoft,
  BRAND.gold,
  BRAND.grey,
  BRAND.accentDark,
];

// Embudo: del más claro (entraron) al más oscuro (pedido), como en el reporte.
export const FUNNEL_COLORS = [BRAND.accentSoft, BRAND.accent, BRAND.accentDark];
