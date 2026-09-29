// Nodos "Archivo" y "Archivo (rechazo)" — el HTML de la lección como adjunto para Telegram.
//
// Se arma acá, justo antes de mandarlo, a partir del texto que dejó "Render". Un binario no sobrevive
// tres nodos HTTP y una espera de horas (el "Esperar hasta las 9"): el texto en el JSON de Render, sí.

const r = $('Render').first().json;

return [{
  json: { chat_id: $input.first().json.chat_id || null, archivo: r.archivo },
  binary: {
    data: {
      data: Buffer.from(r.html, 'utf8').toString('base64'),
      mimeType: 'text/html',
      fileName: r.archivo,
    },
  },
}];
