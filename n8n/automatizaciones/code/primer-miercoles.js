// Nodo "¿Primer miércoles?" — el Schedule corre todos los miércoles a las 10; esto deja pasar solo el primero del mes.
// Miércoles y no lunes: el lunes a la tarde ya sale el mail de la lección, y dos mails el mismo día a la
// misma persona se leen como campaña. El webhook de prueba pasa siempre, y puede pedir un mes: { "period": "2026-09" }
// (sin él, el portal resume el mes anterior, que en una prueba suele estar vacío).

const CONFIG = /*@CONFIG*/null;

const j = $input.first().json || {};
if (j.headers) {
  const p = String((j.body && j.body.period) || '');
  return [{ json: { correr: true, prueba: true, period: /^\d{4}-\d{2}$/.test(p) ? p : null } }];
}

const local = new Date(Date.now() + CONFIG.utc_offset_horas * 3600e3);
return [{ json: { correr: local.getUTCDate() <= 7, prueba: false, period: null } }];
