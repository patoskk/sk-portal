// Carga una lección. Por defecto global (visible a todos). Pasá un client_id para targetear.
//   npx tsx scripts/add-lesson.ts "Título" "Resumen corto" "https://link-a-la-lectura" [client_id]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const [title, summary, url, clientId] = process.argv.slice(2);
if (!title) { console.error('uso: add-lesson.ts "Título" "Resumen" "url" [client_id]'); process.exit(1); }

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const { data, error } = await admin
    .from("lessons")
    .insert({ title, summary: summary || null, url: url || null, client_id: clientId || null })
    .select("id");
  if (error) throw error;
  console.log(`✓ lección creada (${data[0].id})${clientId ? " para cliente " + clientId : " (global)"}`);
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
