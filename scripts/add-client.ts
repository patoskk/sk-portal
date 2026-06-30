// Alta genérica de un cliente nuevo (tenant) + su fuente de datos.
// Genera el client_id, inserta en clients y client_sources, y te dice qué SOURCE_KEY cargar.
//   npx tsx scripts/add-client.ts "Nombre" "rubro" "https://xxxx.supabase.co" "tabla" [utc_offset]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const [name, rubro, url, table, utc] = process.argv.slice(2);
if (!name || !url || !table) {
  console.error('uso: add-client.ts "Nombre" "rubro" "https://xxxx.supabase.co" "tabla" [utc_offset]');
  process.exit(1);
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const id = randomUUID();
  const c = await admin.from("clients").insert({ id, name, rubro: rubro || "", utc_offset: utc ? Number(utc) : -3 }).select();
  if (c.error) throw c.error;
  const s = await admin.from("client_sources").insert({ client_id: id, supabase_url: url, table_name: table }).select();
  if (s.error) throw s.error;

  const envName = `SOURCE_KEY_${id.replace(/-/g, "_").toUpperCase()}`;
  console.log(`✓ cliente "${name}" dado de alta`);
  console.log("  client_id:", id);
  console.log("\nPasos que faltan:");
  console.log(`  1) Cargar la SECRET key de SU Supabase como env (en .env.local y en Vercel):`);
  console.log(`       ${envName}=sb_secret_...`);
  console.log(`  2) Activar RLS en su tabla (SQL Editor de su proyecto):`);
  console.log(`       alter table public.${table} enable row level security;`);
  console.log(`  3) Crear su usuario:  npx tsx scripts/add-user.ts <email> ${id}`);
  console.log(`  4) Cómputo + insights:  curl .../api/cron/compute  &&  gen-insights.ts ${id}  &&  publish-insights.ts ${id}`);
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
