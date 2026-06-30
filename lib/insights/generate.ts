// Generación de insights con Claude. Compartido entre el cron semanal
// (app/api/cron/insights) y el script manual (scripts/gen-insights.ts).
// Implementa la "regla de oro" de metrics-pdf-report: el valor son las
// OPORTUNIDADES rankeadas por impacto, no los números.
// (Solo lo importan el route y el script; ambos son server-side.)

export const INSIGHTS_MODEL = "claude-sonnet-4-6"; // semanal/barato; "claude-opus-4-8" para máxima calidad

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
  "tiempos de respuesta altos, o caídas de uso.\n\n" +
  "SÉ MUY CONCISO. Prohibido el texto largo. Reglas estrictas:\n" +
  "- title: 3 a 6 palabras, sin emojis, sin dos puntos.\n" +
  "- text de cada oportunidad: UNA o DOS frases cortas (máx ~25 palabras). Dato clave + acción.\n" +
  "- cada *_insight: UNA frase corta (máx ~20 palabras) sobre ese aspecto; si no aplica, dejá string vacío.\n" +
  "Devolvé SOLO JSON válido con las claves: opportunities (array de {title,text}, 3 a 5), " +
  "usage_insight (uso de herramientas), products_insight (lo más consultado por los clientes), " +
  "activity_insight (días/horas), misses_insight (sin resultado/errores y tasa de conversión), " +
  "proxima_etapa. (funnel_insight: dejalo vacío.)";

export async function generateInsight(
  summary: unknown,
  model: string = INSIGHTS_MODEL,
): Promise<InsightOut> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("falta ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content:
            "Datos resumidos del período (tablas diarias del portal). Generá los insights:\n\n" +
            JSON.stringify(summary),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    stop_reason?: string;
  };
  const text = json.content.find((b) => b.type === "text")?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : "{}";
  try {
    return JSON.parse(raw) as InsightOut;
  } catch (e) {
    if (json.stop_reason === "max_tokens") {
      throw new Error("Claude cortó la respuesta por longitud (subí max_tokens).");
    }
    throw new Error(
      `JSON inválido de Claude (${(e as Error).message}).\n--- respuesta ---\n${text.slice(0, 6000)}`,
    );
  }
}
