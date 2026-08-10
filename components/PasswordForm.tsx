"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";

// Cambiar la contraseña desde adentro del portal. Hasta ahora el único camino
// era el flujo de recupero por mail, estando deslogueado.
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
    setState("saving");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setState("idle");
      setError("No pudimos guardarla. Probá de nuevo en un momento.");
      return;
    }
    setPassword("");
    setConfirm("");
    setState("done");
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ maxWidth: 340 }}>
      <Field label="Contraseña nueva">
        <input
          className="input"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setState("idle");
          }}
        />
      </Field>
      <Field label="Repetila">
        <input
          className="input"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setState("idle");
          }}
        />
      </Field>
      <div className="row">
        <Button type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Guardando…" : "Guardar contraseña"}
        </Button>
        {state === "done" ? (
          <span style={{ color: "var(--accent-dark)", fontSize: "var(--fs-md)", fontWeight: 600 }}>
            ✓ Listo, ya quedó cambiada.
          </span>
        ) : null}
      </div>
      {error ? <p style={{ color: "var(--warn)", margin: 0, fontSize: "var(--fs-md)" }}>{error}</p> : null}
    </form>
  );
}
