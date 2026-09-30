#!/usr/bin/env node
// build.mjs — arma los 5 workflows de las automatizaciones del portal a partir de code/*.js, config.json y
// la skill nutricion-ia. No toca n8n: escribe dist/*.json. Lo sube subir.mjs.
//
//   node build.mjs            arma y verifica (dist/)
//
// Mismo patrón que el build.py del bot de promos de CGG: los .js y el JSON del workflow nunca se desfasan,
// porque el JSON se GENERA. Nada de editar un nodo en la interfaz de n8n: se pisa en el próximo subir.
//
// Antes de escribir, verifica cada workflow: que toda conexión apunte a un nodo que existe y que todo
// $('Nodo') que aparece en un código o una expresión exista en ESE workflow. Esa referencia rota no da
// error hasta que el camino corre de verdad: un lunes a las 18, con Pato esperando.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { AQUI, config, codigo } from "./build-lib.mjs";

const C = config();
const IDS_PATH = join(AQUI, "ids.json");

const uuid = (clave) => {
  const h = createHash("sha1").update(clave).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// ── Piezas ──────────────────────────────────────────────────────────────────────────────────────────
function armar(nombreWf, ids) {
  const nodos = [];
  const con = {};
  const cred = ids.credenciales;
  const credTelegram = { telegramApi: { id: cred.telegram, name: C.credenciales.telegram } };
  const credPortal = { httpHeaderAuth: { id: cred.portal, name: C.credenciales.portal } };
  const credAnthropic = { anthropicApi: { id: cred.anthropic, name: C.credenciales.anthropic } };
  const REINTENTO = { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };

  const n = (name, type, typeVersion, pos, parameters, extra = {}) => {
    nodos.push({ id: uuid(`${nombreWf}/${name}`), name, type, typeVersion, position: [pos[0] * 240, pos[1] * 170], parameters, ...extra });
    return name;
  };
  const une = (de, a, salida = 0) => {
    con[de] ??= { main: [] };
    while (con[de].main.length <= salida) con[de].main.push([]);
    con[de].main[salida].push({ node: a, type: "main", index: 0 });
  };
  const cadena = (...xs) => xs.reduce((a, b) => (une(a, b), b));

  const code = (name, pos, archivo) => n(name, "n8n-nodes-base.code", 2, pos, { jsCode: codigo(archivo) });
  const si = (name, pos, expr) =>
    n(name, "n8n-nodes-base.if", 2.2, pos, {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        combinator: "and",
        conditions: [{ id: uuid(name), leftValue: `={{ ${expr} }}`, rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
      },
      options: {},
    });
  const portal = (name, pos, metodo, ruta, cuerpo) =>
    n(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
      method: metodo,
      url: `=${C.portal_url}${ruta}`,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      ...(cuerpo ? { sendBody: true, specifyBody: "json", jsonBody: `={{ JSON.stringify(${cuerpo}) }}` } : {}),
      options: { timeout: 120000 },
    }, { credentials: credPortal, ...REINTENTO });
  const anthropic = (name, pos) =>
    n(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "anthropicApi",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.body) }}",
      options: { timeout: 600000 },
    }, { credentials: credAnthropic, ...REINTENTO });
  const telegram = (name, pos, parameters) =>
    n(name, "n8n-nodes-base.telegram", 1.2, pos, parameters, { credentials: credTelegram, ...REINTENTO });
  const mensaje = (name, pos, chat, texto, extra = {}) =>
    telegram(name, pos, { chatId: chat, text: texto, ...extra, additionalFields: { appendAttribution: false } });
  const teclado = (pre) => ({
    replyMarkup: "inlineKeyboard",
    inlineKeyboard: {
      rows: [
        { row: { buttons: [{ text: `={{ ${pre}.b1_text }}`, additionalFields: { callback_data: `={{ ${pre}.b1_data }}` } }] } },
        { row: { buttons: [{ text: `={{ ${pre}.b2_text }}`, additionalFields: { callback_data: `={{ ${pre}.b2_data }}` } }] } },
        { row: { buttons: [{ text: `={{ ${pre}.b3_text }}`, additionalFields: { callback_data: `={{ ${pre}.b3_data }}` } }] } },
        { row: { buttons: [
          { text: "Otros 3", additionalFields: { callback_data: `={{ ${pre}.otros_data }}` } },
          { text: "Esta semana no", additionalFields: { callback_data: `={{ ${pre}.no_data }}` } },
        ] } },
      ],
    },
  });
  const editar = (name, pos, texto, conTeclado) =>
    telegram(name, pos, {
      operation: "editMessageText",
      messageType: "message",
      chatId: "={{ $('Ruteo').first().json.chat_id }}",
      messageId: "={{ $('Ruteo').first().json.message_id }}",
      text: texto,
      ...(conTeclado ? teclado("$json") : {}),
      additionalFields: {},
    });
  const toque = (name, pos) =>
    telegram(name, pos, {
      resource: "callback",
      queryId: "={{ $('Ruteo').first().json.callback_id }}",
      additionalFields: { text: "={{ $('Ruteo').first().json.aviso }}" },
    });
  const webhookPrueba = (name, pos, path) =>
    n(name, "n8n-nodes-base.webhook", 2, pos, { httpMethod: "POST", path, authentication: "headerAuth", options: {} }, {
      webhookId: uuid(`webhook/${path}`),
      credentials: credPortal,
      notes: "Solo para PROBAR: todo lo que entra por acá corre en modo prueba (panel de demostración, mail solo a Pato). Header: Authorization: Bearer <AUTOMATION_SECRET>.",
    });
  const semanal = (name, pos, dia, hora) =>
    n(name, "n8n-nodes-base.scheduleTrigger", 1.2, pos, { rule: { interval: [{ field: "weeks", triggerAtDay: [dia], triggerAtHour: hora }] } });
  const chatPato = `=${C.pato_chat}`;

  return { n, une, cadena, code, si, portal, anthropic, telegram, mensaje, teclado, editar, toque, webhookPrueba, semanal, chatPato, credTelegram, nodos, con, REINTENTO };
}

