// Crea (o reusa) un usuario ADMIN de SK Optimal (gestiona lecciones, ve insights sin revisar).
//   npx tsx scripts/add-admin.ts <email>
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const EMAIL = process.argv[2];
const PASS_ARG = process.argv[3];
if (!EMAIL) { console.error("uso: add-admin.ts <email> [password]"); process.exit(1); }

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const list = await admin.auth.admin.listUsers();
  let user = list.data.users.find((u) => u.email === EMAIL);
  let password: string | null = null;
  if (!user) {
    password = PASS_ARG || `Admin-${randomBytes(4).toString("hex")}!`;
    const created = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    if (created.error) throw created.error;
    user = created.data.user;
    console.log("✓ usuario admin creado:", EMAIL);
  } else if (PASS_ARG) {
    const upd = await admin.auth.admin.updateUserById(user.id, { password: PASS_ARG });
    if (upd.error) throw upd.error;
    password = PASS_ARG;
    console.log("✓ usuario ya existía:", EMAIL, "— contraseña actualizada");
  } else {
    console.log("✓ usuario ya existía:", EMAIL, "(no toco su contraseña)");
  }
  const uc = await admin.from("user_clients").upsert({ user_id: user!.id, client_id: null, role: "admin" });
  if (uc.error) throw uc.error;
  console.log("✓ rol admin asignado (client_id null)");
  console.log("\n=== ACCESO ADMIN ===");
  console.log("email:", EMAIL);
  console.log("pass :", password ?? "(sin cambios; ya tenía)");
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
