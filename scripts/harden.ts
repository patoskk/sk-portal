// Hardening one-shot (idempotente):
//  1. rota la contraseña del usuario de prueba (quedó expuesta en el historial de git)
//     y la guarda en .env.local como TEST_USER_EMAIL / TEST_USER_PASSWORD
//  2. pone el bucket `lessons` en privado (se sirve vía signed URLs desde la app)
//   npx tsx scripts/harden.ts [email-usuario-prueba]
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TEST_EMAIL = process.argv[2] || process.env.TEST_USER_EMAIL || "piloto.elbuho@skoptimal.test";

function upsertEnvLocal(vars: Record<string, string>) {
  const path = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  let txt = readFileSync(path, "utf8");
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}=${v}`;
    txt = new RegExp(`^${k}=`, "m").test(txt)
      ? txt.replace(new RegExp(`^${k}=.*$`, "m"), line)
      : txt.trimEnd() + `\n${line}\n`;
  }
  writeFileSync(path, txt);
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );

  // 1. rotar contraseña del usuario de prueba
  let user = null;
  for (let page = 1; page <= 20 && !user; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    user = data.users.find((u) => u.email === TEST_EMAIL) ?? null;
    if (data.users.length < 200) break;
  }
  if (!user) {
    console.log(`⚠ usuario ${TEST_EMAIL} no encontrado — salto la rotación`);
  } else {
    const password = randomBytes(12).toString("base64url"); // 16 chars
    const upd = await admin.auth.admin.updateUserById(user.id, { password });
    if (upd.error) throw upd.error;
    upsertEnvLocal({ TEST_USER_EMAIL: TEST_EMAIL, TEST_USER_PASSWORD: password });
    console.log(`✅ contraseña de ${TEST_EMAIL} rotada y guardada en .env.local`);
  }

  // 2. bucket lessons privado
  const bucket = await admin.storage.updateBucket("lessons", { public: false });
  if (bucket.error) throw bucket.error;
  console.log("✅ bucket `lessons` ahora es PRIVADO (la app sirve signed URLs)");
}

main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