const SETTINGS = (ids, conErrores = true) => ({
  executionOrder: "v1",
  timezone: C.zona,
  saveManualExecutions: true,
  ...(conErrores && ids.workflows.errores ? { errorWorkflow: ids.workflows.errores } : {}),
});

// ── W5: Avisarme si algo falla ───────────────────────────────────────────────────────────────────────
function wfErrores(ids) {
  const W = C.workflows.errores;
  const b = armar(W, ids);
  b.n("Error Trigger", "n8n-nodes-base.errorTrigger", 1, [0, 0], {});
  b.code("Mensaje de error", [1, 0], "mensaje-error.js");
  b.mensaje("Telegram: error", [2, 0], b.chatPato, "={{ $json.texto }}");
  // la trampa de la recursión: si lo que falló es Telegram, el aviso por Telegram también falla y el
  // error se pierde. Por eso, si este nodo falla, el aviso sale por mail.
  b.nodos.find((x) => x.name === "Telegram: error").onError = "continueErrorOutput";
  b.n("Gmail: si Telegram falla", "n8n-nodes-base.gmail", 2.1, [3, 1], {
    sendTo: C.pato_email,
    subject: "Falló una automatización del portal (y Telegram no respondió)",
    emailType: "text",
    message: "={{ $('Mensaje de error').first().json.texto }}",
    options: { appendAttribution: false },
  }, { credentials: { gmailOAuth2: { id: ids.credenciales.gmail, name: C.credenciales.gmail } }, ...b.REINTENTO });
  b.cadena("Error Trigger", "Mensaje de error", "Telegram: error");
  b.une("Telegram: error", "Gmail: si Telegram falla", 1);
  return { name: W, nodes: b.nodos, connections: b.con, settings: SETTINGS(ids, false) };
}

