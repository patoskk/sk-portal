// Port de la lógica de extracción de analyze.py, reorganizada para agregar POR DÍA
// (en vez de un único report_data.json). El cron upserta estas filas por cliente.
//
// Fidelidad clave respecto de analyze.py:
//  - pedido = tool_call PEDIDOS (evento de dinero)
//  - quiebre = mensaje tool con "No se encontraron productos" -> query_buscada
//  - error  = mensaje tool con ERR_RE
//  - conversión = sesiones-con-pedido / sesiones (se calcula al leer, sobre el rango)
//  - tiempo de respuesta = Δ human->ai en [0,1800]s

import {
  RawRow,
  col,
  getMessage,
  parseFechaLocal,
  classify,
  MISS_RE,
  ERR_RE,
  QBUSC_RE,
} from "./parse";
import type {
  ComputeResult,
  MetricsDailyRow,
  ProductQueryDailyRow,
  ToolUsageDailyRow,
  ActivityHourlyRow,
  IntentDailyRow,
} from "./types";

interface DayBucket {
  sessions: Set<string>;
  orderSessions: Set<string>;
  stockSessions: Set<string>;
  messagesHuman: number;
  messagesTotal: number;
  stockQueries: number;
  orders: number;
  errors: number;
  toolResults: number;
  imagesSent: number;
  responseSumSec: number;
  responseCount: number;
  byHour: Map<number, number>;
  stockQ: Map<string, number>; // producto -> count (found)
  stockMiss: Map<string, number>; // producto -> count (no encontrado)
  tools: Map<string, number>;
  intents: Map<string, number>;
}

function newBucket(): DayBucket {
  return {
    sessions: new Set(),
    orderSessions: new Set(),
    stockSessions: new Set(),
    messagesHuman: 0,
    messagesTotal: 0,
    stockQueries: 0,
    orders: 0,
    errors: 0,
    toolResults: 0,
    imagesSent: 0,
    responseSumSec: 0,
    responseCount: 0,
    byHour: new Map(),
    stockQ: new Map(),
    stockMiss: new Map(),
    tools: new Map(),
    intents: new Map(),
  };
}

function inc<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

/**
 * Computa las filas resumen por día a partir de filas crudas (esquema LangChain).
 * @param rows filas del Supabase del cliente (delta o histórico)
 * @param utcOffsetHours huso local del cliente (default -3, Argentina)
 */
export function computeDaily(rows: RawRow[], utcOffsetHours = -3): ComputeResult {
  const days = new Map<string, DayBucket>();
  const bucket = (d: string): DayBucket => {
    let b = days.get(d);
    if (!b) days.set(d, (b = newBucket()));
    return b;
  };

  // último timestamp humano por sesión, para medir tiempo de respuesta
  const lastHumanMs = new Map<string, number>();

  for (const r of rows) {
    const sid = col(r, "session_id").trim();
    const msg = getMessage(r);
    const f = parseFechaLocal(col(r, "fecha"), utcOffsetHours);

    // by_hour / by_date / sesiones cuentan a nivel fila (igual que analyze.py)
    if (f) {
      const b = bucket(f.date);
      inc(b.byHour, f.hour);
      if (sid) b.sessions.add(sid);
    }
    if (!msg) continue;

    // El día contable del mensaje es el de su fecha; si no hay fecha, se ignora en agregados temporales.
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
      if (f && sid && lastHumanMs.has(sid)) {
        const dt = (f.ms - (lastHumanMs.get(sid) as number)) / 1000;
        if (b && dt >= 0 && dt <= 1800) {
          b.responseSumSec += dt;
          b.responseCount += 1;
        }
        lastHumanMs.delete(sid);
      }
      for (const tc of msg.tool_calls ?? []) {
        const name = tc.name ?? "";
        const a = tc.args ?? {};
        if (b) inc(b.tools, name);
        if (name === "STOCK") {
          if (b && sid) b.stockSessions.add(sid);
          if (b) b.stockQueries += 1;
          const q = typeof a.query === "string" ? a.query.trim().toLowerCase() : "";
          if (b && q) inc(b.stockQ, q);
        } else if (name === "GET_PROMOS") {
          // promos quedan registradas en tools (GET_PROMOS); el detalle por query
          // se reconstruye si se necesita. Mantenemos paridad con el donut de uso.
        } else if (name === "PEDIDOS") {
          if (b) b.orders += 1;
          if (b && sid) b.orderSessions.add(sid);
        }
      }
    } else if (mtype === "tool") {
      if (b) b.toolResults += 1;
      const content = msg.content;
      const cstr = typeof content === "string" ? content : JSON.stringify(content ?? "");
      if (b && msg.name === "IMAGENES" && cstr.includes("data_url")) b.imagesSent += 1;
      if (b && ERR_RE.test(cstr)) b.errors += 1;
      if (b && MISS_RE.test(cstr)) {
        const m = QBUSC_RE.exec(cstr);
        const q = m ? m[1].trim().toLowerCase() : "(desconocido)";
        inc(b.stockMiss, q);
      }
    }
  }

  // ---- aplanar a filas de tabla ----
  const metricsDaily: MetricsDailyRow[] = [];
  const productQueries: ProductQueryDailyRow[] = [];
  const toolUsage: ToolUsageDailyRow[] = [];
  const activityHourly: ActivityHourlyRow[] = [];
  const intentDaily: IntentDailyRow[] = [];

  for (const [date, b] of [...days.entries()].sort()) {
    metricsDaily.push({
      date,
      conversations: b.sessions.size,
      order_sessions: b.orderSessions.size,
      stock_sessions: b.stockSessions.size,
      messages_human: b.messagesHuman,
      messages_total: b.messagesTotal,
      stock_queries: b.stockQueries,
      orders: b.orders,
      errors: b.errors,
      tool_results: b.toolResults,
      images_sent: b.imagesSent,
      response_sum_sec: Math.round(b.responseSumSec),
      response_count: b.responseCount,
    });
    for (const [product, count] of b.stockQ) productQueries.push({ date, product, count, found: true });
    for (const [product, count] of b.stockMiss) productQueries.push({ date, product, count, found: false });
    for (const [tool, count] of b.tools) toolUsage.push({ date, tool, count });
    for (const [hour, count] of [...b.byHour.entries()].sort((x, y) => x[0] - y[0]))
      activityHourly.push({ date, hour, count });
    for (const [intent, count] of b.intents) intentDaily.push({ date, intent, count });
  }

  return { metricsDaily, productQueries, toolUsage, activityHourly, intentDaily };
}
