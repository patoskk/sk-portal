// Nodo "Mensaje resumen" — lo que le llega a Pato después del resumen mensual de novedades.
// Entra: POST /api/automation/updates/digest -> { periodo, enviados, salteados, prueba, test_to }

const CONFIG = /*@CONFIG*/null;

const r = $input.first().json || {};
const enviados = r.enviados || [];
const salteados = r.salteados || [];

const lineas = [];
if (r.prueba) lineas.push(`[PRUEBA] El resumen de ${r.periodo_label || r.periodo} te llegó solo a vos (${r.test_to || 'tu mail'}).`, '');
if (!r.prueba) {
  lineas.push(enviados.length
    ? `Salió el resumen de novedades de ${r.periodo_label || r.periodo}:`
    : `Resumen de ${r.periodo_label || r.periodo}: ningún cliente tuvo novedades ese mes, así que no salió ningún mail.`);
}
enviados.forEach((e) => lineas.push(`- ${e.clientName}: ${e.count} novedad(es)`));
if (salteados.length) {
  lineas.push('', 'Sin mail:');
  salteados.forEach((s) => lineas.push(`- ${s.clientName} (${s.reason})`));
}

return [{ json: { chat_id: CONFIG.pato_chat, texto: lineas.join('\n'), enviar: lineas.length > 0 } }];
