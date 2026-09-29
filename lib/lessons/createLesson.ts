// Alta de una lección: la validación de los campos y el insert. Lo comparten el formulario de /admin
// (app/api/admin/lessons) y la lección automática de los lunes (app/api/automation/lessons), así las
// dos puertas validan lo mismo.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isLessonTopic } from "@/lib/lessonTopics";

export interface LessonRow {
  title: string;
  summary: string | null;
  url: string | null;
  body: string | null;
  client_id: string | null;
  topic: string | null;
  starter_order: number | null;
  source_topic?: string | null;
}

/** La categoría se valida contra la lista canónica: un valor raro dejaría un chip fantasma en /lecciones. */
export function parseTopic(raw: string): { topic: string | null } | { error: string } {
  const t = raw.trim();
  if (t && !isLessonTopic(t)) return { error: "categoría desconocida" };
  return { topic: t || null };
}

export function parseStarterOrder(raw: string): { starterOrder: number | null } | { error: string } {
  const r = raw.trim();
  const n = r ? Number(r) : null;
  if (n !== null && (!Number.isInteger(n) || n < 1 || n > 99)) {
    return { error: "el orden de la ruta tiene que ser un número del 1 al 99" };
  }
  return { starterOrder: n };
}

/** Inserta y devuelve el id. `conflict` = ese tema del banco ya tiene una lección (índice único de 0016). */
export async function insertLesson(
  admin: SupabaseClient,
  row: LessonRow,
): Promise<{ id: string } | { error: string; conflict?: boolean }> {
  const ins = await admin.from("lessons").insert(row).select("id").single();
  if (ins.error) {
    return { error: "guardando: " + ins.error.message, conflict: ins.error.code === "23505" };
  }
  return { id: ins.data.id as string };
}
