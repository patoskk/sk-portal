"use client";
import {
  Area,
  AreaChart,
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
import { BRAND, USAGE_COLORS } from "@/lib/brand";

// El color del TEXTO de los gráficos ya no se calcula acá. Antes se leía el
// tema con un MutationObserver y se pasaba como fill= a los <text> del SVG;
// eso es un atributo fijo al momento de renderizar, así que al imprimir el
// @media print no podía corregirlo y las etiquetas salían casi blancas sobre
// papel. Ahora lo maneja globals.css con variables (.recharts-* → --ink /
// --ink-soft): sigue el tema y la impresión sin JS de por medio.

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

/**
 * Sparkline de una tarjeta KPI: la forma del período, no sus valores exactos.
 * Sin ejes, sin grilla, sin puntos y sin tooltip a propósito — el número grande
 * al lado ya dice cuánto; esto solo dice "viene subiendo" o "se cayó el finde".
 * Decorativa: aria-hidden, porque no aporta nada que el KPI no diga.
 */
export function Sparkline({
  values,
  height = 34,
  grow,
}: {
  values: number[];
  height?: number;
  /** ocupa el alto sobrante de la tarjeta en vez de dejarlo en blanco */
  grow?: boolean;
}) {
  // con menos de 3 puntos no hay forma que mostrar, solo una raya que confunde
  if (!values || values.length < 3 || values.every((v) => v === 0)) return null;
  const data = values.map((value, i) => ({ i, value }));
  const id = `spark-${values.length}-${values[values.length - 1]}`;
  return (
    <div
      aria-hidden="true"
      style={grow ? { flex: 1, minHeight: height, marginTop: 10 } : { height, marginTop: 6 }}
    >
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={BRAND.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND.accent}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({
  data,
  color = BRAND.accent,
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 36 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} isAnimationActive={false} label={{ position: "right", fontSize: 12 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageDonut({ data }: { data: { label: string; value: number }[] }) {
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
          isAnimationActive={false}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={USAGE_COLORS[i % USAGE_COLORS.length]} />
          ))}
        </Pie>
        <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central">
          <tspan x="50%" dy="-9" fontSize="26" fontWeight="800" className="donut-total">
            {total}
          </tspan>
          <tspan x="50%" dy="24" fontSize="11" className="donut-unit">
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
              <span style={{ color: "var(--ink)", fontSize: 12 }}>
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
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tickFormatter={fmtDia}
        />
        {/* 36px recortaba los valores de 3 cifras: "150" se leía "50" */}
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
        <Tooltip {...TOOLTIP} labelFormatter={(l) => fmtDia(String(l))} cursor={{ stroke: "var(--line)" }} />
        <Line
          type="monotone"
          dataKey="value"
          name="Mensajes"
          stroke={BRAND.accent}
          strokeWidth={2.5}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 4, fill: BRAND.accent, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActivityBars({ data }: { data: { hour: string; value: number }[] }) {
  // el array siempre trae 24 horas; "sin datos" = todas en cero
  if (!data.some((d) => d.value > 0)) return <Empty />;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis dataKey="hour" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
        {/* 36px recortaba los valores de 3 cifras: "150" se leía "50" */}
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={46} />
        <Tooltip {...TOOLTIP} cursor={{ fill: "var(--tint)" }} />
        <Bar dataKey="value" name="Mensajes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
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
