// Crea el bucket público "lessons" en Supabase Storage (para hostear PDFs/HTML).
//   npx tsx scripts/create-bucket.ts
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const { error } = await admin.storage.createBucket("lessons", {
    public: true,
    fileSizeLimit: "20MB",
  });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(error ? "✓ bucket 'lessons' ya existía" : "✓ bucket 'lessons' creado (público)");
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
