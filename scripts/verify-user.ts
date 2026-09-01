// Usuario de VERIFICACIÓN: la cuenta con la que corre scripts/verify.ts.
//
// Por qué existe: hasta ahora verify.ts se logueaba como el piloto de un CLIENTE
// REAL (piloto.elbuho@skoptimal.test). Dar de baja a ese cliente se llevaba puesta
// la única prueba de que el hook del JWT inyecta `client_id` y de que RLS aísla las
// filas. Un chequeo de seguridad no puede depender de que un cliente siga contratando.
//
// No puede colgar de NINGÚN cliente —es justo lo que verifica: que el JWT traiga un
// client_id y que solo se vean esas filas—, así que cuelga del **Panel de
// demostración**, que no es de nadie y ya tiene métricas sintéticas.
//
// Tampoco reusa demo@skoptimal.test: esa cuenta tiene contraseña conocida a propósito
// (seed-demo.ts) porque se usa para capturas y demos en vivo. Rotarla rompería eso.
//
//   npx tsx scripts/verify-user.ts
import { loadEnv, upsertEnvLocal } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const EMAIL = "verify@skoptimal.test";
const DEMO_ID = "00000000-0000-4000-8000-0000000000d0"; // Panel de demostración (seed-demo.ts)

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );

  const demo = await admin.from("clients").select("id,name").eq("id", DEMO_ID).maybeSingle();
  if (!demo.data) throw new Error("no existe el Panel de demostración — correr antes: npx tsx scripts/seed-demo.ts");

  let user = null;
  for (let page = 1; page <= 20 && !user; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    user = data.users.find((u) => u.email === EMAIL) ?? null;
    if (data.users.length < 200) break;
  }

  const password = randomBytes(12).toString("base64url"); // 16 chars
  if (!user) {
    const creado = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    if (creado.error) throw creado.error;
    user = creado.data.user;
    console.log("OK usuario de verificación creado:", EMAIL);
  } else {
    const upd = await admin.auth.admin.updateUserById(user.id, { password });
    if (upd.error) throw upd.error;
    console.log("OK usuario ya existía, contraseña rotada:", EMAIL);
  }

  const map = await admin.from("user_clients").upsert({ user_id: user!.id, client_id: DEMO_ID, role: "viewer" });
  if (map.error) throw map.error;
  console.log("OK mapeado a:", demo.data.name);

  upsertEnvLocal({ TEST_USER_EMAIL: EMAIL, TEST_USER_PASSWORD: password });
  console.log("OK credenciales guardadas en .env.local (TEST_USER_EMAIL / TEST_USER_PASSWORD)");
  console.log("\nProbar: npx tsx scripts/verify.ts");
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
