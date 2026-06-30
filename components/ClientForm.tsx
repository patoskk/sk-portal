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
      if (d.password) lines.push(`Acceso del dueño → ${body.email} / ${d.password}`);
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

      <label style={label}>Email del dueño (para su acceso)</label>
      <input name="email" type="email" placeholder="dueño@correo.com" style={field} />

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
