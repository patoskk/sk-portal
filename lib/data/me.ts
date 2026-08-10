// Identidad del usuario logueado: quién es y de qué negocio. La usa el pie del
// sidebar y la página /configuracion.
//
// Hasta ahora el portal no mostraba en ningún lado el mail de la sesión ni el
// nombre del negocio fuera del Panel — un cliente con dos cuentas no tenía cómo
// saber con cuál entró.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/data/role";

export interface Me {
  email: string | null;
  clientName: string | null;
  rubro: string | null;
  /** Los avisos de lecciones se dan de baja a mano; acá solo se refleja el estado. */
  notifyLessons: boolean;
  isAdmin: boolean;
}

// cache() por request: layout + página pueden pedirla sin duplicar la consulta.
export const getMe = cache(async function getMe(): Promise<Me> {
  const sb = await createClient();
  // La fila propia de `clients` la habilita la policy clients_sel_own (0007).
  // El rol sale de getCurrentRole (cacheada): así el layout no repite la consulta
  // a user_clients que las páginas ya hacen para sus propios gates.
  const [{ data: auth }, { data: client }, role] = await Promise.all([
    sb.auth.getUser(),
    sb.from("clients").select("name,rubro,notify_lessons").maybeSingle(),
    getCurrentRole(),
  ]);

  return {
    email: auth?.user?.email ?? null,
    clientName: (client?.name as string | null) ?? null,
    rubro: (client?.rubro as string | null) ?? null,
    notifyLessons: (client?.notify_lessons as boolean | null) ?? true,
    isAdmin: role === "admin",
  };
});
