#!/usr/bin/env node
// simular.mjs — corre los nodos Code de las automatizaciones FUERA de n8n, con la misma inyección que el
// build. 0 tokens, 0 red. Se corre antes de cada subir.mjs: si algo da rojo, no se sube.
//
//   node simular.mjs
//
// Lo que más importa acá es la calibración del validador contra las 12 lecciones reales: la lección sale
// sin que nadie la lea, así que el validador es el último filtro, y uno que rechaza lecciones buenas (o
// deja pasar malas) no sirve. Para refrescar las lecciones de referencia: ver fixtures/LEEME.md.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AQUI, codigo, datos } from "./build-lib.mjs";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let fallas = 0;
let pasadas = 0;
const ok = (cond, msg) => {
  if (cond) pasadas++;
  else { fallas++; console.log(`  ✗ ${msg}`); }
};
const seccion = (t) => console.log(`\n▶ ${t}`);

/** Corre un code/*.js como lo corre n8n: $input, $('Nodo'), Buffer. `ahora` fija el reloj. */
async function correr(archivo, { input = [{}], nodos = {}, ahora } = {}) {
  const src = codigo(archivo);
  const items = input.map((x) => (x && x.json ? x : { json: x }));
  const $input = { all: () => items, first: () => items[0], item: items[0] };
  const $ = (nombre) => {
    if (!(nombre in nodos)) {
      return {
        first: () => { throw new Error(`Node '${nombre}' hasn't been executed`); },
        all: () => { throw new Error(`Node '${nombre}' hasn't been executed`); },
        isExecuted: false,
      };
    }
    const its = nodos[nombre].map((x) => (x && x.json ? x : { json: x }));
    return { first: () => its[0], all: () => its, isExecuted: true };
  };
  const real = Date.now;
  if (ahora) Date.now = () => new Date(ahora).getTime();
  try {
    const fn = new AsyncFunction("$input", "$", "Buffer", src);
    return await fn($input, $, Buffer);
  } finally {
    Date.now = real;
  }
}

async function tira(archivo, opts) {
  try { await correr(archivo, opts); return null; } catch (e) { return e.message; }
}

const D = datos();
const LECCIONES = JSON.parse(readFileSync(join(AQUI, "fixtures", "lecciones-publicadas.json"), "utf8"));
const BUENA = LECCIONES.find((l) => l.title.startsWith("De la reunión")).doc;
const clon = (x) => JSON.parse(JSON.stringify(x));

// ── 0. Todo compila con los datos inyectados ─────────────────────────────────────────────────────────
seccion("Inyección y compilación");
const ARCHIVOS = [
  "elegir-temas.js", "ruteo-bot.js", "tema.js", "contexto.js", "armar-investigacion.js", "leer-investigacion.js",
  "armar-escritura.js", "leer-escritura.js", "validar-leccion.js", "armar-revision.js", "render-leccion.js",
  "decidir-horario.js", "mensaje-final.js", "mensaje-rechazo.js", "mensaje-error.js", "mensaje-resumen.js", "toca-resumen.js",
  "archivo-leccion.js",
];
for (const a of ARCHIVOS) {
  let err = null;
  try { new AsyncFunction("$input", "$", "Buffer", codigo(a)); } catch (e) { err = e.message; }
  ok(!err, `${a} no compila: ${err}`);
}
ok(D.TEMAS.length >= 20, `el banco tiene ${D.TEMAS.length} temas`);
ok(D.ICONOS.includes("idea") && D.ICONOS.includes("persona"), "los íconos se leen de la plantilla");
ok(Object.keys(D.CATEGORIAS).length === 4, "las 4 categorías se leen de lib/lessonTopics.ts");

