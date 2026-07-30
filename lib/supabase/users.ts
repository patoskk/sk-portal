// Acceso a auth.users con service role. listUsers pagina de a 50 por DEFAULT:
// sin recorrer páginas, con >50 usuarios el portal ve una lista incompleta
// (el alta intentaba recrear usuarios existentes y fallaba).
import type { SupabaseClient, User } from "@supabase/supabase-js";

const PER_PAGE = 200;
const MAX_PAGES = 50; // 10.000 usuarios: techo defensivo, no un límite real

/** Todos los usuarios, recorriendo las páginas. */
export async function listAllUsers(admin: SupabaseClient): Promise<User[]> {
  const out: User[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < PER_PAGE) break;
  }
  return out;
}

/** user_id -> email (los que tienen email). */
export async function emailsByUserId(admin: SupabaseClient): Promise<Map<string, string>> {
  const users = await listAllUsers(admin);
  const map = new Map<string, string>();
  for (const u of users) if (u.email) map.set(u.id, u.email);
  return map;
}

export async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const needle = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === needle);
    if (hit) return hit;
    if (data.users.length < PER_PAGE) return null;
  }
  return null;
}
