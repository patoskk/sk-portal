// Capa de datos de la sección "Lecciones". RLS filtra: cada usuario ve las
// lecciones globales (client_id null) + las de su cliente.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  why: string[]; // "por qué te conviene verla" (se guarda una línea por bullet)
  url: string | null;
  published_at: string;
  readMinutes: number | null; // estimado sobre el body (null si es solo link)
}

/** Lección + estado del aviso por mail. Solo para el panel Admin. */
export interface AdminLesson extends Lesson {
  notified_at: string | null;
  notified: { sent: number; queued: number; error: number };
}

// Los documentos educativos (nutricion-ia) declaran su lectura en window.DOC:
// usar ese número. Para HTML plano, ~200 palabras/min sin <style>/<script>/tags.
export function estimateMinutes(body: string | null): number | null {
  if (!body) return null;
  const declared = body.match(/"lectura"\s*:\s*"(\d+)\s*min/);
  if (declared) return Number(declared[1]);
  const words = body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function splitWhy(why: unknown): string[] {
  return typeof why === "string" ? why.split("\n").map((w) => w.trim()).filter(Boolean) : [];
}

const SELECT = "id,title,summary,why,url,published_at,body";

interface Row {
  id: string;
  title: string;
  summary: string | null;
  why: string | null;
  url: string | null;
  published_at: string;
  body: string | null;
}

function toLesson(l: Row): Lesson {
  return {
    id: l.id,
    title: l.title,
    summary: l.summary,
    why: splitWhy(l.why),
    url: l.url,
    published_at: l.published_at,
    readMinutes: estimateMinutes(l.body),
  };
}

export async function getLessons(): Promise<Lesson[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("lessons")
    .select(SELECT)
    .order("published_at", { ascending: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as Row[]).map(toLesson);
}

// lesson_notifications no tiene policy para authenticated (deny total): el estado
// del aviso se lee con service role, solo desde el panel Admin.
export async function getLessonsForAdmin(): Promise<AdminLesson[]> {
  const admin = createAdminClient();
  const [lessons, notifs] = await Promise.all([
    admin
      // literal, no SELECT + "...": supabase-js infiere los tipos del string
      .from("lessons")
      .select("id,title,summary,why,url,published_at,body,notified_at")
      .order("published_at", { ascending: true })
      .order("created_at", { ascending: true }),
    admin.from("lesson_notifications").select("lesson_id,status"),
  ]);

  const counts = new Map<string, { sent: number; queued: number; error: number }>();
  for (const n of notifs.data ?? []) {
    const id = n.lesson_id as string;
    const c = counts.get(id) ?? { sent: 0, queued: 0, error: 0 };
    const s = n.status as "sent" | "queued" | "error";
    if (s === "sent" || s === "queued" || s === "error") c[s] += 1;
    counts.set(id, c);
  }

  return ((lessons.data ?? []) as (Row & { notified_at: string | null })[]).map((l) => ({
    ...toLesson(l),
    notified_at: l.notified_at,
    notified: counts.get(l.id) ?? { sent: 0, queued: 0, error: 0 },
  }));
}
