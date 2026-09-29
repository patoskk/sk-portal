// Nodo "Mensaje rechazo" — la lección no pasó el control y NO se publicó.
// Pato recibe el porqué y el HTML, por si quiere mirarla o pedir que se corrija en una sesión.

const CONFIG = /*@CONFIG*/null;

const { tema, prueba } = $('Tema').first().json;
const r = $input.first().json; // "Render"

const lineas = [
  (prueba ? '[PRUEBA] ' : '') + `No publiqué la lección de "${tema.titulo}" porque no pasó el control automático:`,
  ...r.problemas.map((p) => `- ${p}`),
];
if (r.cambios && r.cambios.length) {
  lineas.push('', 'La revisión ya había corregido:');
  r.cambios.slice(0, 6).forEach((c) => lineas.push(`- ${c}`));
}
lineas.push('', 'No salió ningún mail. Te adjunto cómo quedó, por si querés mirarla.', 'Para elegir otro tema, mandame /temas.');

return [{ json: { chat_id: CONFIG.pato_chat, texto: lineas.join('\n') } }];
