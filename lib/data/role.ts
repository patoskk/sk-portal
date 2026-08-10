import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Rol del usuario logueado. Sin auth.getUser() previo (un roundtrip menos):
// la policy RLS "own mapping" ya limita user_clients a la fila propia, y sin
// sesión la query devuelve vacío.
//
// cache() por request: el layout de (portal) la pide para armar el sidebar y
// las páginas la vuelven a pedir para sus propios gates. Sin esto serían dos
// (o tres) viajes idénticos a Supabase por navegación.
export const getCurrentRole = cache(async function getCurrentRole(): Promise<string | null> {
  const sb = await createClient();
  const { data } = await sb.from("user_clients").select("role").maybeSingle();
  return data?.role ?? null;
});

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentRole()) === "admin";
}
