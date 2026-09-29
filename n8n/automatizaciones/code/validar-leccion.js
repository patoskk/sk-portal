// Nodos "Validar (1)" y "Validar (2)" — el control automático de una lección. 0 tokens.
//
// Es el último filtro antes de que la lección llegue a los clientes sin que nadie la lea (decisión de
// Pato, 28/09). Dos niveles:
//   problemas -> la lección NO se publica.
//   avisos    -> se publica igual, pero la revisión los recibe para corregirlos.
//
// CALIBRADO contra las 12 lecciones publicadas hasta el 25/09 (fixtures/lecciones-publicadas.json):
// todas pasan salvo "Qué NO conviene darle a la IA", que dice "sin volverte loco" y es de julio, anterior a
// la regla de vulgarismos del 19/08. simular.mjs lo verifica en cada cambio: un validador que rechaza
// lecciones buenas está mal hecho. Los números salen de medirlas: 495 a 1430 palabras, el párrafo más largo
// de 94, ningún "!", ninguna fecha, entre 3 y 8 rayas cada una (por eso las rayas son aviso y no problema).
//
// Las reglas son las mismas que armar-escritura.js le pide al escritor: si se cambia una, se cambian las dos.

const ICONOS = /*@ICONOS*/null;

const entrada = $input.first().json || {};
const doc = entrada.doc || {};
const problemas = [];
const avisos = [];

// ── Forma ────────────────────────────────────────────────────────────────────────────────────────────
const TIPOS = {
  seccion: (b) => typeof b.titulo === 'string' && Array.isArray(b.parrafos) && b.parrafos.length > 0,
  pasos: (b) => typeof b.titulo === 'string' && Array.isArray(b.pasos) && b.pasos.length > 0 && b.pasos.every((p) => p && p.t),
  herramienta: (b) => b.nombre && b.que && b.como && b.para,
  tip: (b) => ['accion', 'aviso', 'dato'].includes(b.estilo) && b.texto,
  comparacion: (b) => b.antes && b.despues && Array.isArray(b.antes.items) && Array.isArray(b.despues.items),
  claves: (b) => typeof b.titulo === 'string' && Array.isArray(b.items) && b.items.length > 0,
  cita: (b) => typeof b.texto === 'string' && b.texto.length > 0,
};

if (!['deep-dive', 'digest'].includes(doc.modo)) problemas.push(`el modo "${doc.modo}" no existe`);
if (typeof doc.titulo !== 'string' || doc.titulo.length < 15 || doc.titulo.length > 110) problemas.push('el título falta o tiene un largo raro (15 a 110 caracteres)');
if (!doc.intro) problemas.push('falta la intro');
if (!/^\d{1,2} min de lectura$/.test(String(doc.lectura || ''))) problemas.push(`"lectura" tiene que decir "N min de lectura" (dice "${doc.lectura}")`);

const bloques = Array.isArray(doc.bloques) ? doc.bloques : [];
if (bloques.length < 5 || bloques.length > 16) problemas.push(`tiene ${bloques.length} bloques (van de 5 a 16)`);
bloques.forEach((b, i) => {
  const ok = TIPOS[b && b.tipo];
  if (!ok) problemas.push(`el bloque ${i + 1} tiene un tipo que la plantilla no dibuja: "${b && b.tipo}"`);
  else if (!ok(b)) problemas.push(`al bloque ${i + 1} (${b.tipo}) le faltan campos`);
  if (b && b.icono && !ICONOS.includes(b.icono)) problemas.push(`el bloque ${i + 1} usa el ícono "${b.icono}", que no existe`);
});
const acciones = bloques.filter((b) => b && b.tipo === 'tip' && b.estilo === 'accion').length;
if (acciones !== 1) problemas.push(`tiene que haber exactamente una acción para esta semana (hay ${acciones})`);
if (!bloques.some((b) => b && b.tipo === 'tip' && b.estilo === 'aviso')) avisos.push('no tiene el tip de "el error más común"');
if (!doc.cierre) avisos.push('no tiene cierre');

// ── Texto que lee el cliente ─────────────────────────────────────────────────────────────────────────
const T = [doc.titulo, doc.subtitulo, doc.intro];
const parrafos = [];
for (const b of bloques) {
  if (!b) continue;
  T.push(b.titulo, b.texto, b.nombre, b.precio, b.que, b.como, b.para, b.autor);
  (b.parrafos || []).forEach((p) => { T.push(p); parrafos.push(p); });
  (b.pasos || []).forEach((p) => T.push(p && p.t, p && p.d));
  (b.items || []).forEach((x) => T.push(x));
  for (const k of ['antes', 'despues']) if (b[k]) { T.push(b[k].titulo); (b[k].items || []).forEach((x) => T.push(x)); }
}
if (doc.cierre) T.push(doc.cierre.titulo, doc.cierre.texto);
const textos = T.filter((x) => typeof x === 'string');
const todo = textos.join('\n');
const palabras = (s) => s.split(/\s+/).filter(Boolean).length;
const cuenta = (re) => (todo.match(re) || []).length;

