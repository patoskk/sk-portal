// Nodos "Leer escritura" y "Leer revisión" — el MISMO código en los dos.
//
// Sacan el JSON de la respuesta de Claude y lo dejan con la forma que espera la plantilla. Si la
// respuesta vino cortada o rechazada, frenan con un error que dice por qué: el workflow de errores se
// lo manda a Pato por Telegram. Nunca se sigue con un documento a medias.
//
// La revisión devuelve { aprobado, cambios, documento }; la escritura devuelve el documento solo.

const EYEBROW = 'GUÍA DE IA PARA TU NEGOCIO';

const r = $input.first().json || {};
if (r.stop_reason === 'max_tokens') throw new Error('Claude se quedó sin espacio y la lección vino cortada (max_tokens).');
if (r.stop_reason === 'refusal') throw new Error(`Claude no quiso escribirla (refusal: ${r.stop_details?.category || 'sin categoría'}).`);

const texto = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
let salida;
try {
  salida = JSON.parse(texto);
} catch (e) {
  throw new Error(`La respuesta no es un JSON válido: ${String(texto).slice(0, 200)}`);
}

const esRevision = salida && typeof salida === 'object' && 'documento' in salida;
const doc = esRevision ? salida.documento : salida;
if (!doc || !Array.isArray(doc.bloques)) throw new Error('La respuesta no trae una lección (faltan los bloques).');

// Normalizar lo que no depende del redactor.
const limpio = (v) => (typeof v === 'string' ? v.trim() : v);
const normalizado = { modo: doc.modo, eyebrow: EYEBROW };
for (const k of ['titulo', 'subtitulo', 'lectura', 'intro']) if (doc[k] != null) normalizado[k] = limpio(doc[k]);
normalizado.bloques = doc.bloques;
if (doc.cierre) normalizado.cierre = { ...doc.cierre, firma: limpio(doc.cierre.firma) || 'Equipo SK Optimal' };

return [{
  json: {
    doc: normalizado,
    aprobado: esRevision ? salida.aprobado === true : null,
    cambios: esRevision && Array.isArray(salida.cambios) ? salida.cambios : [],
    usage: r.usage || null,
  },
}];
