import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal · SK Optimal",
  description: "Métricas en vivo de tu agente de IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
