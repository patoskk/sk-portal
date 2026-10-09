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
        <div className="empty-icon" style={{ margin: "0 auto 12px", color: "var(--warn-ink)", background: "var(--warn-soft)" }}>
          <AlertTriangle size={22} strokeWidth={1.9} />
        </div>
        <h1 style={{ fontSize: 24, margin: "0 0 6px" }}>No pudimos cargar esta página</h1>
        <p style={{ color: "var(--ink-soft)", margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.5 }}>
          Es un problema de nuestro lado, no algo que hayas hecho. Intentá de nuevo; si continúa,
          avisanos y lo resolvemos.
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
