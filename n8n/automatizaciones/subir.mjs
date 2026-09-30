#!/usr/bin/env node
// subir.mjs — sube los workflows de dist/ a n8n por la API. Crea los que faltan y pisa los que existen
// (buscándolos por NOMBRE), guardando antes un backup de cada uno en backups/.
//
//   node subir.mjs                        simula + arma + sube (quedan APAGADOS si eran nuevos)
//   node subir.mjs --activar              además los prende (el bot registra su webhook en Telegram)
//   node subir.mjs --apagar-recordatorio  apaga "Recordatorio Lecciones" (el Gmail de los lunes a las 17)
//
// Escribir en n8n pasa por el portero de probador-agentes/scripts/lib/n8n-api.mjs: todo workflow que no es
// [GEMELO] pide una autorización escrita. Esta es la de Pato, del 28/09/2026, en la conversación donde se
// planeó esto: "Todos los workflows que necesites armar en n8n para cumplir con estas automatizaciones, los
// puedes crear e ir modificando mediante api. Para este caso tienes permiso." Vale para ESTOS workflows y
// para apagar el recordatorio que reemplazan, no para otros.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { AQUI, config } from "./build-lib.mjs";
import { construir, verificar } from "./build.mjs";
import * as api from "file:///C:/Users/tuli1/.claude/skills/probador-agentes/scripts/lib/n8n-api.mjs";

const AUTORIZACION = "Pato, 28/09/2026: permiso para crear y modificar por API los workflows de lecciones y novedades del portal";
const C = config();
const IDS_PATH = join(AQUI, "ids.json");
const argv = process.argv.slice(2);

// 0. Nada se sube con el simulador en rojo.
const sim = spawnSync(process.execPath, [join(AQUI, "simular.mjs")], { encoding: "utf8" });
if (sim.status !== 0) {
  console.log(sim.stdout.split("\n").filter((l) => /✗/.test(l)).join("\n"));
  console.log("\n✗ simular.mjs da rojo: no subo nada.\n");
  process.exit(1);
}
console.log("✓ simular.mjs en verde");

const ids = existsSync(IDS_PATH) ? JSON.parse(readFileSync(IDS_PATH, "utf8")) : { credenciales: {}, workflows: {} };
const guardarIds = () => writeFileSync(IDS_PATH, JSON.stringify(ids, null, 2) + "\n");

// 1. Credenciales: las que ya existen se encuentran por nombre en los workflows que las usan.
const todos = await api.listarWorkflows();
function credencialPorNombre(tipo, nombre) {
  for (const w of todos) for (const n of w.nodes || []) {
    const c = n.credentials?.[tipo];
    if (c && c.name === nombre) return c.id;
  }
  return null;
}
for (const [clave, tipo] of [["telegram", "telegramApi"], ["anthropic", "anthropicApi"], ["gmail", "gmailOAuth2"]]) {
  const id = credencialPorNombre(tipo, C.credenciales[clave]);
  if (!id) { console.log(`✗ no encuentro la credencial "${C.credenciales[clave]}" (${tipo}) en ningún workflow`); process.exit(1); }
  ids.credenciales[clave] = id;
}

// La del portal es nueva: se crea UNA vez con el AUTOMATION_SECRET de .env.local (nunca se imprime).
if (!ids.credenciales.portal) {
  const env = readFileSync(join(AQUI, "..", "..", ".env.local"), "utf8");
  const secreto = (env.match(/^AUTOMATION_SECRET=(.+)$/m) || [])[1]?.trim();
  if (!secreto) { console.log("✗ falta AUTOMATION_SECRET en .env.local"); process.exit(1); }
  const { url, apiKey } = JSON.parse(readFileSync("C:/Users/tuli1/.claude/skills/probador-agentes/n8n.local.json", "utf8"));
  const r = await fetch(`${url.replace(/\/$/, "")}/api/v1/credentials`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ name: C.credenciales.portal, type: "httpHeaderAuth", data: { name: "Authorization", value: `Bearer ${secreto}` } }),
  });
  const txt = await r.text();
  if (!r.ok) { console.log(`✗ no pude crear la credencial del portal: ${r.status} ${txt.slice(0, 200)}`); process.exit(1); }
  ids.credenciales.portal = JSON.parse(txt).id;
  guardarIds();
  console.log(`✓ credencial "${C.credenciales.portal}" creada`);
}
guardarIds();

