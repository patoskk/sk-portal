// Nodo "Ruteo" del bot de Pato — qué quiso hacer y si hay que hacerle caso.
//
// LISTA BLANCA, y es a propósito: este bot publica lecciones y les manda mails a los clientes.
// Solo se le hace caso al chat de Pato. Cualquier otro mensaje sale como "ignorar" y no pasa nada.
//
// Los botones traen: lec:<tema> | lec-otros | lec-no | lec-nada   (con "lecp" en vez de "lec" = prueba)
// Los comandos:      /temas (ofrecer ahora) | /prueba (lo mismo, en modo prueba)

const CONFIG = /*@CONFIG*/null;
const TEMAS = /*@TEMAS*/null;

const u = $input.first().json;
const cb = u.callback_query || null;
const msg = cb ? cb.message : u.message;
const chatId = String(msg?.chat?.id ?? '');
const deQuien = String((cb ? cb.from?.id : msg?.from?.id) ?? '');

const base = {
  chat_id: chatId,
  message_id: msg?.message_id ?? null,
  callback_id: cb?.id ?? null,
  prueba: false,
};

if (chatId !== CONFIG.pato_chat || deQuien !== CONFIG.pato_chat) {
  return [{ json: { ...base, accion: 'ignorar' } }];
}

const PRUEBA = '[PRUEBA] ';

if (cb) {
  const data = String(cb.data || '');

  // Los temas que tenía el mensaje tocado, leídos de sus propios botones: "Otros 3" los excluye.
  const ofrecidos = ((msg?.reply_markup?.inline_keyboard) || [])
    .flat()
    .map((b) => String(b.callback_data || ''))
    .map((d) => (d.match(/^lecp?:(.+)$/) || [])[1])
    .filter(Boolean);

  let m;
  if ((m = data.match(/^lec(p?):(.+)$/))) {
    const prueba = m[1] === 'p';
    const tema = TEMAS.find((t) => t.id === m[2]);
    if (!tema) {
      return [{ json: { ...base, prueba, accion: 'vacio', aviso: 'Ese tema ya no está en el banco. Mandame /temas.' } }];
    }
    return [{ json: {
      ...base,
      prueba,
      accion: 'elegir',
      topic_id: tema.id,
      titulo: tema.titulo,
      aviso: 'Listo, la escribo.',
      texto_edicion: (prueba ? PRUEBA : '') +
        `Elegiste: ${tema.titulo}\n\nLa estoy escribiendo. Te aviso por acá cuando esté publicada y avisada; tarda unos minutos.`,
    } }];
  }
  if ((m = data.match(/^lec(p?)-otros$/))) {
    return [{ json: { ...base, prueba: m[1] === 'p', accion: 'otros', excluir: ofrecidos, aviso: 'Te muestro otros tres.' } }];
  }
  if ((m = data.match(/^lec(p?)-no$/))) {
    const prueba = m[1] === 'p';
    return [{ json: {
      ...base,
      prueba,
      accion: 'saltar',
      aviso: 'Listo.',
      texto_edicion: (prueba ? PRUEBA : '') + 'Listo: esta semana no hay lección. El lunes que viene te mando temas nuevos.',
    } }];
  }
  return [{ json: { ...base, accion: 'vacio', aviso: 'Ese botón no hace nada.' } }];
}

const texto = String(msg?.text || '').trim().toLowerCase();
if (texto.startsWith('/temas')) return [{ json: { ...base, accion: 'temas', prueba: false } }];
if (texto.startsWith('/prueba')) return [{ json: { ...base, accion: 'temas', prueba: true } }];

return [{ json: {
  ...base,
  accion: 'ayuda',
  texto:
    'Por acá te llegan los temas de la lección de los lunes. Tocá uno y yo me encargo del resto.\n\n' +
    '/temas: te mando temas ahora, por si querés publicar otro día.\n' +
    '/prueba: lo mismo, pero sin publicar nada para los clientes (la lección va al panel de demostración y el mail te llega solo a vos).',
} }];
