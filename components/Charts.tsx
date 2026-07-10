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

// Tooltip con la estética de la marca (el default de Recharts es blanco puro
// y desentona en modo oscuro). Las vars CSS siguen el tema solas.
const TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    boxShadow: "var(--shadow-hi)",
    fontSize: 12.5,
    padding: "8px 12px",
  },
  labelStyle: { color: "var(--ink)", fontWeight: 700 },
  itemStyle: { color: "var(--ink-soft)" },
} as const;

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "2026-06-12" -> "12 jun" (los ISO crudos en un eje se ven a sistema, no a reporte)
function fmtDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MES[Number(m) - 1] ?? ""}`;
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
        {/* cy fijo para que el texto del centro y el anillo queden siempre alineados */}
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="label"
          cy="42%"
          innerRadius={64}
          outerRadius={96}
          paddingAngle={2}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={USAGE_COLORS[i % USAGE_COLORS.length]} />
          ))}
        </Pie>
        <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central">
          <tspan x="50%" dy="-9" fontSize="26" fontWeight="800" fill={ink.label}>
            {total}
          </tspan>
          <tspan x="50%" dy="24" fontSize="11" fill={ink.soft}>
            acciones
          </tspan>
        </text>
        <Tooltip {...TOOLTIP} formatter={(v: number) => [`${v} (${Math.round((100 * v) / total)}%)`, ""]} />
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
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: ink.soft }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tickFormatter={fmtDia}
        />
        <YAxis tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...TOOLTIP} labelFormatter={(l) => fmtDia(String(l))} cursor={{ stroke: "var(--line)" }} />
        <Line
          type="monotone"
          dataKey="value"
          name="Mensajes"
          stroke={BRAND.accent}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: BRAND.accent, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActivityBars({ data }: { data: { hour: string; value: number }[] }) {
  const ink = useChartInk();
  // el array siempre trae 24 horas; "sin datos" = todas en cero
  if (!data.some((d) => d.value > 0)) return <Empty />;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: ink.soft }} axisLine={false} tickLine={false} interval={1} />
        <YAxis tick={{ fontSize: 11, fill: ink.soft }} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...TOOLTIP} cursor={{ fill: "var(--tint)" }} />
        <Bar dataKey="value" name="Mensajes" radius={[4, 4, 0, 0]}>
          {/* la hora pico en teal pleno: el ojo va directo a lo importante */}
          {data.map((d, i) => (
            <Cell key={i} fill={d.value === max ? BRAND.accent : BRAND.accentSoft} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Sin datos en este período.</p>;
}
