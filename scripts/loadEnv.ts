// Carga .env.local en process.env para los scripts de CLI (sin dependencias).
import { readFileSync } from "node:fs";
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
