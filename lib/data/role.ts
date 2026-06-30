import { createClient } from "@/lib/supabase/server";

// Rol del usuario logueado (lee su propia fila de user_clients vía RLS "own mapping").
export async function getCurrentRole(): Promise<string | null> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  return data?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentRole()) === "admin";
}
