"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Crear contraseña nueva (llega acá desde el enlace del correo, ya con sesión).
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(
        error.message.toLowerCase().includes("session")
          ? "El enlace venció o se abrió en otro navegador. Pedí uno nuevo desde el ingreso."
          : "No pudimos guardar la contraseña. Probá de nuevo.",
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="wordmark" style={{ marginBottom: 18 }}>
          <span className="sk">SK</span> <span className="op">OPTIMAL</span>
        </div>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Creá tu contraseña nueva</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Mínimo 8 caracteres.</p>
        <form onSubmit={onSubmit}>
          <input type="password" required placeholder="contraseña nueva" value={password} onChange={(e) => setPassword(e.target.value)} style={field} autoComplete="new-password" />
          <input type="password" required placeholder="repetila" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} autoComplete="new-password" />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "11px 13px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
          >
            {loading ? "Guardando…" : "Guardar e ingresar"}
          </button>
          {error && <p style={{ color: "var(--warn)", marginBottom: 0 }}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
