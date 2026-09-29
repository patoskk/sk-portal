// Nodo "Elegir temas" — qué 3 temas se le ofrecen a Pato y cómo se ve el mensaje.
// Lo usan dos workflows: "temas del lunes" (lunes, martes y la prueba) y el bot (/temas y "Otros 3").
//
// Entra:  $('Contexto')  -> { modo: 'lunes'|'martes'|'pedido'|'otros', prueba, excluir: [ids] }
//         $input         -> GET /api/automation/lessons -> { publicados: [{ source_topic, title, published_at }], semana }
// Sale:   el texto, los 5 botones (3 temas + "Otros 3" + "Esta semana no") y si hay que mandarlo.
//
// Nada de azar: con el mismo estado sale la misma elección. Así el martes se reenvía lo mismo que el
// lunes y una prueba se puede repetir.

const CONFIG = /*@CONFIG*/null;
const TEMAS = /*@TEMAS*/null;

const SERIES = ['herramienta', 'instructivo', 'consejo', 'lo-que-tienen', 'rubro'];
const NOMBRE_SERIE = {
  herramienta: 'tutorial de una herramienta',
  instructivo: 'instructivo',
  consejo: 'consejo',
  'lo-que-tienen': 'lo que ya tienen con nosotros',
  rubro: 'por rubro',
};

const ctx = $('Contexto').first().json;
const estado = $input.first().json || {};
const prueba = ctx.prueba === true;
const publicados = Array.isArray(estado.publicados) ? estado.publicados : [];
const semana = estado.semana || null;
const usados = new Set(publicados.map((p) => p.source_topic).filter(Boolean));
const disponibles = TEMAS.filter((t) => !usados.has(t.id));

// La serie de la última lección que salió del banco: la de esta semana arranca por otra.
const ultima = publicados
  .filter((p) => p.source_topic && TEMAS.some((t) => t.id === p.source_topic))
  .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
const ultimaSerie = ultima ? TEMAS.find((t) => t.id === ultima.source_topic).serie : null;

function elegir(excluir) {
  const pool = disponibles.filter((t) => !excluir.includes(t.id));
  const inicio = ultimaSerie ? (SERIES.indexOf(ultimaSerie) + 1) % SERIES.length : 0;
  const orden = SERIES.slice(inicio).concat(SERIES.slice(0, inicio));
  const out = [];
  for (const s of orden) {
    const t = pool.find((x) => x.serie === s && !out.includes(x));
    if (t) out.push(t);
    if (out.length === 3) break;
  }
  for (const t of pool) {
    if (out.length === 3) break;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function corto(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

let enviar = true;
let motivo = '';
let opciones = [];
let encabezado = 'Lección de esta semana';

if (ctx.modo === 'lunes' && semana && (semana.status === 'elegida' || semana.status === 'salteada')) {
  enviar = false;
  motivo = `esta semana ya está ${semana.status}`;
} else if (ctx.modo === 'martes') {
  if (!semana || semana.status !== 'ofrecida') {
    enviar = false;
    motivo = semana ? `esta semana ya está ${semana.status}` : 'el lunes no se ofreció nada';
  } else {
    const ofrecidos = Array.isArray(semana.offered) ? semana.offered : [];
    opciones = ofrecidos.map((id) => disponibles.find((t) => t.id === id)).filter(Boolean);
    if (!opciones.length) opciones = elegir([]);
    encabezado = 'Te quedó pendiente la lección de esta semana';
  }
} else if (ctx.modo === 'otros') {
  const excluir = Array.isArray(ctx.excluir) ? ctx.excluir : [];
  opciones = elegir(excluir);
  if (!opciones.length) opciones = elegir([]); // se terminó la vuelta: vuelve a empezar
  encabezado = 'Otros tres temas';
} else {
  opciones = elegir([]);
}

if (enviar && !opciones.length) {
  // El banco se vació: el mensaje lo dice en vez de llegar con botones vacíos.
  enviar = true;
  motivo = 'banco vacío';
}

const quedan = disponibles.length;
const bajo = quedan <= CONFIG.temas_bajo_umbral;
const p = prueba ? 'lecp' : 'lec';

const lineas = [];
if (prueba) {
  lineas.push('[PRUEBA] Esto no publica nada para los clientes: la lección va al panel de demostración y el mail te llega solo a vos.', '');
}
if (!opciones.length) {
  lineas.push('No quedan temas en el banco. En la próxima sesión con Claude pedile una tanda nueva.');
} else {
  lineas.push(encabezado, '', 'Elegí un tema y del resto me encargo yo: la escribo, la publico en el portal y les aviso a los clientes por mail.');
  opciones.forEach((t, i) => {
    lineas.push('', `${i + 1}. ${t.titulo}`, t.gancho, `(${NOMBRE_SERIE[t.serie] || t.serie})`);
  });
  if (bajo) lineas.push('', `Quedan ${quedan} temas en el banco. En la próxima sesión con Claude pedile una tanda nueva.`);
}

const boton = (i) => {
  const t = opciones[i];
  return t ? { text: corto(`${i + 1} · ${t.titulo}`, 40), data: `${p}:${t.id}` } : { text: '—', data: 'lec-nada' };
};
const b = [boton(0), boton(1), boton(2)];

return [{
  json: {
    enviar,
    motivo,
    modo: ctx.modo,
    prueba,
    chat_id: CONFIG.pato_chat,
    texto: lineas.join('\n'),
    b1_text: b[0].text, b1_data: b[0].data,
    b2_text: b[1].text, b2_data: b[1].data,
    b3_text: b[2].text, b3_data: b[2].data,
    otros_data: `${p}-otros`,
    no_data: `${p}-no`,
    offered: opciones.map((t) => t.id),
    quedan,
    bajo,
  },
}];
