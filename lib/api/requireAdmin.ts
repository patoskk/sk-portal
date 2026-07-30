// Gate de las rutas de /api/admin/*: valida la sesión con el cliente del usuario
// y recién después usa el service role. Compartido por todas las rutas de admin
// (antes estaba duplicado en cada una).
import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminGate {
  admin?: SupabaseClient;
  user?: User;
  error?: NextResponse;
}

export async function requireAdmin(): Promise<AdminGate> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: new NextResponse("no autenticado", { status: 401 }) };

  const admin = createAdminClient();
  const { data: uc } = await admin.from("user_clients").select("role").eq("user_id", user.id).maybeSingle();
  if (uc?.role !== "admin") return { error: new NextResponse("requiere rol admin", { status: 403 }) };

  return { admin, user };
}
