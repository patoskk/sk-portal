// Nodo "Leer investigación" — se queda con las notas. Si la búsqueda no terminó, el escritor lo sabe.

const r = $input.first().json || {};
const notas = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

let advertencia = '';
if (r.stop_reason === 'pause_turn') {
  advertencia = 'La búsqueda quedó a mitad de camino: tratá como SIN CONFIRMAR todo lo que no esté en estas notas.';
} else if (r.stop_reason === 'refusal' || !notas) {
  advertencia = 'No hay notas de investigación: no afirmes pasos, botones ni planes concretos de ninguna herramienta; describilos en general.';
}

return [{
  json: {
    notas,
    advertencia,
    stop_reason: r.stop_reason || null,
    busquedas: r.usage?.server_tool_use?.web_search_requests ?? 0,
    usage: r.usage || null,
  },
}];
