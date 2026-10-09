// Logo oficial de SK Optimal. Antes el portal escribía "SK OPTIMAL" con la letra
// del sistema, que no es el logo. Las imágenes de public/marca están recortadas de
// "Logo y Nombre sin fondo - para fondo claro/oscuro" (AIMA\Logos y Posts\Logos\
// Nuevos), la versión recoloreada a la paleta Noche: verde #4AB39F, "SK" en noche
// sobre claro y en blanco sobre oscuro.
//
// Van las dos versiones y el CSS (globals.css, .logo-on-*) muestra la del tema:
// así sigue al tema oscuro y a la impresión sin JS de por medio.

// proporción ancho/alto de cada recorte (public/marca/*.png, 96 px de alto)
const RATIO = { logo: 437 / 96, isotipo: 61 / 96 } as const;

export function Logo({ height = 28, mark = false }: { height?: number; /** solo el isotipo */ mark?: boolean }) {
  const name = mark ? "isotipo" : "logo";
  const width = Math.round(height * RATIO[name]);
  return (
    <span className="logo" style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-on-light" src={`/marca/${name}-claro.png`} alt="SK Optimal" width={width} height={height} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-on-dark" src={`/marca/${name}-oscuro.png`} alt="SK Optimal" width={width} height={height} />
    </span>
  );
}
