// Nodo "Render" — el HTML de la lección, con la plantilla y el CSS de la skill (los mismos de render-web.mjs).
//
// Diferencia a propósito con render-web.mjs: acá el JSON lo escribió un modelo, así que cada "<" se
// escapa como <. Un "</script>" adentro de un texto cerraría el script de la plantilla y rompería la
// página; escapado, sigue siendo el mismo texto para el navegador.
//
// El adjunto para Telegram lo arma "Archivo" (archivo-leccion.js) al final, a partir de `html`.

const PLANTILLA = /*@PLANTILLA*/null;
const CSS = /*@CSS*/null;

const j = $input.first().json;
const doc = j.doc;
const datos = JSON.stringify(doc, null, 2).replace(/</g, '\\u003c');
const html = PLANTILLA.replace('/*__WEB_CSS__*/', () => CSS).replace('__DOC_DATA__', () => datos);

const problemas = [...(j.problemas || [])];
const externos = (html.match(/(src|href)\s*=\s*["']https?:\/\//gi) || []).length + (html.match(/cdn\.jsdelivr/gi) || []).length;
if (externos) problemas.push(`el HTML tiene ${externos} referencia(s) externa(s): tiene que funcionar sin internet`);
if (html.includes('__DOC_DATA__') || html.includes('/*__WEB_CSS__*/')) problemas.push('la plantilla quedó con un marcador sin reemplazar');

const slug = String(doc.titulo || 'leccion')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'leccion';

return [{ json: { ...j, ok: problemas.length === 0, problemas, html, archivo: `${slug}.html` } }];
