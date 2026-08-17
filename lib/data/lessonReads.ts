// "Quién está leyendo": cruza lesson_reads con user_clients para el panel Admin.
//
// Hasta ahora el panel solo mostraba el estado del MAIL (enviados / en curso),
// que mide lo que mandamos nosotros. Esto mide lo otro: si lo abrieron. Sirve
// para saber a qué cliente llamar — el que no abre ninguna se está enfriando.
//
// Va con service role a propósito: lesson_reads tiene RLS por usuario (cada uno
// ve solo sus marcas), así que con el cliente normal el panel vería únicamente
// las lecturas del propio admin.
import { createAdminClient } from "@/lib/supabase/admin";

export interface ClientReads {
  clientId: string;
  name: string;
  read: number; // lecciones distintas abiertas por alguien de ese cliente
  total: number; // lecciones visibles para ese cliente (globales + propias)
  lastReadAt: string | null;
  lastTitle: string | null;
}

export async function getReadsByClient(): Promise<ClientReads[]> {
  const admin = createAdminClient();
  // sin paginar a propósito: PostgREST corta en 1000 filas y esto son
  // clientes × lecciones (cientos, no miles). Si algún día llega a ese orden,
  // paginar como en runCompute.ts.
  const [reads, maps, clients, lessons] = await Promise.all([
    admin.from("lesson_reads").select("user_id,lesson_id,read_at").order("read_at", { ascending: false }),
    admin.from("user_clients").select("user_id,client_id"),
    admin.from("clients").select("id,name").order("created_at"),
    admin.from("lessons").select("id,title,client_id"),
  ]);

  // los admins están mapeados con client_id null: sus lecturas no se le
  // atribuyen a ningún cliente (si no, las pruebas de Pato inflarían el panel)
  const clientDeUsuario = new Map<string, string>();
  for (const m of maps.data ?? []) {
    if (m.client_id) clientDeUsuario.set(m.user_id as string, m.client_id as string);
  }
  const tituloDeLeccion = new Map<string, string>();
  for (const l of lessons.data ?? []) tituloDeLeccion.set(l.id as string, l.title as string);

  // total por cliente = globales + las suyas propias
  const globales = (lessons.data ?? []).filter((l) => l.client_id === null).length;

  const leidasPorCliente = new Map<string, Set<string>>();
  const ultima = new Map<string, { at: string; lessonId: string }>();
  // reads viene ordenado por fecha desc: la primera de cada cliente es la última
  for (const r of reads.data ?? []) {
    const clientId = clientDeUsuario.get(r.user_id as string);
    if (!clientId) continue;
    const set = leidasPorCliente.get(clientId) ?? new Set<string>();
    set.add(r.lesson_id as string);
    leidasPorCliente.set(clientId, set);
    if (!ultima.has(clientId)) ultima.set(clientId, { at: r.read_at as string, lessonId: r.lesson_id as string });
  }

  return (clients.data ?? []).map((c) => {
    const id = c.id as string;
    const propias = (lessons.data ?? []).filter((l) => l.client_id === id).length;
    const last = ultima.get(id);
    return {
      clientId: id,
      name: c.name as string,
      read: leidasPorCliente.get(id)?.size ?? 0,
      total: globales + propias,
      lastReadAt: last?.at ?? null,
      lastTitle: last ? (tituloDeLeccion.get(last.lessonId) ?? null) : null,
    };
  });
}
