// Nodo "Mensaje de error" — del workflow "Avisarme si algo falla" (Error Trigger).
// Es el errorWorkflow de todos los workflows de lecciones y novedades: nada falla en silencio.

const CONFIG = /*@CONFIG*/null;

const j = $input.first().json || {};
const wf = j.workflow?.name || 'un workflow';
const paso = j.execution?.lastNodeExecuted || j.execution?.error?.node?.name || 'sin dato';
const error = String(j.execution?.error?.message || j.trigger?.error?.message || 'sin detalle').slice(0, 600);
const url = j.execution?.url || '';

const lineas = [`Algo falló en «${wf}», en el paso «${paso}»:`, error];
if (url) lineas.push('', url);
// Si se cortó DESPUÉS de publicar, decir "no se publicó nada" sería falso: se dice lo que pasó de verdad.
const DESPUES_DE_PUBLICAR = ['Decidir horario', '¿Esperar?', 'Esperar hasta las 9', 'Portal: avisar', 'Mensaje final', 'Telegram: resultado', 'Archivo', 'Telegram: archivo'];
if (/Lecciones: escribir/.test(wf)) {
  lineas.push('', DESPUES_DE_PUBLICAR.includes(paso)
    ? 'La lección YA estaba publicada en el portal. Fijate en /admin si salió el mail; si no, se manda desde ahí con "Avisar".'
    : 'No se publicó nada y no salió ningún mail. Si era la lección de la semana, mandame /temas para elegir de nuevo.');
}

return [{ json: { chat_id: CONFIG.pato_chat, texto: lineas.join('\n') } }];
