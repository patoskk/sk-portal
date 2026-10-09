// Nodo "Armar revisión" — la segunda lectura, hecha por otro Claude con el mismo método.
//
// Es la "revisión doble" que Pato pide para todo entregable, pasada a máquina porque la lección sale sin
// que él la lea. Usa el MISMO system que la escritura y recibe lo que marcó el validador, las notas de
// investigación y la lista de lo publicado. La instrucción más importante es la última: no reescribir lo
// que ya está bien.
//
// La lista de lo publicado está porque sin ella, en la primera prueba (29/09), la revisión borró dos
// menciones a lecciones anteriores "porque no se pueden verificar": el escritor las tenía y ella no.

const CONFIG = /*@CONFIG*/null;

const esc = $('Armar escritura').first().json;
const v = $input.first().json; // "Validar (1)"

const marcas = [
  ...v.problemas.map((p) => `- problema: ${p}`),
  ...v.avisos.map((a) => `- aviso: ${a}`),
];

const partes = [
  'TAREA: revisar y dejar lista para publicar una lección que escribió otro redactor. Nadie más la va a leer antes de que llegue a los clientes.',
  '',
  'Lo que marcó el control automático (cada "problema" tiene que desaparecer; cada "aviso", corregilo si mejora la lección):',
  marcas.length ? marcas.join('\n') : '- nada',
  '',
  'Revisala además contra el método completo, en este orden:',
  '1. ¿El dueño de una distribuidora que no es de tecnología entiende cada frase? Si aparece una palabra técnica, ¿está explicada al lado?',
  '2. ¿Responde las seis preguntas de la columna vertebral, en orden?',
  '3. ¿La acción de la semana es chica, concreta y se hace en minutos?',
  '4. ¿Afirma algún paso, botón, menú o función de una herramienta que no esté respaldado por las notas de investigación? Si no hay notas o el dato no está, generalizalo.',
  '5. ¿Suena a una persona que enseña, o a folleto? Sacá el relleno y las promesas grandes.',
  '6. ¿Vende algo, aunque sea de costado? Sacalo.',
  '7. Rayas, signos de exclamación, vulgarismos, fechas, precios exactos, ejemplos de comercio de barrio.',
  '8. El registro de marca: lo coloquial de charla que la tabla de <registro_de_marca> reemplaza ("arranca", "andando", "no da abasto", "plata"...). Cambiá la palabra, no la frase entera.',
  '',
  'No cambies lo que ya está bien: una revisión que reescribe todo pierde la voz.',
];
if (esc.notas) partes.push('', 'Las notas de investigación que tuvo el redactor:', '<notas>', esc.notas, '</notas>');
if (Array.isArray(esc.publicados) && esc.publicados.length) {
  partes.push('', 'Las lecciones ya publicadas en el portal (si la lección menciona alguna por su nombre, es correcto: dejala):');
  esc.publicados.forEach((t) => partes.push(`- ${t}`));
}
partes.push(
  '',
  'La lección:',
  '<leccion>',
  JSON.stringify(v.doc, null, 2),
  '</leccion>',
  '',
  'Devolvé "aprobado" (true si la versión que devolvés cumple todas las reglas), "cambios" (una línea corta por cada cosa que cambiaste, vacío si no cambiaste nada) y "documento" (la versión final completa).',
);

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    aprobado: { type: 'boolean' },
    cambios: { type: 'array', items: { type: 'string' } },
    documento: esc.schema,
  },
  required: ['aprobado', 'cambios', 'documento'],
};

return [{
  json: {
    body: {
      model: CONFIG.modelo,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
      system: esc.body.system,
      messages: [{ role: 'user', content: partes.join('\n') }],
    },
  },
}];
