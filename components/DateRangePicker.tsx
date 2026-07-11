"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const UTC_OFFSET_H = -3; // mismo huso de referencia que el dashboard

// "hoy - n días" en hora local Argentina (igual que isoDaysAgo del server,
// para que el preset activo coincida con el rango por defecto).
function isoDaysAgo(n: number): string {
  const local = new Date(Date.now() + UTC_OFFSET_H * 3600 * 1000);
  local.setUTCDate(local.getUTCDate() - n);
  return local.toISOString().slice(0, 10);
}

function firstOfMonth(): string {
  const local = new Date(Date.now() + UTC_OFFSET_H * 3600 * 1000);
  return local.toISOString().slice(0, 8) + "01";
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // rango optimista: el botón clickeado se marca activo AL INSTANTE,
  // aunque el server tarde en devolver la página nueva
  const [optimistic, setOptimistic] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    // el estado optimista cumple hasta que llegan props nuevas o termina la
    // transición (lo que ocurra primero) — nunca puede quedar pegado
    if (!isPending) setOptimistic(null);
  }, [isPending, from, to]);

  const shownFrom = optimistic?.from ?? from;
  const shownTo = optimistic?.to ?? to;

  function setRange(f: string, t: string) {
    if (f === shownFrom && t === shownTo) return; // click en el rango ya activo: no-op
    setOptimistic({ from: f, to: t });
    const p = new URLSearchParams(params.toString());
    p.set("from", f);
    p.set("to", t);
    startTransition(() => router.push(`/dashboard?${p.toString()}`));
  }

  const presets: { label: string; from: string; to: string }[] = [
    { label: "7 días", from: isoDaysAgo(7), to: isoDaysAgo(0) },
    { label: "30 días", from: isoDaysAgo(30), to: isoDaysAgo(0) },
    { label: "90 días", from: isoDaysAgo(90), to: isoDaysAgo(0) },
    { label: "Este mes", from: firstOfMonth(), to: isoDaysAgo(0) },
  ];

  const input = {
    padding: "8px 10px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--card)",
    flex: "1 1 130px",
    minWidth: 0,
  } as const;

  return (
    <div
      style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 auto", minWidth: 0, flexWrap: "wrap" }}
      className={isPending ? "is-pending" : undefined}
      aria-busy={isPending}
    >
      <div
        role="group"
        aria-label="Rangos rápidos"
        style={{
          display: "flex",
          border: "1px solid var(--line)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--card)",
        }}
      >
        {presets.map((p) => {
          const active = p.from === shownFrom && p.to === shownTo;
          return (
            <button
              key={p.label}
              onClick={() => setRange(p.from, p.to)}
              style={{
                padding: "8px 12px",
                border: 0,
                fontSize: 12.5,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: active ? "var(--tint)" : "transparent",
                color: active ? "var(--accent-dark)" : "var(--ink-soft)",
                fontWeight: active ? 700 : 400,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 auto", minWidth: 0 }}>
        <input
          type="date"
          value={shownFrom}
          max={shownTo}
          style={input}
          onChange={(e) => setRange(e.target.value, shownTo)}
        />
        <span style={{ color: "var(--ink-soft)" }}>→</span>
        <input
          type="date"
          value={shownTo}
          min={shownFrom}
          style={input}
          onChange={(e) => setRange(shownFrom, e.target.value)}
        />
      </div>
    </div>
  );
}
