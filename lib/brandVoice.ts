// Registro de marca para el texto que Claude escribe SOLO y que el cliente lee sin
// que nadie lo revise antes: las oportunidades del Panel (lib/insights/generate.ts)
// y el aviso de cada lección (lib/notify/draft.ts).
//
// Es un resumen de dos listas que viven en la skill ideas-contenido
// (reference/voz-pato.md): "la lista negra" (lo vulgar) y "el registro de marca"
// (lo coloquial que, escrito con el logo de SK, baja el precio percibido; regla de
// Pato del 07/10/2026). Si cambia allá, se actualiza acá.

export const REGISTRO_MARCA =
  "REGISTRO DE MARCA (obligatorio): high ticket, profesional y cercano. Se mantienen el voseo y el tono cálido; " +
  "lo que cambia es el vocabulario de charla, que escrito baja el nivel. Reemplazos: " +
  "'cuánto sale' -> 'cuál es la inversión'; 'arranca' -> 'empieza'; 'lo armamos' -> 'lo construimos a medida'; " +
  "'arma' (el pedido, la respuesta, el borrador) -> 'prepara'; " +
  "'andando' -> 'funcionando'; 'no da abasto' -> 'está saturado'; 'desenchufar' -> 'desconectar'; " +
  "'pegado al celular' -> 'pendiente del celular'; 'lo de siempre' -> 'las consultas frecuentes'; " +
  "'plata', 'guita' -> 'ventas', 'facturación'; 'charla' -> 'conversación'; 'se traba' -> 'no pudo resolver'. " +
  "Prohibido: lunfardo y vulgarismos ('el tipo', 'loco', 'che', 'quilombo', 'al toque'), diminutivos sobre el " +
  "cliente o su negocio, anglicismos de marketing ('fee', 'off', 'engagement', 'lead'), exageraciones y la raya " +
  "larga (—): usá coma, punto o dos puntos. " +
  "Nunca escribas que el agente 'puede equivocarse' ni que algo 'puede pasar': si hay una falla, nombrá el dato " +
  "concreto y la acción para corregirla.";
