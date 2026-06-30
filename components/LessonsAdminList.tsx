"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface L {
  id: string;
  title: string;
  summary: string | null;
}

export function LessonsAdminList({ lessons }: { lessons: L[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(l: L) {
    setEditing(l.id);
    setTitle(l.title);
    setSummary(l.summary ?? "");
  }

  async function save(id: string) {
    setBusy(true);
    await fetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, summary }),
    });
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta lección? No se puede deshacer.")) return;
    setBusy(true);
    await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const field = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 13.5,
    marginBottom: 8,
    background: "var(--card)",
    color: "var(--ink)",
  } as const;
  const link = { fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "none", border: 0, padding: 0 };

  if (!lessons.length) return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Todavía ninguna.</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {lessons.map((l) => (
        <li key={l.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          {editing === l.id ? (
            <div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={field} placeholder="Título" />
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} style={{ ...field, resize: "vertical" }} placeholder="Resumen" />
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => save(l.id)} disabled={busy} style={{ ...link, color: "var(--accent-dark)" }}>Guardar</button>
                <button onClick={() => setEditing(null)} style={{ ...link, color: "var(--ink-soft)" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{l.title}</span>
                <a href={`/api/lessons/${l.id}/view`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-dark)", fontSize: 13 }}>↗</a>
              </div>
              {l.summary ? <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{l.summary}</div> : null}
              <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                <button onClick={() => startEdit(l)} style={{ ...link, color: "var(--accent-dark)" }}>Editar</button>
                <button onClick={() => remove(l.id)} disabled={busy} style={{ ...link, color: "var(--warn)" }}>Eliminar</button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
