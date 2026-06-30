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
  CONVERSION_TOOL_RE,
} from "./parse";
import type {
  ComputeResult,
  MetricsDailyRow,
  ToolUsageDailyRow,
  ActivityHourlyRow,
  IntentDailyRow,
} from "./types";

interface DayBucket {
  sessions: Set<string>;
  messagesHuman: number;
  messagesAgent: number;
  messagesTotal: number;
  toolCalls: number;
  conversions: number;
  conversionSessions: Set<string>;
  noResult: number;
  errors: number;
  toolResults: number;
  responseSumSec: number;
  responseCount: number;
  byHour: Map<number, number>;
  tools: Map<string, number>;
  intents: Map<string, number>;
}

function newBucket(): DayBucket {
  return {
    sessions: new Set(),
    messagesHuman: 0,
    messagesAgent: 0,
    messagesTotal: 0,
    toolCalls: 0,
    conversions: 0,
    conversionSessions: new Set(),
    noResult: 0,
    errors: 0,
    toolResults: 0,
    responseSumSec: 0,
    responseCount: 0,
    byHour: new Map(),
    tools: new Map(),
    intents: new Map(),
  };
}

function inc<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

export function computeDaily(rows: RawRow[], utcOffsetHours = -3): ComputeResult {
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
      if (b && aiText && CONVERSION_RE.test(aiText)) {
        b.conversions += 1;
        if (sid) b.conversionSessions.add(sid);
      }
      for (const tc of msg.tool_calls ?? []) {
        const name = (tc.name ?? "").trim() || "(sin nombre)";
        if (b) {
          b.toolCalls += 1;
          inc(b.tools, name);
          // evento clave por nombre de tool (pedido/order/reserva/turno…)
          if (CONVERSION_TOOL_RE.test(name)) {
            b.conversions += 1;
            if (sid) b.conversionSessions.add(sid);
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
  const toolUsage: ToolUsageDailyRow[] = [];
  const activityHourly: ActivityHourlyRow[] = [];
  const intentDaily: IntentDailyRow[] = [];

  for (const [date, b] of [...days.entries()].sort()) {
    metricsDaily.push({
      date,
      conversations: b.sessions.size,
      messages_human: b.messagesHuman,
      messages_agent: b.messagesAgent,
      messages_total: b.messagesTotal,
      tool_calls: b.toolCalls,
      conversions: b.conversions,
      conversion_sessions: b.conversionSessions.size,
      no_result: b.noResult,
      errors: b.errors,
      tool_results: b.toolResults,
      response_sum_sec: Math.round(b.responseSumSec),
      response_count: b.responseCount,
    });
    for (const [tool, count] of b.tools) toolUsage.push({ date, tool, count });
    for (const [hour, count] of [...b.byHour.entries()].sort((x, y) => x[0] - y[0]))
      activityHourly.push({ date, hour, count });
    for (const [intent, count] of b.intents) intentDaily.push({ date, intent, count });
  }

  return { metricsDaily, toolUsage, activityHourly, intentDaily };
}
