// Capa de datos de "Novedades": qué le fuimos haciendo al agente del cliente.
// RLS filtra igual que en lecciones: globales (client_id null) + las propias.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUpdateKind, type UpdateKind } from "@/lib/updateKinds";

export type { UpdateKind };

export interface Update {
  id: string;
  kind: UpdateKind;
  title: string;
  body: string | null;
  published_at: string;
  client_id: string | null;
}

const SELECT = "id,kind,title,body,published_at,client_id";

function toUpdate(r: Record<string, unknown>): Update {
  const kind = r.kind as string;
  return {
    id: r.id as string,
    // el check de la tabla ya lo limita; el fallback cubre filas viejas si el
    // día de mañana se agrega un tipo y el deploy llega antes que la migración
    kind: isUpdateKind(kind) ? kind : "mejora",
    title: r.title as string,
    body: (r.body as string | null) ?? null,
    published_at: r.published_at as string,
    client_id: (r.client_id as string | null) ?? null,
  };
}

export async function getUpdates(): Promise<Update[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("updates")
    .select(SELECT)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map(toUpdate);
}

/** Fecha de la novedad más reciente visible, para el punto del sidebar.
 *  cache(): corre en cada navegación desde el layout. */
export const getLatestUpdateAt = cache(async function getLatestUpdateAt(): Promise<string | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("updates")
    .select("published_at")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.published_at as string | null) ?? null;
});

// El panel Admin lista TODAS (globales y de cualquier cliente): service role.
export async function getUpdatesForAdmin(): Promise<Update[]> {
  const { data } = await createAdminClient()
    .from("updates")
    .select(SELECT)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map(toUpdate);
}
