// Nodo "Contexto" — para qué se está pidiendo la elección de temas. Lo lee elegir-temas.js.
//
// En "temas del lunes" llega de un Schedule (lunes 18, martes 10) o del webhook de prueba.
// En el bot llega de "Ruteo" (/temas, /prueba, "Otros 3"), a veces con un nodo de Telegram en el medio
// (el que responde al toque): por eso se lee "Ruteo" por nombre y no lo que entra.

const CONFIG = /*@CONFIG*/null;

let j = $input.first().json || {};
try {
  const r = $('Ruteo').first().json;
  if (r && r.accion) j = r;
} catch (e) {
  // en "temas del lunes" no hay nodo Ruteo
}

if (j.accion) {
  // desde el bot
  return [{ json: {
    modo: j.accion === 'otros' ? 'otros' : 'pedido',
    prueba: j.prueba === true,
    excluir: Array.isArray(j.excluir) ? j.excluir : [],
  } }];
}

if (j.headers) {
  // el webhook de prueba: siempre en prueba
  return [{ json: { modo: 'pedido', prueba: true, excluir: [] } }];
}

const local = new Date(Date.now() + CONFIG.utc_offset_horas * 3600e3);
const dia = local.getUTCDay(); // 1 = lunes, 2 = martes
return [{ json: { modo: dia === 1 ? 'lunes' : dia === 2 ? 'martes' : 'pedido', prueba: false, excluir: [] } }];