// 2. Dos pasadas: la primera asegura que los 5 existan (para tener sus ids), la segunda los sube con los
//    ids cruzados (el errorWorkflow de todos, y el bot apuntando al que escribe).
const CLAVES = ["errores", "escribir", "temas", "bot", "resumen"];
const porNombre = new Map(todos.map((w) => [w.name, w]));
const backups = join(AQUI, "backups");
mkdirSync(backups, { recursive: true });
const sello = new Date().toISOString().replace(/[:.]/g, "-");

for (const k of CLAVES) {
  const nombre = C.workflows[k];
  // Primero por id (ids.json): así un workflow RENOMBRADO en config.json se actualiza en su lugar en vez de
  // crear uno nuevo y dejar el viejo corriendo con el nombre anterior (el resumen se renombró el 30/09).
  if (ids.workflows[k] && todos.some((w) => w.id === ids.workflows[k])) continue;
  const existente = porNombre.get(nombre);
  if (existente) { ids.workflows[k] = existente.id; continue; }
  const wf = construir(ids).find((w) => w.name === nombre);
  const creado = await api.crear(api.comoLoAceptaLaApi(wf));
  ids.workflows[k] = creado.id;
  console.log(`✓ creado: ${nombre} (${creado.id})`);
  guardarIds();
}
guardarIds();

let mal = 0;
for (const wf of construir(ids)) {
  const errores = verificar(wf);
  if (errores.length) { mal++; console.log(`✗ ${wf.name}:\n    ${errores.join("\n    ")}`); continue; }
  const id = ids.workflows[CLAVES.find((k) => C.workflows[k] === wf.name)];
  const actual = await api.traerWorkflow(id);
  writeFileSync(join(backups, `${sello}-${id}.json`), JSON.stringify(actual, null, 2));
  await api.actualizar(id, api.comoLoAceptaLaApi(wf), { autorizadoPor: AUTORIZACION });
  // lo que quedó en n8n tiene que ser lo que se mandó
  const vivo = await api.traerWorkflow(id);
  const problemas = [];
  if (vivo.nodes.length !== wf.nodes.length) problemas.push(`tiene ${vivo.nodes.length} nodos y se mandaron ${wf.nodes.length}`);
  if (wf.settings.errorWorkflow && vivo.settings?.errorWorkflow !== wf.settings.errorWorkflow) problemas.push("no quedó asignado el workflow de errores");
  if (vivo.settings?.timezone !== C.zona) problemas.push(`la zona horaria quedó en ${vivo.settings?.timezone}`);
  if (problemas.length) { mal++; console.log(`✗ ${wf.name}: ${problemas.join("; ")}`); }
  else console.log(`✓ ${wf.name} — ${vivo.nodes.length} nodos, ${vivo.active ? "ACTIVO" : "apagado"}`);
}

if (argv.includes("--activar") && !mal) {
  for (const k of ["escribir", "temas", "bot", "resumen"]) {
    await api.activar(ids.workflows[k], true, { autorizadoPor: AUTORIZACION });
    console.log(`✓ activado: ${C.workflows[k]}`);
  }
}

if (argv.includes("--apagar-recordatorio")) {
  const viejo = porNombre.get(C.workflows.recordatorio_viejo);
  if (!viejo) console.log(`· no encuentro "${C.workflows.recordatorio_viejo}"`);
  else if (!viejo.active) console.log(`· "${viejo.name}" ya estaba apagado`);
  else {
    await api.activar(viejo.id, false, { autorizadoPor: AUTORIZACION });
    console.log(`✓ apagado (no borrado): ${viejo.name}`);
  }
}

console.log(mal ? `\n✗ ${mal} workflow(s) con problemas\n` : "\n✓ listo\n");
process.exit(mal ? 1 : 0);
