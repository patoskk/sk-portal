// Generación de insights con Claude. Compartido entre el cron semanal
// (app/api/cron/insights) y el script manual (scripts/gen-insights.ts).
// Implementa la "regla de oro" de metrics-pdf-report: el valor son las
// OPORTUNIDADES rankeadas por impacto, no los números.
// SDK oficial (retries automáticos en 429/5xx) + structured outputs:
// el JSON de salida está garantizado por schema, sin parseo por regex.
import Anthropic from "@anthropic-ai/sdk";
import { REGISTRO_MARCA } from "@/lib/brandVoice";
import { toolLabel } from "@/lib/toolLabels";

export const INSIGHTS_MODEL = "claude-sonnet-5"; // semanal/barato; "claude-opus-4-8" para máxima calidad

export interface InsightOut {
  opportunities?: { title: string; text: string }[];
  funnel_insight?: string;
  products_insight?: string;
  usage_insight?: string;
  activity_insight?: string;
  misses_insight?: string;
  proxima_etapa?: string;
}

const SYSTEM =
  "Sos analista de SK Optimal (agencia de agentes de IA, Argentina). Escribís en español rioplatense, " +
  "para un dueño de negocio no técnico. El agente puede ser de CUALQUIER rubro: inferí qué hace por los " +
  "NOMBRES de las herramientas que usa y por los volúmenes (no asumas que es un almacén). " +
  "Regla de oro: el valor son las OPORTUNIDADES, rankeadas por impacto: lo que hace perder clientes/ventas " +
  "o degrada el servicio va primero — típicamente baja tasa de CONVERSIÓN (conversations vs conversion_sessions, " +
  "el evento clave: pedido/turno/reserva), consultas sin resultado, errores de herramientas, " +
  "o caídas de uso. No hay datos de tiempo de respuesta: no lo menciones.\n" +
  "Si vienen `conversiones_por_tipo`, ese negocio cierra VARIOS eventos distintos (p. ej. pedidos " +
  "y turnos): analizalos por separado, nunca los sumes, y usá el `label` de cada tipo al nombrarlos.\n\n" +
  "SÉ MUY CONCISO. Prohibido el texto largo. Reglas estrictas:\n" +
  "- title: 3 a 6 palabras, sin emojis, sin dos puntos.\n" +
  "- text de cada oportunidad: UNA o DOS frases cortas (máx ~25 palabras). Dato clave + acción.\n" +
  "- cada *_insight: UNA frase corta (máx ~20 palabras) sobre ese aspecto; si no aplica, dejá string vacío.\n" +
  "- opportunities: entre 3 y 5.\n" +
  "- Nunca escribas un nombre técnico tal como viene en los datos (conversations, conversion_sessions, " +
  "no_result, tool_calls, messages_human): decilo en palabras del dueño (las conversaciones, los pedidos, " +
  "las consultas sin resultado, las acciones del agente, los mensajes de tus clientes). Las herramientas " +
  "ya vienen con su nombre para el cliente: usalo tal cual.\n\n" +
  // lo lee el dueño en su Panel sin que nadie lo revise antes
  REGISTRO_MARCA;

// Columnas que el cómputo todavía guarda pero que Claude NO tiene que ver. El tiempo de
// respuesta sale de la hora de INSERT de n8n (el mensaje del cliente y el del agente se
// escriben casi juntos), así que no mide nada real: por eso se sacó del Panel el 30/06.
// Seguía llegando acá y Claude escribía "el tiempo de respuesta supera los 8 segundos"
// como oportunidad, que el dueño lee como un dato. Se filtra en este único lugar porque
// por acá pasan el cron, el botón del admin y scripts/gen-insights.ts.
const OCULTAS_A_CLAUDE = new Set(["response_sum_sec", "response_count"]);

// Lo que viaja a Claude: sin las columnas de arriba y con cada herramienta con el nombre que
// ve el cliente en su Panel (lib/toolLabels.ts). Con el nombre crudo, Claude escribía
// "STOCK y PEDIDOS… GET_PROMOS e IMAGENES" y el dueño lo leía así.
function paraClaude(summary: unknown): string {
  return JSON.stringify(summary, (k, v) => {
    if (OCULTAS_A_CLAUDE.has(k)) return undefined;
    if (k === "tool" && typeof v === "string") return toolLabel(v);
    return v;
  });
}

// Schema del JSON de salida (structured outputs): mismo shape que InsightOut.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, text: { type: "string" } },
        required: ["title", "text"],
        additionalProperties: false,
      },
    },
    usage_insight: { type: "string" },
    products_insight: { type: "string" },
    activity_insight: { type: "string" },
    misses_insight: { type: "string" },
    proxima_etapa: { type: "string" },
  },
  required: [
    "opportunities",
    "usage_insight",
    "products_insight",
    "activity_insight",
    "misses_insight",
    "proxima_etapa",
  ],
  additionalProperties: false,
} as const;

export async function generateInsight(
  summary: unknown,
  model: string = INSIGHTS_MODEL,
): Promise<InsightOut> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("falta ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    // tarea corta de redacción: sin thinking, que el presupuesto sea todo salida
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          "Datos resumidos del período (tablas diarias del portal). Generá los insights:\n\n" +
          paraClaude(summary),
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude rechazó el pedido (refusal)");
  if (response.stop_reason === "max_tokens") throw new Error("Claude cortó por longitud (subí max_tokens)");
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  // structured outputs garantiza JSON válido según OUTPUT_SCHEMA
  const out = JSON.parse(text) as InsightOut;
  out.funnel_insight = ""; // legado: el dashboard ya no lo usa
  return out;
}
