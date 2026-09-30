// Nodo "Mensaje final" — lo que le llega a Pato cuando la lección ya salió.
//
// Tiene que alcanzar para no abrir nada más: qué se publicó, a quién le llegó el mail, a quién no y por
// qué, qué corrigió la revisión y cuánto costó. El HTML va aparte, como archivo, para leer lo que salió.

const CONFIG = /*@CONFIG*/null;

const { tema, prueba } = $('Tema').first().json;
const r = $('Render').first().json;
const h = $('Decidir horario').first().json;
const aviso = $input.first().json || {}; // POST /api/automation/lessons/:id/notify

const usos = [];
for (const n of ['Leer investigación', 'Leer escritura', 'Leer revisión']) {
  try { const u = $(n).first().json.usage; if (u) usos.push(u); } catch (e) { /* la rama no corrió */ }
}
const P = CONFIG.precios;
let usd = 0;
let busquedas = 0;
for (const u of usos) {
  usd += ((u.input_tokens || 0) * P.entrada + (u.output_tokens || 0) * P.salida +
    (u.cache_read_input_tokens || 0) * P.cache_lectura + (u.cache_creation_input_tokens || 0) * P.cache_escritura) / 1e6;
  busquedas += u.server_tool_use?.web_search_requests || 0;
}
usd += busquedas * (P.busqueda || 0);
// + el borrador del mail, que redacta el portal con Sonnet 5 (~USD 0,01): no pasa por n8n y no se mide acá.

const lineas = [];
lineas.push(prueba ? '[PRUEBA] Quedó en el panel de demostración: ningún cliente la ve, y vos tampoco desde /lecciones. Leela en el archivo adjunto.' : 'Publicada:');
lineas.push(r.doc.titulo);
if (!prueba && h.url) lineas.push(h.url);

const destinatarios = (aviso.recipients || []).map((x) => (x.greetingName && x.greetingName !== x.clientName ? `${x.clientName} (${x.greetingName})` : x.clientName));
if (prueba) {
  lineas.push('', `El mail de prueba te llegó a ${aviso.test_to || 'vos'}.`);
} else {
  lineas.push('', destinatarios.length ? `Mail a: ${destinatarios.join(', ')}.` : 'No salió ningún mail.');
  if (h.esperar) lineas.push('Lo elegiste de noche, así que el mail salió a las 9.');
}
const salteados = (aviso.skipped || []).map((s) => `${s.clientName} (${s.reason})`);
if (salteados.length) lineas.push(`Sin mail: ${salteados.join(', ')}.`);
if (aviso.subject) lineas.push(`Asunto: ${aviso.subject}`);

if (r.cambios && r.cambios.length) {
  lineas.push('', 'La revisión corrigió:');
  r.cambios.slice(0, 6).forEach((c) => lineas.push(`- ${c}`));
  if (r.cambios.length > 6) lineas.push(`- y ${r.cambios.length - 6} cosa(s) más`);
}
if (r.avisos && r.avisos.length) {
  lineas.push('', 'Quedó con estos avisos (no frenan la publicación):');
  r.avisos.forEach((a) => lineas.push(`- ${a}`));
}

lineas.push('', `${r.stats.palabras} palabras · costo aproximado USD ${usd.toFixed(2)}${busquedas ? ` · ${busquedas} búsqueda(s) web` : ''}`);
lineas.push('Te adjunto el HTML para que la leas.');

return [{ json: { chat_id: CONFIG.pato_chat, texto: lineas.join('\n'), usd: Number(usd.toFixed(4)), busquedas, tema: tema.id } }];
