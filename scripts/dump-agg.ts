import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
async function probe(label: string, key: string) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.from("clients").select("*", { count: "exact", head: true });
  console.log(`${label}: ${error ? "FALLA -> " + error.message : "OK (válida)"}`);
}
async function main() {
  await probe("service_role (secret)", process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await probe("anon (publishable)   ", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
main();
