// Cliente Supabase con SERVICE_ROLE (bypassa RLS). EXCLUSIVO de backend:
// cron de cómputo, job de insights. Nunca importar desde código de cliente.
// La service key vive solo en variables de entorno del server (Vercel).
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
