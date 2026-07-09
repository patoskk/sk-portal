// Lista de clientes para el panel admin (lee con service role; la página ya está gateada).
import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientRow {
  id: string;
  name: string;
  rubro: string;
  table_name: string | null;
  last_synced_at: string | null;
}

export async function getClients(): Promise<ClientRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id,name,rubro,client_sources(table_name,last_synced_at)")
    .order("created_at");
  return (data ?? []).map((c) => {
    // client_sources es 1-a-1 (client_id es PK): PostgREST devuelve un OBJETO,
    // no un array — indexar [0] daba siempre undefined ("tabla: ?" en el panel).
    const rel = c.client_sources as
      | { table_name?: string; last_synced_at?: string }
      | { table_name?: string; last_synced_at?: string }[]
      | null;
    const src = Array.isArray(rel) ? rel[0] : rel;
    return {
      id: c.id,
      name: c.name,
      rubro: c.rubro,
      table_name: src?.table_name ?? null,
      last_synced_at: src?.last_synced_at ?? null,
    };
  });
}
