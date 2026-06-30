// Crea (o reusa) un usuario y lo mapea a un cliente. Genera contraseña si es nuevo.
//   npx tsx scripts/add-user.ts <email> [client_id] [role]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const EMAIL = process.argv[2];
const CLIENT_ID = process.argv[3] || "d3b9967f-a5c9-465e-a42c-c4b116be71ba";
const ROLE = process.argv[4] || "viewer";
if (!EMAIL) { console.error("uso: add-user.ts <email> [client_id] [role]"); process.exit(1); }

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false },
  });

  const list = await admin.auth.admin.listUsers();
  let user = list.data.users.find((u) => u.email === EMAIL);
  let password: string | null = null;
  if (!user) {
    password = `Buho-${randomBytes(4).toString("hex")}!`;
    const created = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    if (created.error) throw created.error;
    user = created.data.user;
    console.log("✓ usuario creado:", EMAIL);
  } else {
    console.log("✓ usuario ya existía:", EMAIL, "(no toco su contraseña)");
  }

  const uc = await admin.from("user_clients").upsert({ user_id: user!.id, client_id: CLIENT_ID, role: ROLE });
  if (uc.error) throw uc.error;
  console.log("✓ mapeado al cliente", CLIENT_ID, "como", ROLE);

  console.log("\n=== ACCESO ===");
  console.log("email:", EMAIL);
  console.log("pass :", password ?? "(sin cambios; ya tenía)");
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
