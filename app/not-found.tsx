import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div className="wordmark" style={{ marginBottom: 18 }}>
          <span className="sk">SK</span> <span className="op">OPTIMAL</span>
        </div>
        <div className="empty-icon" style={{ margin: "0 auto 12px" }}>
          <Compass size={22} strokeWidth={1.9} />
        </div>
        <h1 style={{ fontSize: 20, margin: "0 0 6px" }}>Esta página no existe</h1>
        <p style={{ color: "var(--ink-soft)", margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.5 }}>
          Puede que el enlace haya cambiado. Desde el panel llegás a todo.
        </p>
        <Link className="btn btn-solid" href="/dashboard">
          Ir al panel
        </Link>
      </div>
    </main>
  );
}
