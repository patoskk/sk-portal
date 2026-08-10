"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Update } from "@/lib/data/updates";
import { Badge, Button, EmptyState, type BadgeTone } from "@/components/ui";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MES[Number(m) - 1]}`;
}

const TONE: Record<Update["kind"], { label: string; tone: BadgeTone }> = {
  nuevo: { label: "Nuevo", tone: "solid" },
  mejora: { label: "Mejora", tone: "accent" },
  arreglo: { label: "Arreglo", tone: "gold" },
};

export function UpdatesAdminList({
  updates,
  clients,
}: {
  updates: Update[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nombre = new Map(clients.map((c) => [c.id, c.name]));

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta novedad? No se puede deshacer.")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/updates/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) setErr("Error al eliminar: " + (await res.text()));
    router.refresh();
  }

  if (!updates.length) {
    return <EmptyState title="Todavía no publicaste ninguna novedad">Empezá por el formulario de la izquierda.</EmptyState>;
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      {err ? <p style={{ color: "var(--warn)", margin: 0, fontSize: "var(--fs-md)" }}>{err}</p> : null}
      {updates.map((u) => (
        <div key={u.id} className="admin-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: 8, marginBottom: 3 }}>
              <Badge tone={TONE[u.kind].tone}>{TONE[u.kind].label}</Badge>
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--ink-soft)" }}>
                {fmtCorta(u.published_at)} ·{" "}
                {u.client_id ? (nombre.get(u.client_id) ?? "un cliente") : "todos los clientes"}
              </span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.title}</div>
            {u.body ? (
              <p style={{ margin: "2px 0 0", fontSize: "var(--fs-md)", color: "var(--ink-soft)", lineHeight: 1.45 }}>
                {u.body}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={() => remove(u.id)} disabled={busy} aria-label="Eliminar">
            <Trash2 size={15} strokeWidth={1.9} />
          </Button>
        </div>
      ))}
    </div>
  );
}
