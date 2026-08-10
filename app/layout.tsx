import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Se descarga en build y se sirve desde nuestro dominio: sin CDN en runtime y
// sin salto de layout al cargar (fallback ajustado por next/font).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