// ── 1. El validador, calibrado contra las 12 publicadas ──────────────────────────────────────────────
seccion("Validador — las 12 lecciones publicadas");
const validar = async (doc) => (await correr("validar-leccion.js", { input: [{ doc }] }))[0].json;
const EXCEPCION = "Qué NO conviene darle a la IA"; // "sin volverte loco", de julio: anterior a la regla del 19/08
for (const l of LECCIONES) {
  const v = await validar(l.doc);
  if (l.title === EXCEPCION) {
    ok(!v.ok && v.problemas.length === 1 && /vulgarismo/.test(v.problemas[0]), `"${l.title}" tenía que fallar SOLO por el vulgarismo: ${v.problemas.join(" | ")}`);
  } else {
    ok(v.ok, `"${l.title}" es una lección publicada y aprobada, y el validador la rechaza: ${v.problemas.join(" | ")}`);
  }
}

seccion("Validador — cada regla rechaza su falla");
const conTexto = (t) => { const d = clon(BUENA); d.bloques[0].parrafos[0] += " " + t; return d; };
const MALAS = {
  "en criollo": conTexto("Te lo explico en criollo."),
  "un año": conTexto("Desde 2026 esto cambió."),
  "una fecha": conTexto("El 3 de octubre salió la versión nueva."),
  "semana del": conTexto("Es la guía de la semana del lunes."),
  emoji: conTexto("Probalo 🚀"),
  "el tipo": conTexto("El tipo del depósito lo usa todos los días."),
  vulgarismo: conTexto("Es un quilombo ordenar eso."),
  che: conTexto("Che, probalo."),
  almacén: conTexto("Pensá en un almacén de barrio."),
  "precio exacto": conTexto("Cuesta USD 20 por mes."),
  "vende (llamada)": conTexto("Agendá una llamada y lo vemos."),
  "vende (servicios)": conTexto("Conocé nuestros servicios."),
  "vende (lo armamos)": conTexto("Si querés, te lo armamos nosotros."),
  "3 exclamaciones": conTexto("¡Sí! ¡Sí! ¡Sí!"),
  "promesa mágica con tilde": conTexto("Revolucioná tu negocio con esto."),
  "párrafo de 120 palabras": conTexto(Array(120).fill("palabra").join(" ")),
};
for (const [nombre, doc] of Object.entries(MALAS)) {
  const v = await validar(doc);
  ok(!v.ok, `la falla "${nombre}" no la detecta`);
}
{
  const d = clon(BUENA); d.bloques = d.bloques.filter((b) => !(b.tipo === "tip" && b.estilo === "accion"));
  ok(!(await validar(d)).ok, "sin la acción de la semana no la detecta");
  const d2 = clon(BUENA); d2.bloques.push({ tipo: "tip", estilo: "accion", titulo: "Otra", texto: "Otra acción." });
  ok(!(await validar(d2)).ok, "con dos acciones no la detecta");
  const d3 = clon(BUENA); d3.bloques[0].icono = "robot";
  ok(!(await validar(d3)).ok, "un ícono que no existe no lo detecta");
  const d4 = clon(BUENA); d4.bloques.push({ tipo: "video", url: "x" });
  ok(!(await validar(d4)).ok, "un tipo de bloque que no existe no lo detecta");
  const d5 = clon(BUENA); d5.lectura = "5 minutos";
  ok(!(await validar(d5)).ok, "una lectura mal escrita no la detecta");
  const d6 = clon(BUENA); d6.bloques = d6.bloques.slice(0, 4);
  ok(!(await validar(d6)).ok, "una lección cortada (4 bloques) no la detecta");
  const d7 = clon(BUENA); d7.bloques.find((b) => b.tipo === "herramienta").precio = "Desde 9 dólares";
  ok(!(await validar(d7)).ok, "un precio con números en la herramienta no lo detecta");
  ok(!(await correr("validar-leccion.js", { input: [{ doc: BUENA, aprobado: false }] }))[0].json.ok, "si la revisión no la aprueba, igual pasa");
}

seccion("Validador — lo que NO es una falla");
for (const [nombre, t] of Object.entries({
  "tipo de propiedad": "Una inmobiliaria puede ver qué tipo de propiedad se consulta más.",
  "noche": "Te escriben a la noche y no hay nadie.",
  descuento: "¿Qué descuento le corresponde a un cliente mayorista?",
  llamada: "Si la reunión es por llamada, grabala igual.",
  escribinos: "Cualquier duda, escribinos: para eso estamos.",
  "una exclamación": "¡Probalo!",
})) {
  const v = await validar(conTexto(t));
  ok(v.ok, `"${nombre}" es legítimo y lo rechaza: ${v.problemas.join(" | ")}`);
}

