// Lista de clientes para el panel admin (lee con service role; la página ya está gateada).
import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientRow {
  id: string;
  name: string;
  rubro: string;
  table_name: string | null;
}

export async function getClients(): Promise<ClientRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id,name,rubro,client_sources(table_name)")
    .order("created_at");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    rubro: c.rubro,
    table_name: (c.client_sources as { table_name?: string }[] | null)?.[0]?.table_name ?? null,
  }));
}
