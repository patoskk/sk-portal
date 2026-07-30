// Claude redacta el copy del aviso leyendo la lección. Pato lo EDITA en pantalla
// antes de enviar (gate humano obligatorio) — esto es un borrador, no un envío.
// Mismo patrón que lib/insights/generate.ts: SDK oficial + structured outputs
// (JSON garantizado por schema, sin parseo por regex) y thinking desactivado.
import Anthropic from "@anthropic-ai/sdk";

export const DRAFT_MODEL = "claude-sonnet-5";

export interface LessonDraft {
  subject: string;
  intro: string;
  summary: string;
  why: string[];
}

// Voz de la skill nutricion-ia: enseñar para ganar confianza, NO vender
// (son clientes actuales). Ver memoria nutricion-ia-voz.
const SYSTEM =
  "Escribís mails de SK Optimal (agencia de agentes de IA, Argentina) para los clientes ACTUALES de la agencia: " +
  "dueños de negocio de +35 años, no técnicos. Español rioplatense, tono de profesor amable y directo. " +
  "Avisás que subiste una lección nueva al portal del cliente.\n\n" +
  "PROHIBIDO VENDER. Ya son clientes: no hay oferta, no hay llamada, no hay 'agendá una demo'. " +
  "No uses la expresión 'en criollo'. Nada de emojis. Nada de signos de exclamación.\n\n" +
  "Reglas duras:\n" +
  "- subject: TODO en minúscula (salvo nombres propios), máximo 60 caracteres, sin emojis, sin signos de " +
  "exclamación, sin corchetes. Prohibidas las palabras de promoción: gratis, oferta, imperdible, exclusivo, " +
  "descuento, novedad, promo, urgente. Que suene a mail de una persona, no a campaña.\n" +
  "- intro: UNA frase avisando que hay material nuevo. Máximo 15 palabras.\n" +
  "- summary: 1 o 2 frases de qué trata la lección. Máximo 35 palabras. Concreto, sin adjetivos vacíos.\n" +
  "- why: 2 o 3 bullets de por qué le conviene LEERLA. Cada uno máximo 18 palabras. " +
  "Tienen que decir un RESULTADO concreto que se lleva ('vas a poder revisar en 5 minutos qué le " +
  "preguntaron a tu agente y no supo responder'), no una opinión ('es muy útil', 'está buenísima'). " +
  "Si la lección es específica de un caso, que uno de los bullets diga para quién es.\n" +
  "- No repitas el título dentro de intro, summary ni why: el mail ya lo muestra aparte.";

// OJO: structured outputs NO soporta restricciones de cantidad en arrays
// (minItems distinto de 0/1 y maxItems dan 400 invalid_request_error).
// La cantidad de bullets se pide en el prompt y se recorta acá abajo.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    intro: { type: "string" },
    summary: { type: "string" },
    why: { type: "array", items: { type: "string" } },
  },
  required: ["subject", "intro", "summary", "why"],
  additionalProperties: false,
} as const;

const MAX_WHY = 3;

const MAX_CHARS = 8000; // el cuerpo de la lección recortado: alcanza y sobra

/** HTML de la lección -> texto plano legible para el modelo. */
export function lessonToText(body: string | null): string {
  if (!body) return "";
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|h1|h2|h3|h4|li|div|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
}

export async function draftLessonEmail(input: {
  title: string;
  summary: string | null;
  body: string | null;
  url: string | null;
  clientName?: string;
}): Promise<LessonDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("falta ANTHROPIC_API_KEY");

  const contenido = lessonToText(input.body);
  const ctx = [
    `Título de la lección: ${input.title}`,
    input.summary ? `Resumen que ya tiene cargado: ${input.summary}` : "",
    // sin body (lección por link externo) el modelo trabaja con título + resumen
    contenido
      ? `Contenido de la lección:\n${contenido}`
      : `La lección es un enlace externo (${input.url ?? "sin url"}), no tenemos el texto: trabajá con el título y el resumen.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DRAFT_MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${ctx}\n\nRedactá el aviso por mail para los clientes.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude rechazó el pedido (refusal)");
  if (response.stop_reason === "max_tokens") throw new Error("Claude cortó por longitud");
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const out = JSON.parse(text) as LessonDraft;
  out.subject = out.subject.trim();
  // el schema no puede limitar la cantidad: se recorta acá
  out.why = (out.why ?? []).map((w) => w.trim()).filter(Boolean).slice(0, MAX_WHY);
  return out;
}
