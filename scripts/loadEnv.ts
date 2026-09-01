// Carga .env.local en process.env para los scripts de CLI (sin dependencias).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function loadEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const txt = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !line.trimStart().startsWith("#") && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

/**
 * Escribe (o pisa) variables en .env.local. Lo usan los scripts que generan
 * credenciales y necesitan dejarlas guardadas — nunca en el repo, nunca en consola.
 */
export function upsertEnvLocal(vars: Record<string, string>): void {
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
