// Gate de /api/automation/*: lo que llama n8n (la lección de los lunes, el resumen de novedades) y los
// scripts del probador (las novedades de cada tanda).
//
// Secreto PROPIO y no el CRON_SECRET: estas rutas publican lecciones y les mandan mails a los clientes,
// que es otra cosa que recalcular métricas. Si se filtra uno, el otro sigue cerrado.
// Estas rutas están EXCLUIDAS del middleware (ver middleware.ts): sin eso, el POST de n8n se come un 307
// al login y cree que salió todo bien.
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AutomationGate {
  admin?: SupabaseClient;
  error?: NextResponse;
}

export function requireAutomation(req: NextRequest): AutomationGate {
  const secret = process.env.AUTOMATION_SECRET?.trim();
  if (!secret) return { error: NextResponse.json({ error: "falta AUTOMATION_SECRET en el servidor" }, { status: 500 }) };
  if (req.headers.get("authorization")?.trim() !== `Bearer ${secret}`) {
    return { error: NextResponse.json({ error: "no autorizado" }, { status: 401 }) };
  }
  return { admin: createAdminClient() };
}

/** El cliente del panel de demostración: ahí caen las lecciones y novedades de PRUEBA, que no ve nadie. */
export const DEMO_CLIENT_ID = "00000000-0000-4000-8000-0000000000d0"; // scripts/seed-demo.ts

/**
 * A quién le llegan los mails de prueba: al (primer) admin del portal. Se busca en la base en vez de
 * escribir un mail en el código: si mañana cambia el admin, la prueba le llega al nuevo.
 */
export async function testRecipient(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from("user_clients").select("user_id").eq("role", "admin").limit(1).maybeSingle();
  if (!data?.user_id) return null;
  const { data: u } = await admin.auth.admin.getUserById(data.user_id as string);
  return u?.user?.email ?? null;
}
