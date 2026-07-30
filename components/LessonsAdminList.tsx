"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotifyPanel } from "./NotifyPanel";

interface L {
  id: string;
  title: string;
  summary: string | null;
  notified_at?: string | null;
  notified?: { sent: number; queued: number; error: number };
}

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFechaCorta(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MES[d.getMonth()]}`;
}

export function LessonsAdminList({ lessons }: { lessons: L[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function startEdit(l: L) {
    setEditing(l.id);
    setTitle(l.title);
    setSummary(l.summary ?? "");
    setErrMsg(null);
  }

  async function save(id: string) {
    setBusy(true);
    setErrMsg(null);
    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, summary }),
    });
    setBusy(false);
    if (!res.ok) {
      setErrMsg("Error al guardar: " + (await res.text()));
      return; // queda en modo edición para reintentar
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta lección? No se puede deshacer.")) return;
    setBusy(true);
    setErrMsg(null);
    const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setErrMsg("Error al eliminar: " + (await res.text()));
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
    <>
    {errMsg ? <p style={{ color: "var(--warn)", fontSize: 12.5, marginTop: 0 }}>{errMsg}</p> : null}
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
              {l.notified_at ? (
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                  ✓ Avisado el {fmtFechaCorta(l.notified_at)}
                  {l.notified
                    ? ` · ${l.notified.sent} entregado${l.notified.sent === 1 ? "" : "s"}` +
                      (l.notified.queued ? `, ${l.notified.queued} en curso` : "") +
                      (l.notified.error ? `, ${l.notified.error} con error` : "")
                    : ""}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <button onClick={() => startEdit(l)} style={{ ...link, color: "var(--accent-dark)" }}>Editar</button>
                <button
                  onClick={() => setNotifying(notifying === l.id ? null : l.id)}
                  style={{ ...link, color: "var(--accent-dark)" }}
                >
                  {l.notified_at ? "Reenviar aviso" : "Avisar por mail"}
                </button>
                <button onClick={() => remove(l.id)} disabled={busy} style={{ ...link, color: "var(--warn)" }}>Eliminar</button>
              </div>
              {notifying === l.id ? (
                <NotifyPanel
                  lessonId={l.id}
                  lessonTitle={l.title}
                  yaAvisado={Boolean(l.notified_at)}
                  onClose={() => setNotifying(null)}
                />
              ) : null}
            </div>
          )}
        </li>
      ))}
    </ul>
    </>
  );
}
