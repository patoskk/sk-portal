"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mensajes de Supabase auth traducidos (el público es no técnico).
function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo todavía no está confirmado.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  if (m.includes("network") || m.includes("fetch")) return "No pudimos conectarnos. Revisá tu internet e intentá de nuevo.";
  return "No pudimos ingresar. Verificá tus datos e intentá de nuevo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "reset" | "reset-sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(traducirError(error.message));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
    // dejamos loading=true: el overlay queda hasta que navega
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Escribí tu correo para enviarte el enlace.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/update-password`,
    });
    setLoading(false);
    if (error) {
      setError(traducirError(error.message));
      return;
    }
    setMode("reset-sent");
  }

  const field = {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 12,
    background: "var(--card)",
    color: "var(--ink)",
  } as const;

  const btn = {
    width: "100%",
    padding: "11px 13px",
    background: "var(--accent)",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
  } as const;

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100dvh",
        padding: 24,
        // fondo con un respiro de marca, sin competir con la tarjeta
        background:
          "radial-gradient(900px 500px at 15% -10%, var(--tint), transparent 60%), radial-gradient(700px 420px at 110% 110%, var(--tint), transparent 55%)",
      }}
    >
      {/* width 100% + maxWidth: en un grid auto, maxWidth:"100%" no clampa y desborda en mobile */}
      <div
        className="card"
        style={{ width: "100%", maxWidth: 380, minHeight: 320, borderTop: "3px solid var(--accent)" }}
      >
        <div className="wordmark" style={{ marginBottom: 18 }}>
          <span className="sk">SK</span> <span className="op">OPTIMAL</span>
        </div>

        {loading && mode === "login" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0 36px", gap: 22 }}>
            <div>
              <span className="bounce-dot" style={{ animationDelay: "0s" }} />
              <span className="bounce-dot" style={{ animationDelay: ".15s" }} />
              <span className="bounce-dot" style={{ animationDelay: ".3s" }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
              Ingresando<span className="dots" />
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Preparando tu portal…</div>
          </div>
        ) : mode === "reset-sent" ? (
          <>
            <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Revisá tu correo</h1>
            <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
              Si <strong>{email}</strong> está registrado, te enviamos un enlace para crear una contraseña nueva.
            </p>
            <button type="button" onClick={() => setMode("login")} style={{ ...btn, marginTop: 8 }} className="btn-primary">
              Volver al ingreso
            </button>
          </>
        ) : mode === "reset" ? (
          <>
            <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Recuperar contraseña</h1>
            <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Te enviamos un enlace a tu correo.</p>
            <form onSubmit={onReset}>
              <input type="email" required placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} style={field} autoComplete="email" />
              <button type="submit" className="btn-primary" style={btn} disabled={loading}>
                {loading ? "Enviando…" : "Enviarme el enlace"}
              </button>
              {error && <p style={{ color: "var(--warn)", marginBottom: 0 }}>{error}</p>}
            </form>
            <button type="button" onClick={() => { setMode("login"); setError(null); }} style={{ background: "none", border: 0, padding: 0, marginTop: 14, color: "var(--ink-soft)", fontSize: 13, cursor: "pointer" }}>
              ← Volver al ingreso
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Tu portal de métricas</h1>
            <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Ingresá con tu correo y contraseña.</p>
            <form onSubmit={onSubmit}>
              <input type="email" required placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} style={field} autoComplete="email" />
              <input type="password" required placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={field} autoComplete="current-password" />
              <button type="submit" className="btn-primary" style={btn}>
                Ingresar
              </button>
              {error && <p style={{ color: "var(--warn)", marginBottom: 0 }}>{error}</p>}
            </form>
            <button type="button" onClick={() => { setMode("reset"); setError(null); }} style={{ background: "none", border: 0, padding: 0, marginTop: 14, color: "var(--accent-dark)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </>
        )}
        <p
          style={{
            margin: "22px 0 0",
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
            fontSize: 11.5,
            color: "var(--ink-soft)",
            textAlign: "center",
          }}
        >
          Portal de clientes de SK Optimal · métricas de tu agente de IA
        </p>
      </div>
    </main>
  );
}
