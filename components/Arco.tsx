// El arco del isotipo como viñeta: un recurso que solo tiene SK, en vez de la
// raya larga ("—") que había, que es de lo que más delata un texto hecho con IA
// (carruseles/reference/diseno-sin-vibra-ia.md). Toma el color del texto
// (currentColor) salvo que se le pase otro.
export function Arco({ size = 13, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={Math.round(size * 0.8)}
      height={size}
      viewBox="0 0 12 15"
      fill="none"
      style={{ flex: "none", color }}
    >
      <path d="M2 15 V7 a4 4 0 0 1 8 0 V15" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}
