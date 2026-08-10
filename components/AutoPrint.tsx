"use client";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

/**
 * Dispara el diálogo de impresión al abrir /reporte?print=1, una sola vez y
 * recién cuando los gráficos ya están pintados (Recharts mide el contenedor
 * después del primer render; imprimir antes deja los recuadros vacíos).
 *
 * El botón queda visible para reimprimir sin recargar — y se oculta al imprimir.
 */
export function AutoPrint({ auto }: { auto: boolean }) {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // dos frames + un margen: alcanza para que ResponsiveContainer mida y dibuje
    const t = setTimeout(() => setListo(true), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!auto || !listo) return;
    window.print();
  }, [auto, listo]);

  return (
    <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()} disabled={!listo}>
      <Printer size={15} strokeWidth={1.9} />
      {listo ? "Imprimir / Guardar como PDF" : "Preparando…"}
    </button>
  );
}