// ── W3: Lecciones — escribir y publicar ──────────────────────────────────────────────────────────────
function wfEscribir(ids) {
  const W = C.workflows.escribir;
  const b = armar(W, ids);
  b.n("Desde el bot", "n8n-nodes-base.executeWorkflowTrigger", 1.1, [0, 0], {
    workflowInputs: { values: [{ name: "topic_id" }, { name: "prueba", type: "boolean" }] },
  });
  b.webhookPrueba("Prueba (webhook)", [0, 1], "sk-lecciones-escribir-prueba");
  b.code("Tema", [1, 0], "tema.js");
  b.portal("Portal: publicadas", [2, 0], "GET", "/api/automation/lessons");
  b.si("¿Investigar?", [3, 0], "$('Tema').first().json.tema.investigar === true");
  b.code("Armar investigación", [4, -1], "armar-investigacion.js");
  b.anthropic("Anthropic: investigar", [5, -1]);
  b.code("Leer investigación", [6, -1], "leer-investigacion.js");
  b.code("Armar escritura", [7, 0], "armar-escritura.js");
  b.anthropic("Anthropic: escribir", [8, 0]);
  b.code("Leer escritura", [9, 0], "leer-escritura.js");
  b.code("Validar (1)", [10, 0], "validar-leccion.js");
  b.code("Armar revisión", [11, 0], "armar-revision.js");
  b.anthropic("Anthropic: revisar", [12, 0]);
  b.code("Leer revisión", [13, 0], "leer-escritura.js");
  b.code("Validar (2)", [14, 0], "validar-leccion.js");
  b.code("Render", [15, 0], "render-leccion.js");
  b.si("¿Pasó?", [16, 0], "$json.ok === true");
  b.portal("Portal: publicar", [17, -1], "POST", "/api/automation/lessons",
    "{ title: $json.doc.titulo, html: $json.html, topic: $('Tema').first().json.tema.categoria, source_topic: $('Tema').first().json.tema.id, prueba: $('Tema').first().json.prueba }");
  b.code("Decidir horario", [18, -1], "decidir-horario.js");
  b.si("¿Esperar?", [19, -1], "$json.esperar === true");
  b.n("Esperar hasta las 9", "n8n-nodes-base.wait", 1.1, [20, -2], { resume: "specificTime", dateTime: "={{ $json.hasta }}" }, { webhookId: uuid(`${W}/esperar`) });
  b.portal("Portal: avisar", [21, -1], "POST", "/api/automation/lessons/{{ $('Decidir horario').first().json.lesson_id }}/notify",
    "{ prueba: $('Tema').first().json.prueba }");
  b.code("Mensaje final", [22, -1], "mensaje-final.js");
  b.mensaje("Telegram: resultado", [23, -1], b.chatPato, "={{ $('Mensaje final').first().json.texto }}");
  b.code("Archivo", [24, -1], "archivo-leccion.js");
  b.telegram("Telegram: archivo", [25, -1], {
    operation: "sendDocument", chatId: b.chatPato, binaryData: true, binaryPropertyName: "data",
    additionalFields: { caption: "La lección, para leerla." },
  });
  b.code("Mensaje rechazo", [17, 1], "mensaje-rechazo.js");
  b.mensaje("Telegram: rechazo", [18, 1], b.chatPato, "={{ $json.texto }}");
  b.code("Archivo (rechazo)", [19, 1], "archivo-leccion.js");
  b.telegram("Telegram: archivo (rechazo)", [20, 1], {
    operation: "sendDocument", chatId: b.chatPato, binaryData: true, binaryPropertyName: "data",
    additionalFields: { caption: "Así quedó (no se publicó)." },
  });

  b.une("Desde el bot", "Tema");
  b.une("Prueba (webhook)", "Tema");
  b.cadena("Tema", "Portal: publicadas", "¿Investigar?");
  b.une("¿Investigar?", "Armar investigación", 0);
  b.une("¿Investigar?", "Armar escritura", 1);
  b.cadena("Armar investigación", "Anthropic: investigar", "Leer investigación", "Armar escritura");
  b.cadena("Armar escritura", "Anthropic: escribir", "Leer escritura", "Validar (1)", "Armar revisión", "Anthropic: revisar", "Leer revisión", "Validar (2)", "Render", "¿Pasó?");
  b.une("¿Pasó?", "Portal: publicar", 0);
  b.une("¿Pasó?", "Mensaje rechazo", 1);
  b.cadena("Portal: publicar", "Decidir horario", "¿Esperar?");
  b.une("¿Esperar?", "Esperar hasta las 9", 0);
  b.une("¿Esperar?", "Portal: avisar", 1);
  b.une("Esperar hasta las 9", "Portal: avisar");
  b.cadena("Portal: avisar", "Mensaje final", "Telegram: resultado", "Archivo", "Telegram: archivo");
  b.cadena("Mensaje rechazo", "Telegram: rechazo", "Archivo (rechazo)", "Telegram: archivo (rechazo)");
  return { name: W, nodes: b.nodos, connections: b.con, settings: SETTINGS(ids) };
}

