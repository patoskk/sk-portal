// Aplica un archivo de supabase/migrations contra la base CENTRAL, usando SUPABASE_DB_URL.
// Existe porque el SQL Editor de Supabase no mantiene el estado entre sentencias
// (nos costó un backfill corrido de 3 horas) y porque una migración a mano se olvida.
//   npx tsx scripts/migrar.ts 0014_tool_events.sql
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: npx tsx scripts/migrar.ts <archivo.sql>");
  process.exit(1);
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(raiz, "supabase", "migrations", archivo), "utf8");

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en .env.local");

async function main() {
  const cliente = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await cliente.connect();
  try {
    await cliente.query(sql);
    console.log("OK migración aplicada:", archivo);
  } finally {
    await cliente.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  if (/ENOTFOUND|ETIMEDOUT|EHOSTUNREACH/.test(String(e.message))) {
    console.error(
      "\nEl host directo de Supabase (db.<ref>.supabase.co) hoy resuelve solo por IPv6 y\n" +
        "esta máquina no lo alcanza. Arreglo: en el dashboard de Supabase → Connect →\n" +
        "copiar la cadena del *Session pooler* (aws-...pooler.supabase.com, sale por IPv4)\n" +
        "y pegarla en SUPABASE_DB_URL.\n" +
        "Mientras tanto, la migración se pega a mano en el SQL Editor: es solo DDL.",
    );
  }
  process.exit(1);
});
