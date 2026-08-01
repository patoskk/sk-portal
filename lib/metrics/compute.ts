// Extracción de métricas GENÉRICAS (rubro-agnósticas) a partir de las filas crudas
// (esquema LangChain: session_id, message jsonb, fecha). No depende de nombres de
// herramientas: cuenta lo que haya. La interpretación por rubro la hace Claude (insights).

import {
  RawRow,
  col,
  getMessage,
  parseFechaLocal,
  classify,
  ERR_RE,
  NO_RESULT_RE,
  CONVERSION_RE,
  CONVERSION_ORDER_RE,
  CONVERSION_BOOKING_RE,
  CONVERSION_TOOL_RE,
  PII_RE,
  QUERY_KEYS,
  type ConversionKind,
} from "./parse";
import type {
  ComputeResult,
  MetricsDailyRow,
  ConversionDailyRow,
  ToolUsageDailyRow,
  ToolQueryDailyRow,
  ActivityHourlyRow,
  IntentDailyRow,
} from "./types";

interface DayBucket {
  sessions: Set<string>;
  messagesHuman: number;
  messagesAgent: number;
  messagesTotal: number;
  toolCalls: number;
  // conversiones por sesión, separadas por señal: el MISMO pedido suele disparar
  // el mensaje declarativo Y la tool de pedido; contar max() evita el doble conteo.
  convByMsg: Map<string, number>;
  convByTool: Map<string, number>;
  // lo mismo, pero por TIPO de conversión (pedidos / turnos): kind -> sesión -> eventos
  kindByMsg: Map<string, Map<string, number>>;
  kindByTool: Map<string, Map<string, number>>;
  noResult: number;
  errors: number;
  toolResults: number;
  responseSumSec: number;
  responseCount: number;
  byHour: Map<number, number>;
  tools: Map<string, number>;
  queries: Map<string, number>; // "lo más consultado" (args de tools de búsqueda, sin PII)
  intents: Map<string, number>;
}

function newBucket(): DayBucket {
  return {
    sessions: new Set(),
    messagesHuman: 0,
    messagesAgent: 0,
    messagesTotal: 0,
    toolCalls: 0,
    convByMsg: new Map(),
    convByTool: new Map(),
    kindByMsg: new Map(),
    kindByTool: new Map(),
    noResult: 0,
    errors: 0,
    toolResults: 0,
    responseSumSec: 0,
    responseCount: 0,
    byHour: new Map(),
    tools: new Map(),
    queries: new Map(),
    intents: new Map(),
  };
}

function inc<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

// mapa anidado kind -> sesión -> n
function incNested(m: Map<string, Map<string, number>>, kind: string, session: string): void {
  let inner = m.get(kind);
  if (!inner) m.set(kind, (inner = new Map()));
  inc(inner, session);
}

// Recorre los args de una tool y junta valores bajo claves de producto/consulta,
// en cualquier nivel (ej. items[].producto). Descarta PII y strings largos.
function collectQueries(node: unknown, out: Map<string, number>, keyMatched = false): void {
  if (typeof node === "string") {
    if (keyMatched) {
      const q = node.trim();
      if (q && q.length <= 50 && !PII_RE.test(q)) inc(out, q.toLowerCase());
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectQueries(v, out, keyMatched);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) collectQueries(v, out, QUERY_KEYS.test(k));
  }
}

/**
 * `kinds` (opcional) separa el evento clave en varios tipos — p. ej. un centro de
 * wellness que vende productos Y agenda turnos. Sin `kinds` el resultado es idéntico
 * al de siempre: `conversionsDaily` queda vacío y nada más cambia.
 */
