"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface C {
  id: string;
  name: string;
  rubro: string;
  table_name: string | null;
  last_synced_at: string | null;
  last_data_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notify_lessons: boolean;
}

// hace cuánto sincronizó; > 26 h = el cron diario se salteó al menos una corrida
function syncBadge(iso: string | null): { text: string; stale: boolean } {
  if (!iso) return { text: "nunca sincronizó", stale: true };
  const h = (Date.now() - Date.parse(iso)) / 3600000;
  if (h < 1) return { text: "sync hace menos de 1 h", stale: false };
  if (h < 26) return { text: `sync hace ${Math.round(h)} h`, stale: false };
  return { text: `⚠ sin sync hace ${Math.round(h / 24)} día(s)`, stale: true };
}

// el sync puede estar verde con la fuente muerta (tabla vaciada / workflow que
// dejó de escribir): el dato que delata eso es la fecha del último día con métricas
function dataBadge(iso: string | null): { text: string; dead: boolean } {
  if (!iso) return { text: "sin datos aún", dead: true };
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (d <= 3) return { text: `último dato: ${iso.slice(8, 10)}/${iso.slice(5, 7)}`, dead: false };
  return { text: `⚠ la fuente no trae datos desde ${iso.slice(8, 10)}/${iso.slice(5, 7)} (${d} días)`, dead: true };
}

export function ClientsAdminList({ clients }: { clients: C[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  // edición del contacto del dueño (los clientes viejos se dieron de alta sin él)
  const [editing, setEditing] = useState<string | null>(null);
  const [cName, setCName] = useState("");
  const [cMail, setCMail] = useState("");

  function startEdit(c: C) {
    setEditing(c.id);
    setCName(c.contact_name ?? "");
    setCMail(c.contact_email ?? "");
    setMsg((m) => ({ ...m, [c.id]: "" }));
  }

  async function saveContact(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contact_name: cName, contact_email: cMail }),
    });
    setBusy(null);
    if (!res.ok) {
      const err = await res.text();
      setMsg((m) => ({ ...m, [id]: "Error: " + err }));
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function genInsights(id: string, name: string) {
    if (!confirm(`¿Generar y publicar insights para ${name}? Consume API y el cliente los ve al instante.`)) return;
    setBusy(id);
    setMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/admin/clients/${id}/insights`, { method: "POST" });
    const text = res.ok ? "Insights publicados ✓" : "Error: " + (await res.text());
    setBusy(null);
    setMsg((m) => ({ ...m, [id]: text }));
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
  const linkBtn = { fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "none", border: 0, padding: 0 } as const;

  if (!clients.length) return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Todavía ningún cliente.</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {clients.map((c) => (
        <li key={c.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
            {c.rubro || "—"} · tabla: <code>{c.table_name ?? "?"}</code> ·{" "}
            <span style={{ color: syncBadge(c.last_synced_at).stale ? "var(--warn)" : "var(--ink-soft)" }}>
              {syncBadge(c.last_synced_at).text}
            </span>{" "}
            ·{" "}
            <span style={{ color: dataBadge(c.last_data_at).dead ? "var(--warn)" : "var(--ink-soft)" }}>
              {dataBadge(c.last_data_at).text}
            </span>
          </div>
          {/* contacto del dueño: a dónde van los avisos de lecciones */}
          {editing === c.id ? (
            <div style={{ marginTop: 8 }}>
              <input
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Nombre del dueño (ej. Fernando)"
                style={field}
              />
              <input
                value={cMail}
                onChange={(e) => setCMail(e.target.value)}
                type="email"
                placeholder="Su mail personal (ej. fernandogallo@gmail.com)"
                style={field}
              />
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={() => saveContact(c.id)} disabled={busy === c.id} style={{ ...linkBtn, color: "var(--accent-dark)" }}>
                  {busy === c.id ? "Guardando…" : "Guardar"}
                </button>
                <button onClick={() => setEditing(null)} style={{ ...linkBtn, color: "var(--ink-soft)" }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, marginTop: 4, color: c.contact_email ? "var(--ink-soft)" : "var(--warn)" }}>
              {c.contact_email
                ? `Avisos → ${c.contact_name || "(sin nombre)"} · ${c.contact_email}${c.notify_lessons ? "" : " · avisos apagados"}`
                : "⚠ Sin mail del dueño: no recibe avisos de lecciones"}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => genInsights(c.id, c.name)}
              disabled={busy === c.id}
              style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-dark)", background: "none", border: 0, padding: 0, cursor: "pointer" }}
            >
              {busy === c.id ? "Generando…" : "Generar insights"}
            </button>
            {editing === c.id ? null : (
              <button onClick={() => startEdit(c)} style={{ ...linkBtn, color: "var(--accent-dark)" }}>
                {c.contact_email ? "Editar contacto" : "Cargar mail del dueño"}
              </button>
            )}
            {msg[c.id] ? <span style={{ fontSize: 12, color: "var(--warn)" }}>{msg[c.id]}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
