// Nodo "Tema" — la entrada del sub-workflow que escribe y publica.
//
// Llega de dos lados:
//   · el bot (Execute Workflow): { topic_id, prueba }
//   · el webhook de prueba:      { body: { topic_id? } }  -> SIEMPRE en prueba, se mande lo que se mande.
// Un webhook que publicara de verdad sería una puerta para mandarles mails a los clientes: por eso no existe.

const CONFIG = /*@CONFIG*/null;
const TEMAS = /*@TEMAS*/null;

const j = $input.first().json;
const desdeWebhook = !!j.headers;
const b = desdeWebhook ? (j.body || {}) : j;
const prueba = desdeWebhook ? true : (b.prueba === true || b.prueba === 'true');

let tema = TEMAS.find((t) => t.id === b.topic_id);
if (!tema && desdeWebhook && !b.topic_id) tema = TEMAS[0];
if (!tema) throw new Error(`No encuentro el tema "${b.topic_id}" en el banco (temas.json).`);

return [{ json: { tema, prueba, chat_id: CONFIG.pato_chat, inicio: new Date().toISOString() } }];
