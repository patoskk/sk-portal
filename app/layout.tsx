import type { Metadata, Viewport } from "next";
import "./globals.css";

// La letra de la marca (carruseles/assets/marca/marca.json) son los mismos .woff2
// de las skills, en public/fuentes, declarados con @font-face en globals.css. No
// van por next/font a propósito: la lección se lee en un iframe aislado que
// también los necesita (ver lib/lessonEmbed.ts y next.config.mjs), y así hay UNA
// sola copia. Se precargan las dos que se ven primero: el texto y los títulos.
const PRECARGA = ["/fuentes/alegreya-sans-400.woff2", "/fuentes/alegreya-800.woff2"];

export const metadata: Metadata = {
  title: {
    default: "Portal · SK Optimal",
    template: "%s · SK Optimal",
  },
  description: "Métricas en vivo de tu agente de IA",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Tema y estado del sidebar aplicados ANTES de pintar: sin esto, recargar en
// modo oscuro (o con la barra contraída) muestra un flash del estado anterior.
const PREPAINT = `(function(){try{var d=document.documentElement;
d.dataset.theme=localStorage.getItem('theme')||'light';
d.dataset.sidebar=localStorage.getItem('sidebar')||'full';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
        {PRECARGA.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
