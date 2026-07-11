"use client";
import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Selector "ver como cliente" (solo admin): navega con ?cliente=<id> preservando el rango.
export function ClientPicker({
  clients,
  current,
}: {
  clients: { id: string; name: string }[];
  current?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(id: string) {
    const p = new URLSearchParams(params.toString());
    if (id) p.set("cliente", id);
    else p.delete("cliente");
    startTransition(() => router.push(`/dashboard?${p.toString()}`));
  }

  return (
    <select
      value={current ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Ver como cliente"
      aria-busy={isPending}
      className={isPending ? "is-pending" : undefined}
      style={{
        padding: "8px 10px",
        border: "1px solid var(--line)",
        borderRadius: 8,
        fontSize: 13,
        color: "var(--ink)",
        background: "var(--card)",
        maxWidth: 220,
      }}
    >
      <option value="">Ver como cliente…</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