// ── 2. Elegir temas ──────────────────────────────────────────────────────────────────────────────────
seccion("Elegir temas");
const elegir = async (ctx, estado) => (await correr("elegir-temas.js", { input: [estado], nodos: { Contexto: [ctx] } }))[0].json;
{
  const r = await elegir({ modo: "lunes" }, { publicados: [], semana: null });
  const series = r.offered.map((id) => D.TEMAS.find((t) => t.id === id).serie);
  ok(r.enviar && r.offered.length === 3, "un lunes sin nada publicado ofrece 3");
  ok(new Set(series).size === 3, `los 3 tienen que ser de series distintas: ${series}`);
  ok(series[0] === "herramienta", "sin historial arranca por un tutorial de herramienta");
  ok([r.b1_data, r.b2_data, r.b3_data].every((d) => d.startsWith("lec:") && Buffer.byteLength(d) <= 64), "los botones llevan lec:<tema> y entran en 64 bytes");
  ok(r.otros_data === "lec-otros" && r.no_data === "lec-no", "botones de otros y de saltar");
  ok(!r.bajo, "con el banco lleno no avisa que quedan pocos");

  const pub = [{ source_topic: "audios-whatsapp", title: "x", published_at: "2026-10-05" }];
  const r2 = await elegir({ modo: "lunes" }, { publicados: pub, semana: null });
  ok(!r2.offered.includes("audios-whatsapp"), "no vuelve a ofrecer un tema publicado");
  ok(D.TEMAS.find((t) => t.id === r2.offered[0]).serie === "instructivo", "después de un tutorial, arranca por otra serie");

  const r3 = await elegir({ modo: "otros", excluir: r.offered }, { publicados: [], semana: null });
  ok(r3.offered.length === 3 && !r3.offered.some((id) => r.offered.includes(id)), "Otros 3 no repite los que estaban");

  const r4 = await elegir({ modo: "lunes" }, { publicados: [], semana: { status: "elegida" } });
  ok(!r4.enviar, "si la semana ya está elegida, el lunes no manda nada");
  const r5 = await elegir({ modo: "martes" }, { publicados: [], semana: { status: "ofrecida", offered: r.offered } });
  ok(r5.enviar && JSON.stringify(r5.offered) === JSON.stringify(r.offered) && /pendiente/.test(r5.texto), "el martes reenvía los mismos 3");
  const r6 = await elegir({ modo: "martes" }, { publicados: [], semana: { status: "salteada" } });
  ok(!r6.enviar, "si la salteó, el martes no insiste");

  const casiTodos = D.TEMAS.slice(0, D.TEMAS.length - 5).map((t) => ({ source_topic: t.id, title: t.titulo, published_at: "2026-10-01" }));
  const r7 = await elegir({ modo: "lunes" }, { publicados: casiTodos, semana: null });
  ok(r7.bajo && /Quedan 5 temas/.test(r7.texto), "con 5 temas avisa que quedan pocos");

  const todos = D.TEMAS.map((t) => ({ source_topic: t.id, title: t.titulo, published_at: "2026-10-01" }));
  const r8 = await elegir({ modo: "lunes" }, { publicados: todos, semana: null });
  ok(r8.offered.length === 0 && /No quedan temas/.test(r8.texto) && r8.b1_data === "lec-nada", "con el banco vacío lo dice, sin botones de tema");

  const r9 = await elegir({ modo: "pedido", prueba: true }, { publicados: [], semana: null });
  ok(r9.b1_data.startsWith("lecp:") && r9.no_data === "lecp-no" && /\[PRUEBA\]/.test(r9.texto), "en prueba los botones son lecp y el texto lo avisa");
}