// ── W1: Lecciones — temas del lunes ──────────────────────────────────────────────────────────────────
function wfTemas(ids) {
  const W = C.workflows.temas;
  const b = armar(W, ids);
  b.semanal("Lunes 18:00", [0, -1], 1, 18);
  b.semanal("Martes 10:00", [0, 0], 2, 10);
  b.webhookPrueba("Prueba (webhook)", [0, 1], "sk-lecciones-temas-prueba");
  b.code("Contexto", [1, 0], "contexto.js");
  b.portal("Portal: estado", [2, 0], "GET", "/api/automation/lessons");
  b.code("Elegir temas", [3, 0], "elegir-temas.js");
  b.si("¿Mandar?", [4, 0], "$json.enviar === true");
  b.mensaje("Telegram: temas", [5, 0], "={{ $json.chat_id }}", "={{ $json.texto }}", b.teclado("$json"));
  b.portal("Portal: semana ofrecida", [6, 0], "POST", "/api/automation/lesson-weeks",
    "{ status: 'ofrecida', offered: $('Elegir temas').first().json.offered, prueba: $('Elegir temas').first().json.prueba }");
  for (const t of ["Lunes 18:00", "Martes 10:00", "Prueba (webhook)"]) b.une(t, "Contexto");
  b.cadena("Contexto", "Portal: estado", "Elegir temas", "¿Mandar?");
  b.une("¿Mandar?", "Telegram: temas", 0);
  b.une("Telegram: temas", "Portal: semana ofrecida");
  return { name: W, nodes: b.nodos, connections: b.con, settings: SETTINGS(ids) };
}

