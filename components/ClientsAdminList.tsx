"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface C {
  id: string;
  name: string;
  rubro: string;
  table_name: string | null;
}

export function ClientsAdminList({ clients }: { clients: C[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  async function genInsights(id: string) {
    setBusy(id);
    setMsg((m) => ({ ...m, [id]: "" }));
    const res = await fetch(`/api/admin/clients/${id}/insights`, { method: "POST" });
    const text = res.ok ? "Insights publicados ✓" : "Error: " + (await res.text());
    setBusy(null);
    setMsg((m) => ({ ...m, [id]: text }));
    router.refresh();
  }

  if (!clients.length) return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Todavía ningún cliente.</p>;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {clients.map((c) => (
        <li key={c.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
            {c.rubro || "—"} · tabla: <code>{c.table_name ?? "?"}</code>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6 }}>
            <button
              onClick={() => genInsights(c.id)}
              disabled={busy === c.id}
              style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-dark)", background: "none", border: 0, padding: 0, cursor: "pointer" }}
            >
              {busy === c.id ? "Generando…" : "Generar insights"}
            </button>
            {msg[c.id] ? <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{msg[c.id]}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
