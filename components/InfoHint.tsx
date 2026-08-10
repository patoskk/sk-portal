"use client";
import { useState } from "react";
import { Info } from "lucide-react";

// Explicación corta de una métrica. "Acciones del agente" no le dice nada a un
// dueño de almacén; esto lo aclara sin ensuciar la tarjeta.
//
// Se abre al pasar el mouse Y al hacer foco/click: en touch no hay hover, y un
// tooltip que solo responde al mouse es un tooltip que la mitad no ve nunca.
export function InfoHint({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  return (
    <span
      className="hint"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="hint-btn"
        aria-label={`Qué significa: ${text}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={13} strokeWidth={2} />
      </button>
      {open ? (
        <span role="tooltip" className="hint-bubble">
          {text}
        </span>
      ) : null}
    </span>
  );
}
