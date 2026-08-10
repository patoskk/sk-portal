"use client";
import { useState } from "react";
import { Download } from "lucide-react";

// Abre la vista de impresión del reporte en una pestaña nueva. Ahí, un script
// dispara el diálogo del navegador y el cliente elige "Guardar como PDF".
//
// Por qué no generamos el PDF en el servidor: haría falta Chromium en la función
// serverless de Vercel (pesado y frágil). Así, además, lo que se imprime es
// exactamente lo que se ve.
export function PrintLink({ href }: { href: string }) {
  const [clicked, setClicked] = useState(false);
  return (
    <a
      className="btn btn-outline btn-sm"
      href={`${href}&print=1`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setClicked(true)}
      title="Se abre la vista de impresión: elegí «Guardar como PDF»"
    >
      <Download size={15} strokeWidth={1.9} />
      {clicked ? "Abriendo…" : "Descargar PDF"}
    </a>
  );
}
