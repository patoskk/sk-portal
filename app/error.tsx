"use client";
// Cualquier error no manejado del servidor caía en la pantalla cruda de Next.
// Esto lo reemplaza por algo con la marca y una salida clara.
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        <div className="empty-icon" style={{ margin: "0 auto 12px", color: "var(--warn)", background: "rgba(178,91,78,.12)" }}>
          <AlertTriangle size={22} strokeWidth={1.9} />
        </div>
        <h1 style={{ fontSize: 20, margin: "0 0 6px" }}>Algo se rompió de nuestro lado</h1>
        <p style={{ color: "var(--ink-soft)", margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.5 }}>
          No es nada que hayas hecho mal. Probá de nuevo; si sigue pasando, avisanos y lo miramos.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn-solid" onClick={reset}>
            Reintentar
          </button>
          <a className="btn btn-outline" href="/dashboard">
            Ir al panel
          </a>
        </div>
        {error.digest ? (
          <p style={{ color: "var(--ink-soft)", fontSize: 11, marginTop: 16, marginBottom: 0 }}>
            Código de error: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
