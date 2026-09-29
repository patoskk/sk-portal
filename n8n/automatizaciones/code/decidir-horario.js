// Nodo "Decidir horario" — el mail sale ya, salvo de noche.
//
// La lección se publica en el portal en el momento. El mail, si Pato eligió entre las 21 y las 9, espera a
// las 9: un mail de un proveedor a las 23 se nota automático, y el objetivo de ese mail es parecer escrito
// por una persona (ver lib/notify/lessonEmail.ts). En prueba no se espera nunca.

const CONFIG = /*@CONFIG*/null;

const { prueba } = $('Tema').first().json;
const publicada = $input.first().json; // POST /api/automation/lessons -> { id, url }

const off = CONFIG.utc_offset_horas;
const local = new Date(Date.now() + off * 3600e3);
const h = local.getUTCHours();

let esperar = false;
let hasta = null;
if (!prueba && (h >= CONFIG.mail_hasta_hora || h < CONFIG.mail_desde_hora)) {
  const d = new Date(local);
  if (h >= CONFIG.mail_hasta_hora) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(CONFIG.mail_desde_hora, 0, 0, 0);
  hasta = new Date(d.getTime() - off * 3600e3).toISOString();
  esperar = true;
}

return [{ json: { lesson_id: publicada.id, url: publicada.url, esperar, hasta } }];
