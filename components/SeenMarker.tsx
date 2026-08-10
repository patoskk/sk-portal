"use client";
import { useEffect } from "react";

export const NOVEDADES_SEEN_KEY = "novedades-vistas";

/**
 * Registra en el navegador la novedad más reciente que el cliente ya vio, para
 * apagar el punto del sidebar.
 *
 * Va en localStorage y no en la base a propósito: es una señal de interfaz, no
 * un dato del negocio. No justifica una tabla, ni un viaje al servidor, ni que
 * se pierda el punto en un dispositivo porque lo miró en otro.
 */
export function SeenMarker({ latest }: { latest: string | null }) {
  useEffect(() => {
    if (!latest) return;
    try {
      localStorage.setItem(NOVEDADES_SEEN_KEY, latest);
      // el sidebar ya está montado: se le avisa para que apague el punto ahora
      window.dispatchEvent(new CustomEvent("novedades-vistas", { detail: latest }));
    } catch {}
  }, [latest]);
  return null;
}