// ── 3. Ruteo del bot ─────────────────────────────────────────────────────────────────────────────────
seccion("Ruteo del bot");
const PATO = Number(D.CONFIG.pato_chat);
const rutear = async (u) => (await correr("ruteo-bot.js", { input: [u] }))[0].json;
const toque = (data, teclado = []) => ({ callback_query: { id: "cb1", data, from: { id: PATO }, message: { message_id: 7, chat: { id: PATO }, reply_markup: { inline_keyboard: teclado } } } });
{
  ok((await rutear({ message: { text: "/temas", chat: { id: 123 }, from: { id: 123 } } })).accion === "ignorar", "un desconocido tiene que ser ignorado");
  ok((await rutear({ callback_query: { ...toque("lec:audios-whatsapp").callback_query, from: { id: 999 } } })).accion === "ignorar", "un toque de otro usuario tiene que ser ignorado");
  const e = await rutear(toque("lec:audios-whatsapp"));
  ok(e.accion === "elegir" && e.topic_id === "audios-whatsapp" && !e.prueba && e.message_id === 7, "lec:<tema> elige ese tema");
  ok((await rutear(toque("lecp:audios-whatsapp"))).prueba === true, "lecp: es prueba");
  ok((await rutear(toque("lec:no-existe"))).accion === "vacio", "un tema que ya no está no rompe");
  const o = await rutear(toque("lec-otros", [[{ callback_data: "lec:audios-whatsapp" }], [{ callback_data: "lec:mail-dificil" }], [{ callback_data: "lec-otros" }, { callback_data: "lec-no" }]]));
  ok(o.accion === "otros" && o.excluir.length === 2 && o.excluir.includes("mail-dificil"), "Otros 3 lee los temas del teclado tocado");
  ok((await rutear(toque("lec-no"))).accion === "saltar", "Esta semana no");
  ok((await rutear({ message: { text: "/temas", chat: { id: PATO }, from: { id: PATO } } })).accion === "temas", "/temas");
  const pr = await rutear({ message: { text: "/prueba", chat: { id: PATO }, from: { id: PATO } } });
  ok(pr.accion === "temas" && pr.prueba, "/prueba");
  ok((await rutear({ message: { text: "hola", chat: { id: PATO }, from: { id: PATO } } })).accion === "ayuda", "cualquier otro texto contesta la ayuda");
  // En el bot, entre Ruteo y Contexto hay un nodo de Telegram (responder al toque): Contexto lee Ruteo por nombre.
  const ctx = (await correr("contexto.js", { input: [{ ok: true, result: true }], nodos: { Ruteo: [o] } }))[0].json;
  ok(ctx.modo === "otros" && ctx.excluir.length === 2, "Contexto lee Ruteo aunque le entre la respuesta de Telegram");
  const lunes = (await correr("contexto.js", { input: [{ timestamp: "x" }], ahora: "2026-10-05T21:00:00Z" }))[0].json;
  ok(lunes.modo === "lunes" && !lunes.prueba, "en temas del lunes, el Schedule del lunes da modo lunes");
  const martes = (await correr("contexto.js", { input: [{ timestamp: "x" }], ahora: "2026-10-06T13:00:00Z" }))[0].json;
  ok(martes.modo === "martes", "y el del martes, modo martes");
  const wh = (await correr("contexto.js", { input: [{ headers: {}, body: {} }] }))[0].json;
  ok(wh.prueba === true, "el webhook de temas siempre es prueba");
}

// ── 4. Entrada del sub-workflow ──────────────────────────────────────────────────────────────────────
seccion("Tema");
{
  const t = (await correr("tema.js", { input: [{ topic_id: "mail-dificil", prueba: false }] }))[0].json;
  ok(t.tema.id === "mail-dificil" && t.prueba === false, "desde el bot respeta prueba=false");
  const w = (await correr("tema.js", { input: [{ headers: {}, body: { topic_id: "mail-dificil", prueba: false } }] }))[0].json;
  ok(w.prueba === true, "el webhook SIEMPRE es prueba, aunque pida lo contrario");
  ok(/No encuentro/.test(await tira("tema.js", { input: [{ topic_id: "nada" }] })), "un tema inexistente frena");
}

