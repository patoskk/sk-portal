"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: "from" | "to", value: string) {
    const p = new URLSearchParams(params.toString());
    p.set(key, value);
    router.push(`/dashboard?${p.toString()}`);
  }

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
    <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "1 1 auto", minWidth: 0 }}>
      <input type="date" value={from} max={to} style={input} onChange={(e) => update("from", e.target.value)} />
      <span style={{ color: "var(--ink-soft)" }}>→</span>
      <input type="date" value={to} min={from} style={input} onChange={(e) => update("to", e.target.value)} />
    </div>
  );
}
