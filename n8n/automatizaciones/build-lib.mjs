// build-lib.mjs — lo que comparten build.mjs (arma los workflows) y simular.mjs (corre los Code fuera de n8n).
//
// POR QUÉ EXISTE. Los nodos Code de n8n no pueden importar nada: todo lo que usan tiene que estar escrito
// adentro. Pero el método de escritura, el contrato del documento, la plantilla, el CSS y los temas viven
// en la skill nutricion-ia, y ahí tienen que seguir viviendo (una sola fuente). Así que cada code/*.js
// declara lo que necesita con un marcador `/*@CLAVE*/null` y esto lo reemplaza por el dato real al armar.
// El simulador usa EXACTAMENTE la misma inyección: lo que se prueba es lo que se sube.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const SKILL = "C:/Users/tuli1/.claude/skills/nutricion-ia";
const PORTAL = join(AQUI, "..", "..");

const leer = (p) => {
  if (!existsSync(p)) throw new Error(`falta ${p}`);
  return readFileSync(p, "utf8");
};

export const config = () => JSON.parse(leer(join(AQUI, "config.json")));

/** Las categorías del portal, leídas de lib/lessonTopics.ts (la lista canónica): nunca copiadas a mano. */
function categorias() {
  const ts = leer(join(PORTAL, "lib", "lessonTopics.ts"));
  const out = {};
  for (const m of ts.matchAll(/\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)"\s*\}/g)) out[m[1]] = m[2];
  if (Object.keys(out).length < 3) throw new Error("no pude leer las categorías de lib/lessonTopics.ts");
  return out;
}

/** Los íconos que la plantilla sabe dibujar: las claves del objeto ICONS de la propia plantilla. */
function iconos(plantilla) {
  const bloque = plantilla.slice(plantilla.indexOf("const ICONS"), plantilla.indexOf("};", plantilla.indexOf("const ICONS")));
  const out = [...bloque.matchAll(/^\s*(\w+):'<svg/gm)].map((m) => m[1]);
  if (out.length < 5) throw new Error("no pude leer los íconos de la plantilla");
  return out;
}

let cache = null;
export function datos() {
  if (cache) return cache;
  const c = config();
  const plantilla = leer(join(SKILL, "templates", "documento-web.html"));
  const temas = JSON.parse(leer(join(SKILL, "reference", "temas.json"))).temas;
  const cats = categorias();
  for (const t of temas) {
    if (!cats[t.categoria]) throw new Error(`el tema ${t.id} tiene una categoría que el portal no conoce: ${t.categoria}`);
    if (Buffer.byteLength("lecp:" + t.id) > 64) throw new Error(`el id ${t.id} no entra en un botón de Telegram`);
  }
  const ids = temas.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new Error("hay ids de temas repetidos en temas.json");
  cache = {
    CONFIG: {
      portal_url: c.portal_url,
      pato_chat: c.pato_chat,
      modelo: c.modelo,
      precios: c.precios,
      utc_offset_horas: c.utc_offset_horas,
      temas_bajo_umbral: c.temas_bajo_umbral,
      mail_desde_hora: c.mail_desde_hora,
      mail_hasta_hora: c.mail_hasta_hora,
    },
    TEMAS: temas,
    CATEGORIAS: cats,
    ICONOS: iconos(plantilla),
    FRAMEWORK: leer(join(SKILL, "reference", "educational-copy-framework.md")),
    CONTRATO: leer(join(SKILL, "reference", "document-schema.md")),
    EJEMPLO_DEEP: JSON.parse(leer(join(SKILL, "examples", "ejemplo-tutorial.json"))),
    EJEMPLO_DIGEST: JSON.parse(leer(join(SKILL, "examples", "ejemplo-digest.json"))),
    PLANTILLA: plantilla,
    CSS: leer(join(SKILL, "assets", "web.css")),
  };
  return cache;
}

export function leerCodigo(nombre) {
  return leer(join(AQUI, "code", nombre));
}

/** Reemplaza cada `/*@CLAVE*\/null` por el dato. Falla si queda un marcador o si piden una clave que no existe. */
export function inyectar(codigo, extra = {}) {
  const d = { ...datos(), ...extra };
  const out = codigo.replace(/\/\*@([A-Z_]+)\*\/null/g, (_, k) => {
    if (!(k in d)) throw new Error(`el código pide /*@${k}*/ y no existe ese dato`);
    return JSON.stringify(d[k]);
  });
  if (out.includes("/*@")) throw new Error("quedó un marcador sin reemplazar");
  return out;
}

export function codigo(nombre, extra) {
  return inyectar(leerCodigo(nombre), extra);
}
