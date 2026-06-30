// Port fiel de los parsers de metrics-pdf-report/scripts/analyze.py
// Esquema LangChain-memory de Supabase: id, session_id, message (blob JSON), Texto, fecha.

export const ERR_RE = /(There was an error|authorization grant|did not return a response)/i;
// "Sin resultado" genérico: una búsqueda/consulta del agente que no devolvió nada.
// Aplica a cualquier rubro (no solo "No se encontraron productos").
export const NO_RESULT_RE =
  /(no se encontr|no se hallar|sin resultados?|no hay resultados?|no encontr[eé]|not found|no results|sin coincidencias)/i;

// (nombre, patrón) — orden importa: gana la primera coincidencia, como en Python.
export const INTENTS: ReadonlyArray<readonly [string, RegExp]> = [
  ["saludo", /\b(hola|buen[ao]s?|buen d[ií]a|buenas|hey)\b/],
  ["pedido", /\b(quiero|necesito|me prepar|arm[aá]|pedido|me mand|me lleva|ll[eé]vame)\b/],
  ["precio", /\b(precio|cu[aá]nto|sale|cuesta|vale|cu[aá]nto es|cu[aá]nto ser)\b/],
  ["promo", /\b(promo|oferta|combo|descuento)\b/],
  ["horario", /\b(horario|abren|abierto|hora|atenci[oó]n)\b/],
  ["delivery", /\b(delivery|env[ií]o|env[ií]an|reparto|domicilio)\b/],
  ["foto", /\b(foto|imagen|imagenes|im[aá]genes|mand[aá] la)\b/],
];

/** Una fila cruda del export de Supabase (acceso por clave, case-insensitive vía `col`). */
export type RawRow = Record<string, unknown>;

/** Mensaje LangChain ya parseado. `tool_calls` solo aparece en mensajes `ai`. */
export interface LangChainMessage {
  type?: string; // "human" | "ai" | "tool"
  content?: unknown;
  name?: string;
  tool_calls?: Array<{ name?: string; args?: Record<string, unknown> }>;
}

/** Valor crudo de una columna (case-insensitive), sin convertir a string. */
export function colRaw(r: RawRow, ...names: string[]): unknown {
  for (const n of names) {
    for (const k of Object.keys(r)) {
      if (k && k.toLowerCase() === n.toLowerCase()) return r[k];
    }
  }
  return undefined;
}

/** Acceso a columna case-insensitive como string — equivalente a `col(r, *names)` de analyze.py. */
export function col(r: RawRow, ...names: string[]): string {
  const v = colRaw(r, ...names);
  return v == null ? "" : String(v);
}

/**
 * Devuelve el mensaje LangChain como objeto. Soporta las dos fuentes:
 *  - CSV/export: la columna `message` es un STRING JSON  -> JSON.parse
 *  - API REST (jsonb): la columna `message` ya es un OBJETO -> se usa tal cual
 */
export function getMessage(r: RawRow): LangChainMessage | null {
  const v = colRaw(r, "message");
  if (v && typeof v === "object") return v as LangChainMessage;
  if (typeof v === "string") return parseMsg(v);
  return null;
}

export function parseMsg(raw: string): LangChainMessage | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LangChainMessage;
  } catch {
    return null;
  }
}

/**
 * Parsea `fecha` (UTC en Supabase) y devuelve los componentes ya en hora LOCAL,
 * aplicando `utcOffsetHours` (Argentina = -3, sin horario de verano).
 * Devuelve { date: "YYYY-MM-DD", hour: 0-23, ms } o null. Réplica de parse_fecha + astimezone.
 */
export function parseFechaLocal(
  s: string,
  utcOffsetHours: number,
): { date: string; hour: number; ms: number } | null {
  let str = (s || "").trim();
  if (!str) return null;
  str = str.replace("Z", "+00:00");

  let ms = Date.parse(str);
  if (Number.isNaN(ms)) {
    // fallback: "YYYY-MM-DD[ T]HH:MM:SS" sin zona -> tratar como UTC
    const m = str.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    ms = Date.parse(`${m[1]}T${m[2]}Z`);
    if (Number.isNaN(ms)) return null;
  } else if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test((s || "").trim())) {
    // Sin tzinfo: Date.parse de un ISO sin zona asume LOCAL del runtime; forzamos UTC.
    const m = str.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (m) ms = Date.parse(`${m[1]}T${m[2]}Z`);
  }

  // Desplazar al huso local y leer componentes en UTC del instante desplazado.
  const shifted = new Date(ms + utcOffsetHours * 3600 * 1000);
  const date = shifted.toISOString().slice(0, 10);
  const hour = shifted.getUTCHours();
  return { date, hour, ms };
}

export function classify(text: string): string {
  const t = (text || "").toLowerCase();
  for (const [name, pat] of INTENTS) {
    if (pat.test(t)) return name;
  }
  return "otro";
}
