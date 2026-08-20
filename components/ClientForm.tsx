"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const f = e.currentTarget;
    const fd = new FormData(f);
    const body = {
      name: String(fd.get("name") ?? ""),
      rubro: String(fd.get("rubro") ?? ""),
      table: String(fd.get("table") ?? ""),
      email: String(fd.get("email") ?? ""),
      contactName: String(fd.get("contactName") ?? ""),
      contactEmail: String(fd.get("contactEmail") ?? ""),
      label: String(fd.get("label") ?? ""),
      utc: Number(fd.get("utc") || -3),
    };
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      const lines = [`Cliente creado ✓ (${d.days ?? 0} días de datos)`];
      if (d.password) lines.push(`Acceso al portal → ${body.email} / ${d.password}`);
      lines.push(
        body.contactEmail
          ? `Avisos de lecciones → ${body.contactName || "(sin nombre)"} · ${body.contactEmail}`
          : "⚠ Sin mail del dueño: este cliente NO va a recibir avisos de lecciones. Cargalo en la lista de la derecha.",
      );
      if (d.warning) lines.push("⚠ " + d.warning);
      setResult({ ok: true, text: lines.join("\n") });
      f.reset();
      router.refresh();
    } else {
      setResult({ ok: false, text: "Error: " + (await res.text()) });
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
  const label = { fontSize: 12.5, color: "var(--ink-soft)" } as const;

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 620 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Agregar un cliente</h3>

      <label style={label}>Nombre del negocio</label>
      <input name="name" required placeholder="Kiosco La Esquina" style={field} />

      <label style={label}>Rubro</label>
      <input name="rubro" placeholder="kiosco / almacén / servicios…" style={field} />

      <label style={label}>Tabla de conversaciones (en tu Supabase)</label>
      <input name="table" required placeholder="nombre_exacto_de_la_tabla" style={field} />

      {/* Recordatorio del contrato de la tabla fuente. Va acá y no en el README
          porque el error se comete justo en este momento y falla en SILENCIO:
          sin `fecha` el cómputo termina bien, sella el sync en verde y no
          escribe una sola métrica. Pasó con kopfundpuls (20/08/2026). */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 9,
          padding: "14px",
          margin: "2px 0 14px",
          background: "var(--tint)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Antes de seguir: revisá esa tabla</div>
        <p style={{ ...label, margin: "0 0 8px", lineHeight: 1.45 }}>
          Si le falta alguna de estas columnas, el panel va a mostrar <strong>todo en cero</strong> y el sync
          igual va a figurar en verde. No avisa por otro lado.
        </p>
        <ul style={{ ...label, margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            <code>fecha</code> — <code>timestamptz not null default now()</code>. Es la que más se olvida. Sin
            ella ninguna fila entra en ningún día. El <code>default</code> hace que n8n la complete sola.
          </li>
          <li>
            <code>session_id</code> — identifica la charla. Sin esto no hay conversaciones.
          </li>
          <li>
            <code>message</code> — <code>jsonb</code> con el mensaje de LangChain.
          </li>
          <li>
            <code>id</code> — cualquier columna ordenable, para paginar.
          </li>
          <li>
            <code>Texto</code> — opcional, texto plano del mensaje del cliente.
          </li>
        </ul>
        <p style={{ ...label, margin: "8px 0 0", lineHeight: 1.45 }}>
          La <code>fecha</code> va en <strong>UTC</strong>: el portal la pasa a hora local con el huso de acá
          abajo. Si se guarda hora local como si fuera UTC, el horario pico queda corrido.
        </p>
      </div>

      <label style={label}>Email de la empresa — con este se crea la cuenta del portal</label>
      <input name="email" type="email" placeholder="ventas@laempresa.com" style={field} />

      {/* El contacto del dueño es OTRA cosa que la cuenta del portal: los avisos
          de lecciones van al mail personal, no a la casilla de ventas/info. */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 9,
          padding: "14px 14px 4px",
          margin: "2px 0 14px",
          background: "var(--tint)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>El dueño, en persona</div>
        <p style={{ ...label, margin: "0 0 12px", lineHeight: 1.45 }}>
          A esto le mandamos los avisos de lecciones nuevas. Si lo dejás vacío, ese cliente no recibe avisos
          (no le escribimos a la casilla de la empresa).
        </p>

        <label style={label}>Nombre del dueño</label>
        <input name="contactName" placeholder="Fernando" style={field} />

        <label style={label}>Su mail personal</label>
        <input name="contactEmail" type="email" placeholder="fernandogallo@gmail.com" style={field} />
      </div>

      <label style={label}>Etiqueta del evento clave (ej. Pedidos, Turnos, Reservas)</label>
      <input name="label" placeholder="Conversiones" style={field} />

      <label style={label}>Huso horario (UTC offset)</label>
      <input name="utc" type="number" step="1" defaultValue={-3} style={field} />

      <button
        type="submit"
        disabled={busy}
        className="btn-primary"
        style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 9, padding: "11px 20px", fontWeight: 700, cursor: "pointer" }}
      >
        {busy ? "Creando…" : "Crear cliente"}
      </button>

      {result && (
        <pre style={{ marginBottom: 0, marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, color: result.ok ? "var(--accent-dark)" : "var(--warn)", fontFamily: "var(--sans)" }}>
          {result.text}
        </pre>
      )}
    </form>
  );
}
