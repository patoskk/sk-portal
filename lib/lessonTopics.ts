// Categorías de las lecciones. Clasifican por RESULTADO ("¿qué me resuelve
// esto?"), que es la pregunta con la que el cliente entra, y no por dificultad:
// nadie se autodiagnostica como "intermedio" y la etiqueta "principiante"
// incomoda al lector al que le escribimos. El nivel se expresa con la ruta
// inicial (lessons.starter_order), que ordena sin etiquetar a nadie.
//
// Es la lista canónica: la usan los chips de /lecciones, el selector de /admin
// y la validación de la API. Sumar una categoría es agregar una línea acá —
// la columna es texto libre justamente para no necesitar una migración.

export const LESSON_TOPICS = [
  { key: "primeros-pasos", label: "Primeros pasos" },
  { key: "papeles-datos", label: "Tus papeles y tus datos" },
  { key: "criterio", label: "Usarla con criterio" },
  { key: "comunicacion", label: "Vender y comunicar" },
] as const;

export type LessonTopic = (typeof LESSON_TOPICS)[number]["key"];

/** Balde de las lecciones sin categoría (topic null en la base). */
export const TOPIC_SIN = "otras";
export const TOPIC_SIN_LABEL = "Otras";

export function topicLabel(key: string | null): string {
  return LESSON_TOPICS.find((t) => t.key === key)?.label ?? TOPIC_SIN_LABEL;
}

export function isLessonTopic(v: unknown): v is LessonTopic {
  return typeof v === "string" && LESSON_TOPICS.some((t) => t.key === v);
}
