// Nodo "Armar escritura" — el pedido a Claude que escribe la lección.
//
// El system prompt es el MISMO para escribir y para revisar (armar-revision.js lo toma de acá): así la
// revisión, que sale minutos después, lee el método completo desde la caché en vez de pagarlo de nuevo.
// Por eso la tarea concreta ("escribí" / "revisá") va en el mensaje, no en el system.
//
// El método, el contrato y el ejemplo vienen de la skill nutricion-ia (build-lib.mjs los inyecta).
// Las REGLAS de abajo son las que después controla validar-leccion.js: si se cambia una, se cambian las dos.

const CONFIG = /*@CONFIG*/null;
const CATEGORIAS = /*@CATEGORIAS*/null;
const ICONOS = /*@ICONOS*/null;
const FRAMEWORK = /*@FRAMEWORK*/null;
const CONTRATO = /*@CONTRATO*/null;
const EJEMPLO_DEEP = /*@EJEMPLO_DEEP*/null;
const EJEMPLO_DIGEST = /*@EJEMPLO_DIGEST*/null;

const { tema } = $('Tema').first().json;
const publicados = ($('Portal: publicadas').first().json.publicados || []).map((p) => p.title);

let investigacion = null;
try {
  investigacion = $('Leer investigación').first().json;
} catch (e) {
  investigacion = null; // el tema no pedía investigar: la rama no corrió
}

const REGLAS = `REGLAS QUE NO SE NEGOCIAN (si se rompe una, la lección no se publica):
- No se vende. Son clientes actuales: nada de ofrecer servicios de SK Optimal, pedir que nos contraten, proponer una llamada, una demo o un presupuesto. Si hay cierre, es cálido y de soporte ("cualquier duda, escribinos: para eso estamos").
- Nunca "en criollo": se dice "en palabras simples".
- Atemporal: sin fechas, sin años, sin "semana del", sin "este mes". "Esta semana" para la acción sí vale.
- Sin emojis y sin signos de exclamación.
- Sin vulgarismos ni vocabulario callejero. Nunca "el tipo" o "un tipo" para hablar de una persona (se dice el dueño, el cliente, la persona), ni "loco", "che", "quilombo", "guita", "flaco", "pibe", "boludo".
- Los ejemplos son del mundo del lector: distribuidoras, mayoristas, inmobiliarias, tiendas online, constructoras, tiendas de tecnología, estudios profesionales. Nunca un almacén, un kiosco, una despensa ni una verdulería.
- Sin precios exactos ni montos: "gratis", "tiene versión gratis" o "plan pago". Los precios cambian y la lección tiene que seguir siendo cierta.
- No afirmes un paso, un botón, un menú o una función de una herramienta que no esté en las notas de investigación (cuando las hay). Si no estás seguro, describilo en general ("en el menú, buscá la opción para compartir").
- Usá pocas rayas (—): preferí el punto o la coma. Muchas rayas hacen que el texto se lea escrito por una máquina.
- Largo: entre 700 y 1400 palabras en total. Párrafos de dos a cuatro líneas: ninguno de más de 70 palabras.
- Exactamente un tip con estilo "accion" (la acción chica y concreta para esta semana) y un tip "aviso" con el error más común.
- "lectura" con la forma "N min de lectura", a razón de unas 200 palabras por minuto.
- Íconos: solo ${ICONOS.join(', ')}.
- No pongas "eyebrow": lo agrega el sistema.`;

const SYSTEM = [
  'Trabajás en las lecciones de IA que SK Optimal (agencia de agentes de IA y automatizaciones de Argentina) publica cada semana en el portal de sus clientes. Los lectores son dueños de negocios establecidos, de más de 35 años y no técnicos, que ya son clientes. Cada lección se publica y se les avisa por mail sin que nadie la lea antes, así que tiene que salir lista.',
  'A veces te toca escribir una lección nueva y a veces revisar la que escribió otro redactor: la tarea concreta está en el mensaje.',
  REGLAS,
  `<metodo>\n${FRAMEWORK}\n</metodo>`,
  `<contrato>\n${CONTRATO}\n</contrato>`,
  `<ejemplo_deep_dive>\nUna lección real ya publicada y aprobada. Copiá el nivel, no el tema.\n${JSON.stringify(EJEMPLO_DEEP)}\n</ejemplo_deep_dive>`,
  `<ejemplo_digest>\n${JSON.stringify(EJEMPLO_DIGEST)}\n</ejemplo_digest>`,
].join('\n\n');

