"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UPDATE_KINDS, type UpdateKind } from "@/lib/updateKinds";
import { Button, Field } from "@/components/ui";

interface ClienteOpt {
  id: string;
  name: string;
}

// Alta de una novedad. Mismo patrón que LessonForm: FormData a /api/admin/*.
export function UpdateForm({ clients }: { clients: ClienteOpt[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<UpdateKind>("mejora");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("client_id", clientId);
    const res = await fetch("/api/admin/updates", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    setTitle("");
    setBody("");
    setMsg("Publicada. Ya la ve el cliente en Novedades.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card stack">
      <h3 className="card-title">Publicar una novedad</h3>

      <Field label="Tipo">
        <div className="segmented" role="group" aria-label="Tipo de novedad">
          {UPDATE_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className={kind === k.key ? "is-on" : ""}
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Título">
        <input
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="El agente ahora cierra el pedido solo"
        />
      </Field>

      <Field label="Qué significa para el cliente">
        <textarea
          className="input"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Antes había que confirmarle a mano cada pedido. Ahora lo cierra el agente y te llega listo."
        />
      </Field>

      <Field label="Para quién">
        <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Todos los clientes (global)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="row">
        <Button type="submit" disabled={busy}>
          {busy ? "Publicando…" : "Publicar"}
        </Button>
        {msg ? <span style={{ color: "var(--accent-dark)", fontSize: "var(--fs-md)", fontWeight: 600 }}>{msg}</span> : null}
      </div>
      {err ? <p style={{ color: "var(--warn)", margin: 0, fontSize: "var(--fs-md)" }}>{err}</p> : null}
    </form>
  );
}
