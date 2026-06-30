// Verifica: (1) datos cargados (vía service role), (2) que el login del usuario de
// prueba recibe el claim client_id (hook activo) y solo ve SUS filas (RLS).
//   npx tsx scripts/verify.ts
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "piloto.elbuho@skoptimal.test";
const TEST_PASSWORD = "ElBuho-Piloto-2026!";

function jwtClaims(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // 1. Datos cargados (service role bypassa RLS)
  console.log("== Datos cargados (service role) ==");
  for (const t of ["metrics_daily", "product_queries_daily", "tool_usage_daily", "activity_hourly", "intent_daily"]) {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t}: ${count} filas`);
  }
  const md = await admin.from("metrics_daily").select("date,conversations,orders,stock_queries,errors").order("date");
  console.log("  ejemplo metrics_daily:", JSON.stringify(md.data?.slice(0, 3)));

  // 2. Login del usuario de prueba (anon key + RLS)
  console.log("\n== Login + RLS (usuario de prueba) ==");
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (authErr) throw authErr;
  const claims = jwtClaims(auth.session!.access_token);
  const clientClaim = claims["client_id"];
  console.log("  client_id en el JWT:", clientClaim ?? "(AUSENTE — falta activar el hook)");

  const seen = await anon.from("metrics_daily").select("client_id,date", { count: "exact" });
  console.log("  filas que ve el usuario:", seen.count);
  const otros = new Set((seen.data ?? []).map((r) => r.client_id).filter((id) => id !== clientClaim));
  console.log("  filas de OTROS clientes visibles:", otros.size, otros.size === 0 ? "(aislamiento OK)" : "(¡FUGA!)");

  console.log("\nVEREDICTO:");
  if (!clientClaim) console.log("  ⚠ El hook NO está activo: el JWT no trae client_id, el cliente no verá datos. Activá el hook.");
  else if ((seen.count ?? 0) > 0 && otros.size === 0) console.log("  ✅ Hook activo, RLS aislando bien, y el cliente ve sus datos.");
  else console.log("  ⚠ Hook activo pero el cliente no ve filas — revisar mapeo/seed.");
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
