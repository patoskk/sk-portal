"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LessonForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set("mode", mode);
    const res = await fetch("/api/admin/lessons", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Lección publicada ✓" });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const t = await res.text();
      setMsg({ ok: false, text: "Error: " + t });
    }
  }

  const field = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: 9,
    fontSize: 14,
    marginBottom: 12,
    background: "var(--card)",
    color: "var(--ink)",
  } as const;

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 620 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Publicar una lección</h3>

      <label style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Título</label>
      <input name="title" required placeholder="Cómo usar IA para responder más rápido" style={field} />

      <label style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Resumen (opcional)</label>
      <textarea name="summary" rows={2} placeholder="Una línea de qué trata." style={{ ...field, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
        {(["file", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 9,
              border: `1px solid ${mode === m ? "var(--accent)" : "var(--line)"}`,
              background: mode === m ? "var(--tint)" : "transparent",
              color: "var(--ink)",
              fontWeight: mode === m ? 700 : 400,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {m === "file" ? "Subir archivo (PDF/HTML)" : "Pegar link"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <input name="file" type="file" accept=".pdf,.html,.htm" required style={field} />
      ) : (
        <input name="url" type="url" required placeholder="https://..." style={field} />
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 14 }}>
        <input type="checkbox" name="global" defaultChecked /> Visible para todos los clientes
      </label>

      <button
        type="submit"
        disabled={busy}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: 0,
          borderRadius: 9,
          padding: "11px 20px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {busy ? "Publicando…" : "Publicar"}
      </button>

      {msg && (
        <p style={{ marginBottom: 0, color: msg.ok ? "var(--accent-dark)" : "var(--warn)" }}>{msg.text}</p>
      )}
    </form>
  );
}
