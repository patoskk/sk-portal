// Nodo "¿Toca esta semana?" — el Schedule corre todos los miércoles a las 10; esto deja pasar uno sí y otro no.
//
// Cada dos semanas (Pato, 30/09: "quiero que las novedades se avisen a los clientes cada dos semanas, no cada
// mes"), contadas desde un miércoles ancla (config: resumen_ancla, resumen_cada_dias). Miércoles y no lunes:
// el lunes a la tarde ya sale el mail de la lección, y dos mails el mismo día a la misma persona se leen como
// campaña. El webhook de prueba pasa siempre.
//
// Qué entra en cada mail lo decide el portal (lo publicado desde el último resumen de ese cliente), no esto:
// si un miércoles se saltea o falla, lo pendiente no se pierde, sale en el siguiente.

const CONFIG = /*@CONFIG*/null;

const j = $input.first().json || {};
if (j.headers) return [{ json: { correr: true, prueba: true } }];

const DIA = 86400000;
const [y, m, d] = CONFIG.resumen_ancla.split('-').map(Number);
const ancla = Date.UTC(y, m - 1, d);
const local = new Date(Date.now() + CONFIG.utc_offset_horas * 3600e3);
const hoy = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
const dias = Math.round((hoy - ancla) / DIA);

return [{ json: { correr: dias >= 0 && dias % CONFIG.resumen_cada_dias === 0, prueba: false, dias } }];