// ── 5. Pedidos a Claude y lectura de respuestas ──────────────────────────────────────────────────────
seccion("Pedidos a Claude");
{
  const tema = D.TEMAS.find((t) => t.id === "audios-whatsapp");
  const inv = (await correr("armar-investigacion.js", { nodos: { Tema: [{ tema }] }, ahora: "2026-10-05T21:10:00Z" }))[0].json.body;
  ok(inv.model === D.CONFIG.modelo && inv.tools[0].type === "web_search_20260209", "la investigación usa el modelo y la búsqueda web actual");
  ok(/5 de octubre de 2026/.test(inv.messages[0].content), "la investigación dice la fecha de hoy (hora argentina)");

  const publicadas = { publicados: LECCIONES.map((l) => ({ title: l.title })) };
  const sinInv = (await correr("armar-escritura.js", { nodos: { Tema: [{ tema }], "Portal: publicadas": [publicadas] } }))[0].json;
  const b = sinInv.body;
  ok(b.system[0].text.includes("La columna vertebral"), "el system trae el método de la skill");
  ok(!b.system[0].cache_control, "sin caché: medido el 29/09, el schema distinto la invalida y solo sumaba un 25%");
  ok(b.output_config.format.schema.properties.bloques.items.anyOf.length === 7, "el schema tiene los 7 tipos de bloque");
  ok(!("temperature" in b) && b.thinking.type === "adaptive", "sin temperature y con razonamiento adaptativo (Opus 5.5 rechaza lo demás)");
  ok(b.messages[0].content.includes("De la reunión a la minuta") && !b.messages[0].content.includes("<notas>"), "manda las publicadas y, sin investigación, no inventa notas");
  const conInv = (await correr("armar-escritura.js", { nodos: { Tema: [{ tema }], "Portal: publicadas": [publicadas], "Leer investigación": [{ notas: "Paso 1: abrí X (https://x.com)", advertencia: "" }] } }))[0].json;
  ok(conInv.body.messages[0].content.includes("<notas>\nPaso 1"), "con investigación, las notas van en el pedido");
  console.log(`  · system: ${b.system[0].text.length} caracteres (~${Math.round(b.system[0].text.length / 3.5 / 1000)}k tokens)`);

  const v1 = { doc: BUENA, problemas: ["tiene un vulgarismo"], avisos: ["tiene 9 rayas"] };
  const rev = (await correr("armar-revision.js", { input: [v1], nodos: { "Armar escritura": [conInv] } }))[0].json.body;
  ok(rev.system === conInv.body.system, "la revisión usa el mismo system (el mismo método)");
  ok(rev.messages[0].content.includes("problema: tiene un vulgarismo") && rev.messages[0].content.includes("Paso 1"), "la revisión recibe lo que marcó el validador y las notas");
  ok(rev.messages[0].content.includes("- De la reunión a la minuta"), "la revisión recibe lo publicado (sin eso borró menciones legítimas, 29/09)");
  ok(rev.output_config.format.schema.properties.documento === conInv.schema || JSON.stringify(rev.output_config.format.schema.properties.documento) === JSON.stringify(conInv.schema), "la revisión devuelve el documento con el mismo schema");
}

seccion("Leer respuestas");
{
  const resp = (obj, extra = {}) => ({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(obj) }], usage: { input_tokens: 10, output_tokens: 5 }, ...extra });
  const doc = clon(BUENA); delete doc.eyebrow; doc.titulo = "  " + doc.titulo + "  ";
  const l = (await correr("leer-escritura.js", { input: [resp(doc)] }))[0].json;
  ok(l.doc.eyebrow === "GUÍA DE IA PARA TU NEGOCIO" && l.doc.titulo === BUENA.titulo && l.aprobado === null, "la escritura se normaliza (eyebrow fijo, espacios)");
  const r = (await correr("leer-escritura.js", { input: [resp({ aprobado: true, cambios: ["saqué una raya"], documento: doc })] }))[0].json;
  ok(r.aprobado === true && r.cambios.length === 1 && r.doc.bloques.length === BUENA.bloques.length, "la revisión se lee con su veredicto");
  ok(/cortada/.test(await tira("leer-escritura.js", { input: [resp(doc, { stop_reason: "max_tokens" })] })), "una respuesta cortada frena");
  ok(/no quiso/.test(await tira("leer-escritura.js", { input: [resp(doc, { stop_reason: "refusal" })] })), "un rechazo frena");
  ok(/no es un JSON/.test(await tira("leer-escritura.js", { input: [{ stop_reason: "end_turn", content: [{ type: "text", text: "hola" }] }] })), "un texto que no es JSON frena");
  const inv = (await correr("leer-investigacion.js", { input: [{ stop_reason: "pause_turn", content: [{ type: "text", text: "notas" }], usage: { server_tool_use: { web_search_requests: 3 } } }] }))[0].json;
  ok(inv.notas === "notas" && /mitad de camino/.test(inv.advertencia) && inv.busquedas === 3, "una búsqueda cortada avisa al escritor");
}

