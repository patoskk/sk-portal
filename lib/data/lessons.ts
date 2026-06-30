// Capa de datos de la sección "Lecciones". RLS filtra: cada usuario ve las
// lecciones globales (client_id null) + las de su cliente.
import { createClient } from "@/lib/supabase/server";

export interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string;
}

export async function getLessons(): Promise<Lesson[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("lessons")
    .select("id,title,summary,url,published_at")
    .order("published_at", { ascending: false });
  return (data ?? []) as Lesson[];
}