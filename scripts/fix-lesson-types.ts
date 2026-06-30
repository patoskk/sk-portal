// Corrige el content-type de los archivos ya subidos al bucket "lessons"
// (re-sube cada .html/.pdf con el tipo correcto). Idempotente.
//   npx tsx scripts/fix-lesson-types.ts
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const CT: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  pdf: "application/pdf",
};

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const { data: files, error } = await admin.storage.from("lessons").list("", { limit: 1000 });
  if (error) throw error;

  for (const f of files ?? []) {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const contentType = CT[ext];
    if (!contentType) continue;
    const dl = await admin.storage.from("lessons").download(f.name);
    if (dl.error) { console.log("  ✗", f.name, dl.error.message); continue; }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const up = await admin.storage.from("lessons").upload(f.name, buf, { contentType, upsert: true });
    console.log(up.error ? `  ✗ ${f.name}: ${up.error.message}` : `  ✓ ${f.name} -> ${contentType}`);
  }
  console.log("listo");
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