// ── 6. Render ────────────────────────────────────────────────────────────────────────────────────────
seccion("Render");
{
  const doc = clon(BUENA); doc.bloques[0].parrafos[0] += " </script><script>alert(1)</script>";
  const out = (await correr("render-leccion.js", { input: [{ doc, ok: true, problemas: [] }] }))[0];
  const html = out.json.html;
  ok(out.json.ok && out.json.archivo.endsWith(".html"), "sale el HTML con su nombre de archivo");
  const adj = (await correr("archivo-leccion.js", { input: [{ chat_id: "1" }], nodos: { Render: [out.json] } }))[0];
  ok(adj.binary.data.mimeType === "text/html" && Buffer.from(adj.binary.data.data, "base64").toString("utf8") === html, "el adjunto es exactamente el HTML de Render");
  ok(!html.includes("</script><script>alert"), "un </script> dentro del texto queda escapado");
  const m = html.match(/window\.DOC\s*=\s*([\s\S]*?)\s*;\s*\n\s*function esc/);
  ok(m && JSON.parse(m[1]).bloques[0].parrafos[0] === doc.bloques[0].parrafos[0], "window.DOC se lee igual que lo leen el portal y las 12 publicadas");
  ok(/"lectura"\s*:\s*"(\d+)\s*min/.test(html), "el portal puede leer los minutos de lectura (estimateMinutes)");
  ok(!/(src|href)\s*=\s*["']https?:\/\//i.test(html), "sin referencias externas");
}

// ── 7. Horario del mail ──────────────────────────────────────────────────────────────────────────────
seccion("Horario del mail");
{
  const h = async (iso, prueba = false) => (await correr("decidir-horario.js", { input: [{ id: "L1", url: "u" }], nodos: { Tema: [{ prueba }] }, ahora: iso }))[0].json;
  const a = await h("2026-10-05T21:30:00Z"); // 18:30 AR
  ok(!a.esperar, "a las 18:30 el mail sale ya");
  const b = await h("2026-10-06T01:30:00Z"); // 22:30 AR del lunes
  ok(b.esperar && b.hasta === "2026-10-06T12:00:00.000Z", `a las 22:30 espera a las 9 del día siguiente (${b.hasta})`);
  const c = await h("2026-10-06T09:00:00Z"); // 06:00 AR
  ok(c.esperar && c.hasta === "2026-10-06T12:00:00.000Z", `a las 6 espera a las 9 del mismo día (${c.hasta})`);
  ok(!(await h("2026-10-06T01:30:00Z", true)).esperar, "en prueba no espera nunca");
}

// ── 8. Mensajes ──────────────────────────────────────────────────────────────────────────────────────
seccion("Mensajes");
{
  const tema = D.TEMAS[0];
  const render = { doc: BUENA, cambios: ["saqué dos rayas"], avisos: [], stats: { palabras: 1200 } };
  const usage = { input_tokens: 2000, output_tokens: 6000, cache_read_input_tokens: 20000, cache_creation_input_tokens: 20000 };
  const f = (await correr("mensaje-final.js", {
    input: [{ recipients: [{ clientName: "Chemical Global Group (CGG)", greetingName: "Lucas" }], skipped: [{ clientName: "Panel de demostración", reason: "falta el mail del dueño" }], subject: "nueva lección: x" }],
    nodos: { Tema: [{ tema, prueba: false }], Render: [render], "Decidir horario": [{ url: "https://portal.skoptimal.com/l/1", esperar: false }], "Leer escritura": [{ usage }], "Leer revisión": [{ usage }] },
  }))[0].json;
  ok(/Mail a: Chemical Global Group \(CGG\) \(Lucas\)/.test(f.texto) && /Sin mail: Panel/.test(f.texto) && /saqué dos rayas/.test(f.texto), "el mensaje final dice a quién, a quién no y qué corrigió");
  ok(f.usd > 0 && /USD \d+\.\d\d/.test(f.texto), `el mensaje final dice el costo (USD ${f.usd})`);
  const rz = (await correr("mensaje-rechazo.js", { input: [{ problemas: ["tiene un vulgarismo"], cambios: [] }], nodos: { Tema: [{ tema, prueba: false }] } }))[0].json;
  ok(/No publiqué/.test(rz.texto) && /vulgarismo/.test(rz.texto) && /\/temas/.test(rz.texto), "el rechazo dice por qué y cómo seguir");
  const e1 = (await correr("mensaje-error.js", { input: [{ workflow: { name: "SK — Lecciones: escribir y publicar" }, execution: { lastNodeExecuted: "Anthropic: escribir", error: { message: "529 overloaded" } } }] }))[0].json;
  ok(/No se publicó nada/.test(e1.texto), "un error antes de publicar lo dice");
  const e2 = (await correr("mensaje-error.js", { input: [{ workflow: { name: "SK — Lecciones: escribir y publicar" }, execution: { lastNodeExecuted: "Portal: avisar", error: { message: "502" } } }] }))[0].json;
  ok(/YA estaba publicada/.test(e2.texto), "un error después de publicar no dice que no se publicó");
  const rs = (await correr("mensaje-resumen.js", { input: [{ periodo: "2026-10-07", enviados: [{ clientName: "CGG", count: 2 }], salteados: [{ clientName: "Brilla", reason: "sin novedades nuevas" }] }] }))[0].json;
  ok(/dos semanas/.test(rs.texto) && /CGG: 2/.test(rs.texto) && /Brilla/.test(rs.texto), "el resumen dice a quién le llegó y a quién no");
  const rv = (await correr("mensaje-resumen.js", { input: [{ periodo: "2026-10-21", enviados: [], salteados: [{ clientName: "Brilla", reason: "sin novedades nuevas" }] }] }))[0].json;
  ok(/no salió ningún mail/.test(rv.texto), "si nadie tuvo novedades, lo dice");

  // cada dos semanas desde el miércoles 07/10 (Pato, 30/09): a las 10 AR = 13 UTC
  const toca = async (iso) => (await correr("toca-resumen.js", { input: [{}], ahora: iso }))[0].json.correr;
  ok((await toca("2026-10-07T13:00:00Z")) === true, "el 07/10 (el primero) toca");
  ok((await toca("2026-10-14T13:00:00Z")) === false, "el 14/10 no toca");
  ok((await toca("2026-10-21T13:00:00Z")) === true, "el 21/10 toca");
  ok((await toca("2026-11-04T13:00:00Z")) === true && (await toca("2026-11-11T13:00:00Z")) === false, "y sigue un miércoles sí y otro no (04/11 sí, 11/11 no)");
  ok((await toca("2026-09-30T13:00:00Z")) === false, "antes del primero no toca");
  ok((await toca("2027-01-13T13:00:00Z")) === true, "cruza el año sin correrse (13/01/2027)");
  const pw = (await correr("toca-resumen.js", { input: [{ headers: {}, body: {} }] }))[0].json;
  ok(pw.correr && pw.prueba, "el webhook de prueba corre siempre, en prueba");
}

console.log(`\n${fallas ? "✗" : "✓"} ${pasadas} bien, ${fallas} mal\n`);
process.exit(fallas ? 1 : 0);
