// Nodo "Armar investigación" — solo corre si el tema es de una herramienta concreta (temas.json: investigar).
//
// Por qué existe: los tutoriales hablan de botones, menús y planes que cambian cada pocos meses, y la
// lección sale sin que nadie la lea antes (decisión de Pato, 28/09). Lo que el modelo "recuerda" de una
// herramienta puede estar viejo; lo que encuentra hoy en la web, no. El escritor después tiene prohibido
// afirmar un paso que no esté en estas notas.

const CONFIG = /*@CONFIG*/null;

const { tema } = $('Tema').first().json;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const local = new Date(Date.now() + CONFIG.utc_offset_horas * 3600e3);
const hoy = `${local.getUTCDate()} de ${MESES[local.getUTCMonth()]} de ${local.getUTCFullYear()}`;

const pedido = [
  `Hoy es ${hoy}. Voy a escribir una lección corta para dueños de negocio de Argentina, de más de 35 años y no técnicos, sobre este tema:`,
  '',
  `${tema.titulo}: ${tema.gancho}`,
  tema.nota ? `(${tema.nota})` : '',
  '',
  'Antes de escribir necesito saber cómo es HOY, no cómo era hace un año. Buscá en la web y devolveme notas breves (máximo 350 palabras) con:',
  '1. Qué herramienta o herramientas conviene recomendarle a alguien que recién empieza. Priorizá las gratuitas o con versión gratuita, disponibles en Argentina y en español.',
  '2. Los pasos actuales para hacerlo, con los nombres de los botones y menús tal como aparecen hoy en español (si solo los encontrás en inglés, decilo).',
  '3. Qué incluye la versión gratuita y qué límites tiene. Sin precios exactos: alcanza con "gratis", "versión gratuita con límite" o "pago".',
  '4. Cualquier cosa que haya cambiado hace poco y que haga que un tutorial viejo esté mal.',
  '',
  'Al lado de cada dato, la URL de donde lo sacaste. Si algo no lo pudiste confirmar, escribí SIN CONFIRMAR al lado. Solo las notas, sin introducción.',
].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

return [{
  json: {
    body: {
      model: CONFIG.modelo,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: pedido }],
    },
  },
}];
