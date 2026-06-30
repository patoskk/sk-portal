// Onboarding del cliente piloto (El Búho): verifica tablas, da de alta el cliente
// y su fuente, y crea un usuario de prueba mapeado. Idempotente.
//   npx tsx scripts/setup-pilot.ts
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const CLIENT_ID = "d3b9967f-a5c9-465e-a42c-c4b116be71ba";
const TEST_EMAIL = "piloto.elbuho@skoptimal.test";
const TEST_PASSWORD = "ElBuho-Piloto-2026!";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // 1. Tablas existen
  for (const t of ["clients", "client_sources", "metrics_daily", "insights", "user_clients"]) {
    const { error } = await admin.from(t).select("*").limit(1);
    if (error) throw new Error(`tabla ${t}: ${error.message}`);
  }
  console.log("✓ tablas presentes (migración OK)");

  // 2. Cliente + fuente
  const c = await admin
    .from("clients")
    .upsert({ id: CLIENT_ID, name: "Distribuidora El Búho", rubro: "almacén", utc_offset: -3 })
    .select();
  if (c.error) throw c.error;
  const s = await admin
    .from("client_sources")
    .upsert({
      client_id: CLIENT_ID,
      supabase_url: "https://amypvhlvyxeimsqhbzof.supabase.co",
      table_name: "distelbuho",
    })
    .select();
  if (s.error) throw s.error;
  console.log("✓ cliente y fuente dados de alta:", c.data?.[0]?.name);

  // 3. Usuario de prueba + mapeo (idempotente)
  const list = await admin.auth.admin.listUsers();
  let user = list.data.users.find((u) => u.email === TEST_EMAIL);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    user = created.data.user;
    console.log("✓ usuario de prueba creado:", TEST_EMAIL);
  } else {
    console.log("✓ usuario de prueba ya existía:", TEST_EMAIL);
  }
  const uc = await admin
    .from("user_clients")
    .upsert({ user_id: user!.id, client_id: CLIENT_ID, role: "viewer" });
  if (uc.error) throw uc.error;
  console.log("✓ mapeo user_clients -> El Búho");

  console.log("\nLISTO. Credenciales de prueba:");
  console.log("  email:", TEST_EMAIL);
  console.log("  pass :", TEST_PASSWORD);
  console.log("  client_id:", CLIENT_ID);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
