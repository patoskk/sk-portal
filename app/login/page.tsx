"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
    // dejamos loading=true: el overlay queda hasta que navega
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

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
      <div className="card" style={{ width: 380, maxWidth: "100%", minHeight: 320 }}>
        <div className="wordmark" style={{ marginBottom: 18 }}>
          <span className="sk">SK</span> <span className="op">OPTIMAL</span>
        </div>

        {loading ? (
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
        ) : (
          <>
            <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Tu portal de métricas</h1>
            <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Ingresá con tu correo y contraseña.</p>
            <form onSubmit={onSubmit}>
              <input type="email" required placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
              <input type="password" required placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "11px 13px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Ingresar
              </button>
              {error && <p style={{ color: "var(--warn)", marginBottom: 0 }}>{error}</p>}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
