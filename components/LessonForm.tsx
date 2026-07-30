"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotifyPanel } from "./NotifyPanel";

export function LessonForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  // paso 2: recién publicada, lista para avisar por mail
  const [publicada, setPublicada] = useState<{ id: string; title: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("mode", mode);
    const title = String(fd.get("title") ?? "");
    const res = await fetch("/api/admin/lessons", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      const d = (await res.json()) as { id?: string };
      setMsg({ ok: true, text: "Lección publicada ✓" });
      form.reset();
      setFileName(null);
      if (d.id) setPublicada({ id: d.id, title });
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
    <div>
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
        // input nativo escondido (el "Choose File" del browser rompe la estética);
        // sigue siendo enfocable para que la validación required funcione
        <label style={{ ...field, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <span
            style={{
              background: "var(--tint)",
              color: "var(--accent-dark)",
              fontWeight: 700,
              fontSize: 13,
              padding: "6px 14px",
              borderRadius: 7,
              whiteSpace: "nowrap",
            }}
          >
            Elegir archivo
          </span>
          <span
            style={{
              fontSize: 13,
              color: fileName ? "var(--ink)" : "var(--ink-soft)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fileName ?? "PDF o HTML"}
          </span>
          <input
            name="file"
            type="file"
            accept=".pdf,.html,.htm"
            required
            style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      ) : (
        <input name="url" type="url" required placeholder="https://..." style={field} />
      )}

      {/* targeting por cliente: a futuro; por ahora toda lección es global */}
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
        La lección va a ser visible para todos tus clientes.
      </p>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary"
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

    {/* recién publicada: el aviso por mail es un paso aparte y opcional */}
    {publicada ? (
      <NotifyPanel
        lessonId={publicada.id}
        lessonTitle={publicada.title}
        onClose={() => setPublicada(null)}
      />
    ) : null}
    </div>
  );
}
