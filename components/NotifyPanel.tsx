"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Panel de aviso por mail de una lección. Se usa en dos lugares: justo después
// de publicar (dentro de LessonForm) y desde la lista de lecciones publicadas.
// El gate humano es el punto: Claude redacta, acá se edita y se ve el mail REAL
// (el iframe usa el mismo render que el envío) y recién ahí se manda.

interface Props {
  lessonId: string;
  lessonTitle: string;
  yaAvisado?: boolean;
  onClose?: () => void;
}

const field = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--line)",
  borderRadius: 9,
  fontSize: 13.5,
  marginBottom: 10,
  background: "var(--card)",
  color: "var(--ink)",
} as const;

const label = { fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 3 } as const;

export function NotifyPanel({ lessonId, lessonTitle, yaAvisado, onClose }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [summary, setSummary] = useState("");
  const [whyText, setWhyText] = useState("");
  const [html, setHtml] = useState("");
  const [destinatarios, setDestinatarios] = useState<number | null>(null);
  const [salteados, setSalteados] = useState<{ clientName: string; reason: string }[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState<"test" | "real" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const drafted = useRef(false);

  const why = whyText.split("\n").map((l) => l.replace(/^[-·•]\s*/, "").trim()).filter(Boolean);

  const draft = useCallback(async () => {
    setDrafting(true);
    setMsg(null);
    const res = await fetch(`/api/admin/lessons/${lessonId}/draft`, { method: "POST" });
    setDrafting(false);
    if (!res.ok) {
      setMsg({ ok: false, text: "No se pudo redactar: " + (await res.text()) });
      return;
    }
    const d = (await res.json()) as { subject: string; intro: string; summary: string; why: string[] };
    setSubject(d.subject);
    setIntro(d.intro);
    setSummary(d.summary);
    setWhyText((d.why ?? []).join("\n"));
  }, [lessonId]);

  // primer render: pedimos el borrador solo
  useEffect(() => {
    if (drafted.current) return;
    drafted.current = true;
    void draft();
  }, [draft]);

  // Preview con debounce: el iframe muestra el mail tal cual sale.
  // Corre SIEMPRE (aunque el copy esté vacío): esta misma llamada trae la
  // cuenta de destinatarios, y si se salteaba, el panel quedaba clavado en
  // "calculando destinatarios…" cuando la redacción con IA fallaba.
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/lessons/${lessonId}/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intro, summary, why }),
      });
      if (!res.ok) return;
      const d = (await res.json()) as {
        html: string;
        recipients: number;
        skipped: { clientName: string; reason: string }[];
      };
      // sin copy todavía: mostramos los destinatarios pero no un mail vacío
      if (intro || summary) setHtml(d.html);
      setDestinatarios(d.recipients);
      setSalteados(d.skipped ?? []);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, intro, summary, whyText]);

  async function enviar(test: boolean) {
    if (!test) {
      const n = destinatarios ?? 0;
      if (!n) {
        setMsg({ ok: false, text: "No hay destinatarios con avisos activados." });
        return;
      }
      const verbo = yaAvisado ? "REENVIAR el aviso" : "enviar el aviso";
      if (!confirm(`¿Confirmás ${verbo} a ${n} cliente${n === 1 ? "" : "s"}?`)) return;
    }
    setSending(test ? "test" : "real");
    setMsg(null);
    const res = await fetch(`/api/admin/lessons/${lessonId}/notify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, intro, summary, why, test, force: !test && yaAvisado }),
    });
    setSending(null);
    if (!res.ok) {
      setMsg({ ok: false, text: "No se pudo enviar: " + (await res.text()) });
      return;
    }
    const d = (await res.json()) as { queued: number; to?: string; skipped: { clientName: string; reason: string }[] };
    if (test) {
      setMsg({ ok: true, text: `Prueba enviada a ${d.to} — revisá en qué pestaña de Gmail cayó.` });
      return;
    }
    const salteados = d.skipped.length
      ? ` · salteados: ${d.skipped.map((s) => `${s.clientName} (${s.reason})`).join(", ")}`
      : "";
    setMsg({ ok: true, text: `Encolados ${d.queued} mail${d.queued === 1 ? "" : "s"} ✓${salteados}` });
    router.refresh();
  }

  const linkBtn = {
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    background: "none",
    border: 0,
    padding: 0,
  } as const;

  return (
    <div
      className="card"
      style={{ borderTop: "3px solid var(--accent)", marginTop: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>
          Avisar por mail{yaAvisado ? " (reenvío)" : ""}
        </h3>
        {onClose ? (
          <button type="button" onClick={onClose} style={{ ...linkBtn, color: "var(--ink-soft)" }}>
            Cerrar
          </button>
        ) : null}
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--ink-soft)" }}>
        “{lessonTitle}” ·{" "}
        {destinatarios === null
          ? "calculando destinatarios…"
          : `va al mail personal de ${destinatarios} dueño${destinatarios === 1 ? "" : "s"}`}
      </p>
      {salteados.length ? (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--warn)" }}>
          No les llega: {salteados.map((s) => `${s.clientName} (${s.reason})`).join(" · ")}.
          {salteados.some((s) => s.reason.includes("mail del dueño"))
            ? " Cargalo arriba, en Clientes."
            : ""}
        </p>
      ) : (
        <div style={{ height: 8 }} />
      )}

      <div className="notify-grid">
        <div>
          <button
            type="button"
            onClick={() => void draft()}
            disabled={drafting}
            style={{
              ...linkBtn,
              color: "var(--accent-dark)",
              marginBottom: 12,
              display: "block",
            }}
          >
            {drafting ? "Redactando con IA…" : "↻ Redactar de nuevo con IA"}
          </button>

          <label style={label}>Asunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={field} placeholder="nueva lección: …" />

          <label style={label}>El aviso (una frase)</label>
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} style={{ ...field, resize: "vertical" }} />

          <label style={label}>De qué va (1-2 frases)</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} style={{ ...field, resize: "vertical" }} />

          <label style={label}>Por qué te conviene verla (una línea por bullet)</label>
          <textarea value={whyText} onChange={(e) => setWhyText(e.target.value)} rows={4} style={{ ...field, resize: "vertical" }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <button
              type="button"
              onClick={() => void enviar(true)}
              disabled={sending !== null || !subject || !intro}
              style={{
                padding: "10px 16px",
                borderRadius: 9,
                border: "1px solid var(--accent)",
                background: "var(--tint)",
                color: "var(--accent-dark)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {sending === "test" ? "Enviando…" : "Enviarme una prueba"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void enviar(false)}
              disabled={sending !== null || !subject || !intro}
              style={{
                padding: "10px 18px",
                borderRadius: 9,
                border: 0,
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {sending === "real"
                ? "Enviando…"
                : yaAvisado
                  ? "Reenviar a todos"
                  : `Enviar${destinatarios ? ` a ${destinatarios}` : ""}`}
            </button>
          </div>

          {msg ? (
            <p style={{ marginBottom: 0, fontSize: 13, color: msg.ok ? "var(--accent-dark)" : "var(--warn)" }}>
              {msg.text}
            </p>
          ) : null}
        </div>

        <div>
          <label style={label}>Vista previa (así le llega)</label>
          <iframe
            title="Vista previa del mail"
            srcDoc={html || "<p style='font-family:sans-serif;color:#5C6B66;padding:16px;'>Escribí el aviso para ver la vista previa.</p>"}
            style={{
              width: "100%",
              height: 520,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "#fff",
            }}
          />
        </div>
      </div>
    </div>
  );
}
