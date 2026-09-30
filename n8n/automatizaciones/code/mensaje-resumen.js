// Nodo "Mensaje resumen" — lo que le llega a Pato después del resumen de novedades (cada dos semanas).
// Entra: POST /api/automation/updates/digest -> { periodo, enviados, salteados, prueba, test_to }

const CONFIG = /*@CONFIG*/null;

const r = $input.first().json || {};
const enviados = r.enviados || [];
const salteados = r.salteados || [];

const lineas = [];
if (r.prueba) {
  lineas.push(`[PRUEBA] El resumen de novedades te llegó solo a vos (${r.test_to || 'tu mail'}), armado con lo pendiente de:`);
} else {
  lineas.push(enviados.length
    ? 'Salió el resumen de novedades de estas dos semanas:'
    : 'Tocaba el resumen de novedades, pero ningún cliente tuvo novedades nuevas: no salió ningún mail.');
}
enviados.forEach((e) => lineas.push(`- ${e.clientName}: ${e.count} novedad(es)`));
if (salteados.length && enviados.length) {
  lineas.push('', 'Sin mail:');
  salteados.forEach((s) => lineas.push(`- ${s.clientName} (${s.reason})`));
}

return [{ json: { chat_id: CONFIG.pato_chat, texto: lineas.join('\n') } }];