export function computeDaily(
  rows: RawRow[],
  utcOffsetHours = -3,
  kinds: ConversionKind[] = [],
): ComputeResult {
  const days = new Map<string, DayBucket>();
  const bucket = (d: string): DayBucket => {
    let b = days.get(d);
    if (!b) days.set(d, (b = newBucket()));
    return b;
  };
  const lastHumanMs = new Map<string, number>();

  for (const r of rows) {
    const sid = col(r, "session_id").trim();
    const msg = getMessage(r);
    const f = parseFechaLocal(col(r, "fecha"), utcOffsetHours);

    if (f) {
      const b = bucket(f.date);
      inc(b.byHour, f.hour);
      if (sid) b.sessions.add(sid);
    }
    if (!msg) continue;

    const day = f?.date;
    const b = day ? bucket(day) : null;
    if (b) b.messagesTotal += 1;

    const mtype = msg.type ?? "";

    if (mtype === "human") {
      const text = col(r, "Texto") || (typeof msg.content === "string" ? msg.content : "");
      if (b) {
        b.messagesHuman += 1;
        inc(b.intents, classify(text));
      }
      if (f && sid) lastHumanMs.set(sid, f.ms);
    } else if (mtype === "ai") {
      if (b) b.messagesAgent += 1;
      if (f && sid && lastHumanMs.has(sid)) {
        const dt = (f.ms - (lastHumanMs.get(sid) as number)) / 1000;
        if (b && dt >= 0 && dt <= 1800) {
          b.responseSumSec += dt;
          b.responseCount += 1;
        }
        lastHumanMs.delete(sid);
      }
      // evento clave por mensaje del agente (cierre declarativo)
      const aiText = typeof msg.content === "string" ? msg.content : "";
      const session = sid || "(sin sesión)";
      if (b && aiText && CONVERSION_RE.test(aiText)) {
        inc(b.convByMsg, session);
      }
      if (b && aiText) {
        for (const k of kinds) {
          if (!k.signal) continue;
          const re = k.signal === "order" ? CONVERSION_ORDER_RE : CONVERSION_BOOKING_RE;
          if (re.test(aiText)) incNested(b.kindByMsg, k.key, session);
        }
      }
      for (const tc of msg.tool_calls ?? []) {
        const name = (tc.name ?? "").trim() || "(sin nombre)";
        if (b) {
          b.toolCalls += 1;
          inc(b.tools, name);
          const upper = name.toUpperCase();
          for (const k of kinds) {
            if (k.tools.includes(upper)) incNested(b.kindByTool, k.key, session);
          }
          if (CONVERSION_TOOL_RE.test(name)) {
            // evento clave por nombre de tool (pedido/order/reserva/turno…)
            inc(b.convByTool, session);
          } else {
            // "lo más consultado": valores bajo claves de producto/consulta (anidados, sin PII)
            collectQueries(tc.args ?? {}, b.queries);
          }
        }
      }
    } else if (mtype === "tool") {
      if (b) {
        b.toolResults += 1;
        const content = msg.content;
        const cstr = typeof content === "string" ? content : JSON.stringify(content ?? "");
        if (ERR_RE.test(cstr)) b.errors += 1;
        else if (NO_RESULT_RE.test(cstr)) b.noResult += 1;
      }
    }
  }

  const metricsDaily: MetricsDailyRow[] = [];
  const conversionsDaily: ConversionDailyRow[] = [];
  const toolUsage: ToolUsageDailyRow[] = [];
  const toolQueries: ToolQueryDailyRow[] = [];
  const activityHourly: ActivityHourlyRow[] = [];
  const intentDaily: IntentDailyRow[] = [];

  for (const [date, b] of [...days.entries()].sort()) {
    // por sesión-día: max(señal mensaje, señal tool) — un pedido dispara ambas
    const convSessions = new Set([...b.convByMsg.keys(), ...b.convByTool.keys()]);
    let conversions = 0;
    for (const s of convSessions) {
      conversions += Math.max(b.convByMsg.get(s) ?? 0, b.convByTool.get(s) ?? 0);
    }
    metricsDaily.push({
      date,
      conversations: b.sessions.size,
      messages_human: b.messagesHuman,
      messages_agent: b.messagesAgent,
      messages_total: b.messagesTotal,
      tool_calls: b.toolCalls,
      conversions,
      conversion_sessions: convSessions.size,
      no_result: b.noResult,
      errors: b.errors,
      tool_results: b.toolResults,
      response_sum_sec: Math.round(b.responseSumSec),
      response_count: b.responseCount,
    });
    // una fila por tipo y por día SIEMPRE (aunque sea 0): el upsert del cómputo
    // incremental tiene que poder pisar un día que quedó viejo con otro valor.
    for (const k of kinds) {
      const byMsg = b.kindByMsg.get(k.key);
      const byTool = b.kindByTool.get(k.key);
      const sessions = new Set([...(byMsg?.keys() ?? []), ...(byTool?.keys() ?? [])]);
      let events = 0;
      for (const s of sessions) {
        // el MISMO cierre suele disparar la tool y el mensaje declarativo: max() evita duplicar
        events += Math.max(byMsg?.get(s) ?? 0, byTool?.get(s) ?? 0);
      }
      conversionsDaily.push({ date, kind: k.key, sessions: sessions.size, events });
    }
    for (const [tool, count] of b.tools) toolUsage.push({ date, tool, count });
    for (const [query, count] of b.queries) toolQueries.push({ date, query, count });
    for (const [hour, count] of [...b.byHour.entries()].sort((x, y) => x[0] - y[0]))
      activityHourly.push({ date, hour, count });
    for (const [intent, count] of b.intents) intentDaily.push({ date, intent, count });
  }

  return { metricsDaily, conversionsDaily, toolUsage, toolQueries, activityHourly, intentDaily };
}