// El documento, como schema de salida estructurada: el JSON llega válido o no llega.
const S = (props, requeridos) => ({ type: 'object', additionalProperties: false, properties: props, required: requeridos });
const str = { type: 'string' };
const lista = { type: 'array', items: str };
const icono = { type: 'string', enum: ICONOS };
const BLOQUES = [
  S({ tipo: { type: 'string', const: 'seccion' }, icono, titulo: str, parrafos: lista }, ['tipo', 'titulo', 'parrafos']),
  S({ tipo: { type: 'string', const: 'pasos' }, icono, titulo: str, pasos: { type: 'array', items: S({ t: str, d: str }, ['t', 'd']) } }, ['tipo', 'titulo', 'pasos']),
  S({ tipo: { type: 'string', const: 'herramienta' }, nombre: str, precio: str, que: str, como: str, para: str }, ['tipo', 'nombre', 'que', 'como', 'para']),
  S({ tipo: { type: 'string', const: 'tip' }, estilo: { type: 'string', enum: ['accion', 'aviso', 'dato'] }, titulo: str, texto: str }, ['tipo', 'estilo', 'titulo', 'texto']),
  S({ tipo: { type: 'string', const: 'comparacion' }, titulo: str, antes: S({ titulo: str, items: lista }, ['titulo', 'items']), despues: S({ titulo: str, items: lista }, ['titulo', 'items']) }, ['tipo', 'titulo', 'antes', 'despues']),
  S({ tipo: { type: 'string', const: 'claves' }, icono, titulo: str, items: lista }, ['tipo', 'titulo', 'items']),
  S({ tipo: { type: 'string', const: 'cita' }, texto: str, autor: str }, ['tipo', 'texto']),
];
const SCHEMA = S({
  modo: { type: 'string', enum: ['deep-dive', 'digest'] },
  titulo: str,
  subtitulo: str,
  lectura: str,
  intro: str,
  bloques: { type: 'array', items: { anyOf: BLOQUES } },
  cierre: S({ titulo: str, texto: str, firma: str }, ['titulo', 'texto', 'firma']),
}, ['modo', 'titulo', 'subtitulo', 'lectura', 'intro', 'bloques', 'cierre']);

const partes = [
  'TAREA: escribir una lección nueva.',
  '',
  `Tema: ${tema.titulo}`,
  `De qué trata: ${tema.gancho}`,
  `Modo: ${tema.modo}`,
  `Categoría en el portal: ${CATEGORIAS[tema.categoria] || tema.categoria}`,
];
if (tema.nota) partes.push(`Nota del editor: ${tema.nota}`);
partes.push('', 'Lecciones ya publicadas (no repitas su contenido; si viene al caso, podés mencionarlas por su nombre):');
publicados.forEach((t) => partes.push(`- ${t}`));
if (investigacion) {
  partes.push('', 'Notas de investigación, buscadas hoy en la web. Para pasos, botones, menús y planes, usá solo esto:', '<notas>', investigacion.notas || '(vacías)', '</notas>');
  if (investigacion.advertencia) partes.push(investigacion.advertencia);
}
partes.push('', 'Seguí el método: probá tres titulares y quedate con el más concreto, respondé las seis preguntas de la columna vertebral y cerrá con la acción de la semana. Devolvé el documento completo.');

return [{
  json: {
    system: SYSTEM,
    schema: SCHEMA,
    notas: investigacion ? investigacion.notas : '',
    body: {
      model: CONFIG.modelo,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: partes.join('\n') }],
    },
  },
}];
