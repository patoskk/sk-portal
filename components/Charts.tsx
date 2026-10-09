"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BRAND } from "@/lib/brand";

// El color del TEXTO de los gráficos ya no se calcula acá. Antes se leía el
// tema con un MutationObserver y se pasaba como fill= a los <text> del SVG;
// eso es un atributo fijo al momento de renderizar, así que al imprimir el
// @media print no podía corregirlo y las etiquetas salían casi blancas sobre
// papel. Ahora lo maneja globals.css con variables (.recharts-* → --ink /
// --ink-soft): sigue el tema y la impresión sin JS de por medio.
//
// Lo mismo con el gris de las barras que no son la hora pico (.bar-soft →
// --chart-soft): el fill= de acá es solo el valor del tema claro, y el CSS le
// gana al atributo en oscuro.

// Tooltip con la estética de la marca (el default de Recharts es blanco puro
// y desentona en modo oscuro). Las vars CSS siguen el tema solas.
const TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    boxShadow: "var(--shadow-hi)",
    fontSize: 13,
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
 *
 * El área va con un relleno PLANO y tenue: el degradé que se desvanecía era
 * justamente el resplandor que la marca dejó afuera.
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
  return (
    <div
      aria-hidden="true"
      style={grow ? { flex: 1, minHeight: height, marginTop: 10 } : { height, marginTop: 6 }}
    >
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={BRAND.accent}
            strokeWidth={2}
            fill={BRAND.accent}
            fillOpacity={0.12}
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
  format,
}: {
  data: { label: string; value: number }[];
  color?: string;
  /** texto al final de cada barra; por defecto, el valor */
  format?: (v: number) => string;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 64 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP} cursor={{ fill: "var(--hover)" }} formatter={(v: number) => [format ? format(v) : v, ""]} separator="" />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          isAnimationActive={false}
          // etiqueta a mano: la de Recharts toma el ancho de la barra como límite y
          // en una barra corta partía "89 · 8%" en dos renglones
          label={(p: { x?: number; y?: number; width?: number; height?: number; value?: number; index?: number }) => (
            <text
              key={`l${p.index}`}
              x={(p.x ?? 0) + (p.width ?? 0) + 6}
              y={(p.y ?? 0) + (p.height ?? 0) / 2}
              dominantBaseline="central"
              fontSize={13}
              className="recharts-label"
            >
              {format ? format(p.value ?? 0) : p.value}
            </text>
          )}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Uso de herramientas. Antes era un donut de seis colores; la paleta de la marca
 * es un solo verde más grises y no alcanza para distinguir categorías (ver
 * lib/brand.ts), así que va como ranking: un solo color, ordenado de mayor a
 * menor y con el número y el porcentaje escritos en cada barra. Se lee más
 * rápido que un donut y no depende del color para nada.
 */
export function UsageBars({ data }: { data: { label: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (!filtered.length) return <Empty />;
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return (
    <>
      <p className="usage-total">
        <span className="usage-total-value">{total}</span> acciones en el período
      </p>
      <HBarChart data={filtered} format={(v) => `${v} · ${Math.round((100 * v) / total)}%`} />
    </>
  );
}

export function ActivityLine({ data }: { data: { date: string; value: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 12, top: 8 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
          tickFormatter={fmtDia}
        />
        {/* 36px recortaba los valores de 3 cifras: "150" se leía "50" */}
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={46} />
        <Tooltip {...TOOLTIP} labelFormatter={(l) => fmtDia(String(l))} cursor={{ stroke: "var(--line)" }} />
        <Line
          type="monotone"
          dataKey="value"
          name="Mensajes"
          stroke={BRAND.accent}
          strokeWidth={2}
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
  const pico = data.findIndex((d) => d.value === max);
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ left: -16, right: 12, top: 20 }}>
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
        {/* 36px recortaba los valores de 3 cifras: "150" se leía "50" */}
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={46} />
        <Tooltip {...TOOLTIP} cursor={{ fill: "var(--hover)" }} />
        <Bar
          dataKey="value"
          name="Mensajes"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          // la hora pico lleva su número escrito: el verde contra el gris pasa el
          // chequeo de daltonismo, pero no llega a 3 a 1 contra el fondo
          label={(p: { x?: number; y?: number; width?: number; value?: number; index?: number }) =>
            p.index === pico ? (
              <text
                key="pico"
                x={(p.x ?? 0) + (p.width ?? 0) / 2}
                y={(p.y ?? 0) - 6}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                className="recharts-label"
              >
                {p.value}
              </text>
            ) : (
              <g key={`l${p.index}`} />
            )
          }
        >
          {/* la hora pico en el verde del logo, el resto en gris: el ojo va
              directo a lo importante (verde contra gris: ΔE 21, también con daltonismo) */}
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={i === pico ? BRAND.accent : BRAND.chartSoft}
              className={i === pico ? undefined : "bar-soft"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Sin datos en este período.</p>;
}
