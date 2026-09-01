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
  last_tool_event_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notify_lessons: boolean;
  metrics_from: string | null;
}

interface Dump {
  counts: Record<string, number>;
  users: { user_id: string; role: string; email: string | null }[];
}

function hoyIso(): string {
  // hora local de Argentina: con UTC, de 21 a 24 h el default sería el día de mañana
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
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

// La memoria del agente NO guarda las tool calls: llegan por /api/ingest/tool-events.
// Si dejan de llegar, "Acciones del agente", "Uso de herramientas" y "Lo más
// consultado" se van a cero sin un solo error — que es como estuvimos desde julio.
// Solo se avisa si el cliente además tiene datos: sin conversaciones no hay tools.
function toolsBadge(iso: string | null, lastDataAt: string | null): { text: string; dead: boolean } | null {
  if (!lastDataAt) return null;
  if (!iso) return { text: "⚠ sin registro de tools", dead: true };
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (d <= 3) return null; // al día: no ensuciar la lista
  return { text: `⚠ sin registro de tools hace ${d} días`, dead: true };
}

export function ClientsAdminList({ clients }: { clients: C[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  // edición del contacto del dueño (los clientes viejos se dieron de alta sin él)
  const [editing, setEditing] = useState<string | null>(null);
  const [cName, setCName] = useState("");
  const [cMail, setCMail] = useState("");
  // zona de riesgo: un solo panel abierto por vez, y nunca abierto de entrada
  const [zona, setZona] = useState<{ id: string; modo: "metricas" | "baja" } | null>(null);
  const [corte, setCorte] = useState(hoyIso());
  const [nombreConfirm, setNombreConfirm] = useState("");

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

  /**
   * Baja el respaldo y devuelve el volcado. Se llama SIEMPRE antes de borrar: el
   * archivo tiene que existir en Descargas aunque el borrado falle después.
   * Devuelve null si algo salió mal — y entonces no se borra nada.
   */
  async function respaldar(c: C, before: string | null): Promise<Dump | null> {
    const url = `/api/admin/clients/${c.id}/export${before ? `?before=${before}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      setMsg((m) => ({ ...m, [c.id]: "No se pudo bajar el respaldo: " + err }));
      return null;
    }
    const texto = await res.text();
    const objUrl = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `respaldo-${c.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${before ?? "todo"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // revocar en el acto puede cancelar la descarga en algunos navegadores, y todo
    // el sentido de esto es que el archivo llegue a Descargas antes de borrar nada
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    return JSON.parse(texto) as Dump;
  }

  function resumen(d: Dump): string {
    return (
      Object.entries(d.counts)
        .filter(([, n]) => n > 0)
        .map(([t, n]) => `  ${t}: ${n}`)
        .join("\n") || "  (no hay filas en ese período)"
    );
  }

  async function borrarMetricas(c: C) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(corte)) {
      setMsg((m) => ({ ...m, [c.id]: "Fecha de corte inválida" }));
      return;
    }
    setBusy(c.id);
    setMsg((m) => ({ ...m, [c.id]: "" }));
    const dump = await respaldar(c, corte);
    if (!dump) return setBusy(null);
    const ok = confirm(
      `Se bajó el respaldo. Ahora se borra TODO lo anterior al ${ddmm(corte)} de ${c.name}:\n\n` +
        `${resumen(dump)}\n\n` +
        `El panel del cliente va a arrancar el ${ddmm(corte)}. No se puede deshacer (salvo con el respaldo).`,
    );
    if (!ok) return setBusy(null);
    const res = await fetch(`/api/admin/clients/${c.id}/metrics?before=${corte}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const err = await res.text();
      setMsg((m) => ({ ...m, [c.id]: "Error al borrar: " + err }));
      return;
    }
    const r = (await res.json()) as { total: number; metrics_from: string };
    setZona(null);
    setMsg((m) => ({ ...m, [c.id]: `Borradas ${r.total} filas · métricas desde ${ddmm(r.metrics_from)}` }));
    router.refresh();
  }

  async function eliminarCliente(c: C) {
    setBusy(c.id);
    setMsg((m) => ({ ...m, [c.id]: "" }));
    const dump = await respaldar(c, null);
    if (!dump) return setBusy(null);
    const cuentas = dump.users.filter((u) => u.role !== "admin").map((u) => u.email ?? u.user_id);
    const ok = confirm(
      `Se bajó el respaldo completo. Ahora se elimina ${c.name} del portal:\n\n` +
        `${resumen(dump)}\n\n` +
        (cuentas.length
          ? `Cuentas que pierden el acceso:\n  ${cuentas.join("\n  ")}\n\n`
          : `Sin cuentas de acceso.\n\n`) +
        `La tabla de conversaciones en Supabase NO se toca. No se puede deshacer.`,
    );
    if (!ok) return setBusy(null);
    const res = await fetch(`/api/admin/clients/${c.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: nombreConfirm }),
    });
    setBusy(null);
    if (!res.ok) {
      const err = await res.text();
      setMsg((m) => ({ ...m, [c.id]: "Error al eliminar: " + err }));
      return;
    }
    setZona(null);
    setNombreConfirm("");
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
            {c.metrics_from ? (
              <>
                {" · "}
                <span>métricas desde {ddmm(c.metrics_from)}</span>
              </>
            ) : null}
            {toolsBadge(c.last_tool_event_at, c.last_data_at) ? (
              <>
                {" · "}
                <span style={{ color: "var(--warn)" }}>
                  {toolsBadge(c.last_tool_event_at, c.last_data_at)!.text}
                </span>
              </>
            ) : null}
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
            {zona?.id === c.id ? null : (
              <>
                <button
                  onClick={() => {
                    setZona({ id: c.id, modo: "metricas" });
                    setCorte(hoyIso());
                    setMsg((m) => ({ ...m, [c.id]: "" }));
                  }}
                  style={{ ...linkBtn, color: "var(--ink-soft)" }}
                >
                  Borrar métricas…
                </button>
                <button
                  onClick={() => {
                    setZona({ id: c.id, modo: "baja" });
                    setNombreConfirm("");
                    setMsg((m) => ({ ...m, [c.id]: "" }));
                  }}
                  style={{ ...linkBtn, color: "var(--warn)" }}
                >
                  Eliminar cliente
                </button>
              </>
            )}
            {msg[c.id] ? <span style={{ fontSize: 12, color: "var(--warn)" }}>{msg[c.id]}</span> : null}
          </div>

          {/* Zona de riesgo. Los dos flujos bajan el respaldo ANTES de borrar. */}
          {zona?.id === c.id ? (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "var(--tint)",
              }}
            >
              {zona.modo === "metricas" ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Borrar métricas anteriores a…</div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                    Cierra el período de prueba: se borra todo lo anterior a esa fecha y el panel del cliente
                    arranca ahí. Las lecciones, las novedades y el contacto del dueño no se tocan.
                  </p>
                  <input
                    type="date"
                    value={corte}
                    max={hoyIso()}
                    onChange={(e) => setCorte(e.target.value)}
                    style={{ ...field, maxWidth: 200 }}
                  />
                  <div style={{ display: "flex", gap: 14 }}>
                    <button
                      onClick={() => borrarMetricas(c)}
                      disabled={busy === c.id}
                      style={{ ...linkBtn, color: "var(--warn)" }}
                    >
                      {busy === c.id ? "Borrando…" : "Bajar respaldo y borrar"}
                    </button>
                    <button onClick={() => setZona(null)} style={{ ...linkBtn, color: "var(--ink-soft)" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--warn)" }}>
                    Eliminar {c.name} del portal
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                    Se borran sus métricas, sus insights, sus novedades, sus lecciones propias y las cuentas
                    que entran a ver su panel. La tabla de conversaciones en Supabase queda intacta. Para
                    confirmar, escribí el nombre exacto del cliente.
                  </p>
                  <input
                    value={nombreConfirm}
                    onChange={(e) => setNombreConfirm(e.target.value)}
                    placeholder={c.name}
                    style={field}
                  />
                  <div style={{ display: "flex", gap: 14 }}>
                    <button
                      onClick={() => eliminarCliente(c)}
                      disabled={busy === c.id || nombreConfirm.trim() !== c.name.trim()}
                      style={{
                        ...linkBtn,
                        color: nombreConfirm.trim() === c.name.trim() ? "var(--warn)" : "var(--ink-soft)",
                        cursor: nombreConfirm.trim() === c.name.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      {busy === c.id ? "Eliminando…" : "Bajar respaldo y eliminar"}
                    </button>
                    <button onClick={() => setZona(null)} style={{ ...linkBtn, color: "var(--ink-soft)" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
