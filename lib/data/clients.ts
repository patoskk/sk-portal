// Lista de clientes para el panel admin (lee con service role; la página ya está gateada).
import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientRow {
  id: string;
  name: string;
  rubro: string;
  table_name: string | null;
  last_synced_at: string | null;
  last_data_at: string | null; // último día con métricas: sync verde + dato viejo = fuente muerta
  // último uso de herramienta reportado por n8n. Sin esto quedan en cero "Acciones
  // del agente", "Uso de herramientas" y "Lo más consultado" — y no avisa nada más.
  last_tool_event_at: string | null;
  // contacto del DUEÑO: a dónde van los avisos de lecciones. Distinto del mail
  // con el que se creó la cuenta del portal (ese suele ser el de la empresa).
  contact_name: string | null;
  contact_email: string | null;
  notify_lessons: boolean;
  // piso de métricas: se cerró el período de prueba y lo anterior se borró
  metrics_from: string | null;
}

/** Fila cruda de `clients`: `metrics_from` es opcional porque el select puede caer al de respaldo. */
interface RawClient {
  id: string;
  name: string;
  rubro: string;
  contact_name: string | null;
  contact_email: string | null;
  notify_lessons: boolean | null;
  metrics_from?: string | null;
  client_sources: unknown;
}

export async function getClients(): Promise<ClientRow[]> {
  const admin = createAdminClient();
  const cols = "id,name,rubro,contact_name,contact_email,notify_lessons,client_sources(table_name,last_synced_at)";
  // Si el deploy llega antes que la migración 0015, `metrics_from` no existe y el
  // select entero falla: sin este reintento el panel Admin se queda SIN CLIENTES
  // (no vacío por error, vacío a secas — la falla más silenciosa que hay acá).
  const conPiso = await admin.from("clients").select(`${cols},metrics_from`).order("created_at");
  const data = (conPiso.error
    ? (await admin.from("clients").select(cols).order("created_at")).data
    : conPiso.data) as unknown as RawClient[] | null;
  const lastData = new Map<string, string>();
  const lastTool = new Map<string, string>();
  await Promise.all(
    (data ?? []).map(async (c) => {
      const [row, tool] = await Promise.all([
        admin
          .from("metrics_daily")
          .select("date")
          .eq("client_id", c.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // la tabla puede no existir si la migración 0014 todavía no corrió
        admin
          .from("tool_events")
          .select("ts")
          .eq("client_id", c.id)
          .order("ts", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (row.data?.date) lastData.set(c.id, row.data.date);
      if (tool.data?.ts) lastTool.set(c.id, tool.data.ts as string);
    }),
  );
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
      last_data_at: lastData.get(c.id) ?? null,
      last_tool_event_at: lastTool.get(c.id) ?? null,
      contact_name: (c.contact_name as string | null) ?? null,
      contact_email: (c.contact_email as string | null) ?? null,
      notify_lessons: (c.notify_lessons as boolean | null) ?? true,
      metrics_from: (c.metrics_from as string | null) ?? null,
    };
  });
}