// ── W2: Bot de Pato ──────────────────────────────────────────────────────────────────────────────────
function wfBot(ids) {
  const W = C.workflows.bot;
  const b = armar(W, ids);
  b.n("Telegram", "n8n-nodes-base.telegramTrigger", 1.2, [0, 0], { updates: ["message", "callback_query"], additionalFields: {} }, {
    webhookId: uuid(`${W}/telegram`),
    credentials: b.credTelegram,
  });
  b.code("Ruteo", [1, 0], "ruteo-bot.js");
  const ACCIONES = ["elegir", "otros", "saltar", "vacio", "temas", "ayuda"];
  b.n("Qué hacer", "n8n-nodes-base.switch", 3.2, [2, 0], {
    rules: {
      values: ACCIONES.map((a) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ id: uuid(`accion/${a}`), leftValue: "={{ $json.accion }}", rightValue: a, operator: { type: "string", operation: "equals" } }],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: a,
      })),
    },
    options: {},
  });

  // elegir
  b.toque("Responder toque: elegir", [3, -3]);
  b.portal("Portal: estado (elegir)", [4, -3], "GET", "/api/automation/lessons");
  b.si("¿Ya hay lección esta semana?", [5, -3],
    "$('Ruteo').first().json.prueba !== true && !!$json.semana && $json.semana.status === 'elegida' && !!$json.semana.lesson_id");
  b.editar("Editar: ya había una", [6, -4], "Ya se publicó la lección de esta semana. Si querés subir otra, hacelo desde /admin del portal.");
  b.editar("Editar: elegida", [6, -3], "={{ $('Ruteo').first().json.texto_edicion }}");
  b.portal("Portal: semana elegida", [7, -3], "POST", "/api/automation/lesson-weeks", "{ status: 'elegida', prueba: $('Ruteo').first().json.prueba }");
  b.n("Escribir y publicar", "n8n-nodes-base.executeWorkflow", 1.2, [8, -3], {
    workflowId: { __rl: true, value: ids.workflows.escribir, mode: "id" },
    workflowInputs: {
      mappingMode: "defineBelow",
      value: {
        topic_id: "={{ $('Ruteo').first().json.topic_id }}",
        prueba: "={{ $('Ruteo').first().json.prueba }}",
      },
      matchingColumns: [],
      schema: [
        { id: "topic_id", displayName: "topic_id", required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: "string" },
        { id: "prueba", displayName: "prueba", required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: "boolean" },
      ],
      attemptToConvertTypes: false,
      convertFieldsToString: false,
    },
    // no espera: escribir tarda minutos, y el sub-workflow le avisa a Pato por su cuenta
    options: { waitForSubWorkflow: false },
  });

  // otros / temas -> ofrecer
  b.toque("Responder toque: otros", [3, -1]);
  b.code("Contexto", [4, 0], "contexto.js");
  b.portal("Portal: estado", [5, 0], "GET", "/api/automation/lessons");
  b.code("Elegir temas", [6, 0], "elegir-temas.js");
  b.si("¿Es Otros 3?", [7, 0], "$('Ruteo').first().json.accion === 'otros'");
  b.editar("Editar: otros temas", [8, -1], "={{ $json.texto }}", true);
  b.mensaje("Telegram: temas", [8, 1], "={{ $json.chat_id }}", "={{ $json.texto }}", b.teclado("$json"));

  // saltar / vacío / ayuda
  b.toque("Responder toque: saltar", [3, 2]);
  b.editar("Editar: salteada", [4, 2], "={{ $('Ruteo').first().json.texto_edicion }}");
  b.portal("Portal: semana salteada", [5, 2], "POST", "/api/automation/lesson-weeks", "{ status: 'salteada', prueba: $('Ruteo').first().json.prueba }");
  b.toque("Responder toque: vacío", [3, 3]);
  b.mensaje("Telegram: ayuda", [3, 4], "={{ $json.chat_id }}", "={{ $json.texto }}");

  b.cadena("Telegram", "Ruteo", "Qué hacer");
  b.une("Qué hacer", "Responder toque: elegir", 0);
  b.une("Qué hacer", "Responder toque: otros", 1);
  b.une("Qué hacer", "Responder toque: saltar", 2);
  b.une("Qué hacer", "Responder toque: vacío", 3);
  b.une("Qué hacer", "Contexto", 4);
  b.une("Qué hacer", "Telegram: ayuda", 5);
  b.cadena("Responder toque: elegir", "Portal: estado (elegir)", "¿Ya hay lección esta semana?");
  b.une("¿Ya hay lección esta semana?", "Editar: ya había una", 0);
  b.une("¿Ya hay lección esta semana?", "Editar: elegida", 1);
  b.cadena("Editar: elegida", "Portal: semana elegida", "Escribir y publicar");
  b.une("Responder toque: otros", "Contexto");
  b.cadena("Contexto", "Portal: estado", "Elegir temas", "¿Es Otros 3?");
  b.une("¿Es Otros 3?", "Editar: otros temas", 0);
  b.une("¿Es Otros 3?", "Telegram: temas", 1);
  b.cadena("Responder toque: saltar", "Editar: salteada", "Portal: semana salteada");
  return { name: W, nodes: b.nodos, connections: b.con, settings: SETTINGS(ids) };
}

