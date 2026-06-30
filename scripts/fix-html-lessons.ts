// Backfill: lecciones cuyo url apunta a un .html en Storage (que no renderiza) ->
// baja el contenido, lo guarda en body y limpia url, para servirlo desde la app.
//   npx tsx scripts/fix-html-lessons.ts
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } },
  );
  const { data: lessons, error } = await admin.from("lessons").select("id,url,body");
  if (error) throw error;

  for (const l of lessons ?? []) {
    if (l.body || !l.url || !/\/lessons\/[^/]+\.html?($|\?)/i.test(l.url)) continue;
    const path = l.url.split("/lessons/")[1].split("?")[0];
    const dl = await admin.storage.from("lessons").download(path);
    if (dl.error) { console.log("  ✗", l.id, dl.error.message); continue; }
    const body = await dl.data.text();
    const upd = await admin.from("lessons").update({ body, url: null }).eq("id", l.id);
    console.log(upd.error ? `  ✗ ${l.id}: ${upd.error.message}` : `  ✓ lección ${l.id} migrada a body (${body.length} chars)`);
  }
  console.log("listo");
}
main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
