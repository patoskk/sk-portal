"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BRAND, FUNNEL_COLORS, USAGE_COLORS } from "@/lib/brand";

// Lee el tema actual (data-theme en <html>) y reacciona a sus cambios.
function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

// Colores de texto según tema (las barras/donut teal funcionan en ambos).
function useChartInk() {
  const theme = useTheme();
  return theme === "dark"
    ? { label: "#E9F1ED", soft: "#9FB2AC" }
    : { label: BRAND.ink, soft: BRAND.inkSoft };
}

export function FunnelChart({ labels, values }: { labels: string[]; values: number[] }) {
  const ink = useChartInk();
  const data = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 56)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 36 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", fill: ink.label, fontSize: 12 }}>
          {data.map((_, i) => (
            <Cell key={i} fill={FUNNEL_COLORS[i] ?? BRAND.accent} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HBarChart({
  data,
  color = BRAND.accent,
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const ink = useChartInk();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 36 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} label={{ position: "right", fill: ink.label, fontSize: 12 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageDonut({ data }: { data: { label: string; value: number }[] }) {
  const ink = useChartInk();
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <Empty />;
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="label" innerRadius={64} outerRadius={96} paddingAngle={2}>
          {filtered.map((_, i) => (
            <Cell key={i} fill={USAGE_COLORS[i % USAGE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} (${Math.round((100 * v) / total)}%)`, ""]} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value, entry) => {
            const v = (entry?.payload as { value?: number })?.value ?? 0;
            return (
              <span style={{ color: ink.label, fontSize: 12 }}>
                {value} · {v} ({Math.round((100 * v) / total)}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ActivityLine({ data }: { data: { date: string; value: number }[] }) {
  const ink = useChartInk();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} width={36} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={BRAND.accent} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActivityBars({ data }: { data: { hour: string; value: number }[] }) {
  const ink = useChartInk();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: ink.soft }} axisLine={false} tickLine={false} interval={1} />
        <YAxis tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} width={36} />
        <Tooltip />
        <Bar dataKey="value" fill={BRAND.accentSoft} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Sin datos en este período.</p>;
}
