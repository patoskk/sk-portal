// Tipos de novedad. Viven APARTE de lib/data/updates.ts a propósito: ese módulo
// importa los clientes Supabase (server-only), así que un componente de cliente
// que traiga de ahí un valor —no un tipo— rompe el build entero.
// Mismo criterio que lib/toolLabels.ts.

export type UpdateKind = "nuevo" | "mejora" | "arreglo";

export const UPDATE_KINDS: { key: UpdateKind; label: string }[] = [
  { key: "nuevo", label: "Nuevo" },
  { key: "mejora", label: "Mejora" },
  { key: "arreglo", label: "Arreglo" },
];

export const UPDATE_KIND_KEYS: string[] = UPDATE_KINDS.map((k) => k.key);

export function isUpdateKind(v: string): v is UpdateKind {
  return UPDATE_KIND_KEYS.includes(v);
}