// ── W4: Novedades — resumen cada dos semanas ─────────────────────────────────────────────────────────
function wfResumen(ids) {
  const W = C.workflows.resumen;
  const b = armar(W, ids);
  b.semanal("Miércoles 10:00", [0, 0], 3, 10);
  b.webhookPrueba("Prueba (webhook)", [0, 1], "sk-novedades-resumen-prueba");
  b.code("¿Toca esta semana?", [1, 0], "toca-resumen.js");
  b.si("¿Correr?", [2, 0], "$json.correr === true");
  b.portal("Portal: resumen", [3, 0], "POST", "/api/automation/updates/digest", "{ prueba: $('¿Toca esta semana?').first().json.prueba }");
  b.code("Mensaje resumen", [4, 0], "mensaje-resumen.js");
  b.mensaje("Telegram: resumen", [5, 0], b.chatPato, "={{ $json.texto }}");
  b.une("Miércoles 10:00", "¿Toca esta semana?");
  b.une("Prueba (webhook)", "¿Toca esta semana?");
  b.cadena("¿Toca esta semana?", "¿Correr?");
  b.une("¿Correr?", "Portal: resumen", 0);
  b.cadena("Portal: resumen", "Mensaje resumen", "Telegram: resumen");
  return { name: W, nodes: b.nodos, connections: b.con, settings: SETTINGS(ids) };
}

// ── Verificación ─────────────────────────────────────────────────────────────────────────────────────
// Referencias que pueden faltar a propósito: el código las lee dentro de un try.
const FALTANTES_PERMITIDOS = { [C.workflows.temas]: ["Ruteo"] };

export function verificar(wf) {
  const errores = [];
  const nombres = new Set(wf.nodes.map((x) => x.name));
  if (nombres.size !== wf.nodes.length) errores.push("hay nombres de nodo repetidos");
  for (const [de, { main }] of Object.entries(wf.connections)) {
    if (!nombres.has(de)) errores.push(`conexión desde un nodo que no existe: ${de}`);
    for (const salida of main) for (const c of salida) if (!nombres.has(c.node)) errores.push(`${de} -> ${c.node}: ese nodo no existe`);
  }
  const permitidos = FALTANTES_PERMITIDOS[wf.name] || [];
  for (const nodo of wf.nodes) {
    const txt = JSON.stringify(nodo.parameters);
    for (const m of txt.matchAll(/\$\(\\?['"]([^'"\\]+)\\?['"]\)/g)) {
      if (!nombres.has(m[1]) && !permitidos.includes(m[1])) errores.push(`«${nodo.name}» lee $('${m[1]}'), que no existe en este workflow`);
    }
    if (/\/\*@[A-Z_]+\*\//.test(txt)) errores.push(`«${nodo.name}» quedó con un marcador sin inyectar`);
    const cred = Object.values(nodo.credentials || {});
    if (cred.some((c) => !c.id)) errores.push(`«${nodo.name}» tiene una credencial sin id (${cred.map((c) => c.name).join(", ")})`);
  }
  // todo nodo salvo los disparadores tiene que recibir algo
  const destinos = new Set(Object.values(wf.connections).flatMap(({ main }) => main.flat().map((c) => c.node)));
  for (const nodo of wf.nodes) {
    if (/Trigger|webhook|scheduleTrigger/i.test(nodo.type)) continue;
    if (!destinos.has(nodo.name)) errores.push(`«${nodo.name}» no recibe ninguna conexión: nunca corre`);
  }
  return errores;
}

export function construir(ids) {
  return [wfErrores(ids), wfEscribir(ids), wfTemas(ids), wfBot(ids), wfResumen(ids)];
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  const ids = existsSync(IDS_PATH)
    ? JSON.parse(readFileSync(IDS_PATH, "utf8"))
    : { credenciales: { telegram: "(falta)", anthropic: "(falta)", portal: "(falta)", gmail: "(falta)" }, workflows: { errores: "(falta)", escribir: "(falta)" } };
  mkdirSync(join(AQUI, "dist"), { recursive: true });
  let mal = 0;
  for (const wf of construir(ids)) {
    const errores = verificar(wf);
    const archivo = join(AQUI, "dist", `${wf.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.json`);
    writeFileSync(archivo, JSON.stringify(wf, null, 2));
    console.log(`${errores.length ? "✗" : "✓"} ${wf.name} — ${wf.nodes.length} nodos`);
    errores.forEach((e) => console.log(`    ${e}`));
    mal += errores.length;
  }
  process.exit(mal ? 1 : 0);
}
