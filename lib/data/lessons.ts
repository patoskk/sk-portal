// Capa de datos de la sección "Lecciones". RLS filtra: cada usuario ve las
// lecciones globales (client_id null) + las de su cliente.
import { createClient } from "@/lib/supabase/server";

export interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string;
  readMinutes: number | null; // estimado sobre el body (null si es solo link)
}

// Los documentos educativos (nutricion-ia) declaran su lectura en window.DOC:
// usar ese número. Para HTML plano, ~200 palabras/min sin <style>/<script>/tags.
function estimateMinutes(body: string | null): number | null {
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

export async function getLessons(): Promise<Lesson[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("lessons")
    .select("id,title,summary,url,published_at,body")
    .order("published_at", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    summary: l.summary,
    url: l.url,
    published_at: l.published_at,
    readMinutes: estimateMinutes(l.body as string | null),
  }));
}