const total = palabras(todo);
if (total < 400 || total > 1800) problemas.push(`tiene ${total} palabras (van de 400 a 1800)`);
else if (total > 1500) avisos.push(`tiene ${total} palabras: es larga para leer en el celular`);

const parrafoMax = Math.max(0, ...parrafos.map(palabras));
if (parrafoMax > 110) problemas.push(`hay un párrafo de ${parrafoMax} palabras (máximo 110)`);
else if (parrafoMax > 80) avisos.push(`hay un párrafo de ${parrafoMax} palabras: partilo`);

const REGLAS = [
  [/\ben criollo\b/i, 'dice "en criollo" (va "en palabras simples")'],
  [/\b20[1-3]\d\b/, 'menciona un año: la lección tiene que ser atemporal'],
  [/\b\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i, 'tiene una fecha: la lección tiene que ser atemporal'],
  [/\bsemana del\b/i, 'dice "semana del": la lección tiene que ser atemporal'],
  [/\p{Extended_Pictographic}/u, 'tiene emojis'],
  [/\b(el|un|ese|este|aquel) tipo\b(?!\s+de\b)/i, 'dice "el tipo" o "un tipo" para hablar de una persona'],
  [/\b(loco|loca|locura|quilombo|despelote|boludo|boludez|boludeces|guita|chab[oó]n|pibe|flaco)\b/i, 'tiene un vulgarismo'],
  [/(^|[\s,.;:¿¡])che([\s,.;:!?]|$)/i, 'tiene un vulgarismo ("che")'],
  [/\b(almac[eé]n|almacenero|kiosco|despensa|verduler[ií]a)\b/i, 'usa un ejemplo de comercio de barrio (el lector es una distribuidora, una inmobiliaria, una tienda online...)'],
  [/(US?\$|USD|U\$S|€)\s?\d|\d\s?(d[oó]lares|usd)\b/i, 'tiene un precio exacto (los precios cambian: "gratis", "versión gratis" o "plan pago")'],
  [/(te lo (armamos|hacemos|implementamos|dejamos (andando|listo))|lo armamos (por vos|a tu medida|para vos)|(agend|reserv)[aá] (una|tu) (llamada|reuni[oó]n|demo)|ped[ií](nos)? (una|un) (presupuesto|cotizaci[oó]n)|contrat[aá](nos|lo con nosotros)|nuestros? (servicios?|planes|paquetes?)|precio especial para|aprovech[aá] (esta|la) (oferta|promo))/i, 'vende: ofrece servicios o propone una llamada, una demo o un presupuesto'],
  // (?!\p{L}) y no \b al final: \b no ve una vocal con tilde como letra, y "revolucioná" se escapaba.
  [/\b(revolucion[aá]|sinergia|ecosistema digital|duplic[aá] tus ventas)(?!\p{L})/iu, 'promete magia o usa relleno corporativo'],
];
for (const [re, msg] of REGLAS) if (re.test(todo)) problemas.push(msg);

const exclamaciones = cuenta(/!/g);
if (exclamaciones > 2) problemas.push(`tiene ${exclamaciones} signos de exclamación (máximo 2; las 12 publicadas no tienen ninguno)`);
else if (exclamaciones > 0) avisos.push(`tiene ${exclamaciones} signo(s) de exclamación: sacalos`);

const rayas = cuenta(/—/g);
if (rayas > 8) avisos.push(`tiene ${rayas} rayas (—): cambiá la mayoría por punto o coma`);

for (const b of bloques) {
  if (b && b.tipo === 'herramienta' && /\d/.test(String(b.precio || ''))) problemas.push(`la herramienta "${b.nombre}" tiene un precio con números`);
}

// En "Validar (2)" llega el veredicto de la revisión: si ella misma dice que no quedó bien, no sale.
if (entrada.aprobado === false) problemas.push('la revisión no la dio por buena');

return [{
  json: {
    ...entrada,
    ok: problemas.length === 0,
    problemas,
    avisos,
    stats: { palabras: total, parrafo_max: parrafoMax, rayas, exclamaciones, bloques: bloques.length },
  },
}];
