// Prepara el HTML de una lección para que se lea COMO PARTE del portal en vez
// de como un recuadro embebido.
//
// El documento (lo genera la skill nutricion-ia) es una página completa: trae su
// propio header con el logo SK, su propio pie, una tarjeta blanca con borde y una
// columna de 760px. Metido tal cual en un iframe quedaba marco adentro de marco,
// logo repetido, columna angosta y scroll adentro del scroll.
//
// En vez de reescribir el documento, se le INYECTA al final del <head> una hoja
// que apaga su cromo, y antes de </body> un script chico que (1) le avisa al
// portal cuánto mide para que el iframe crezca —así hay un solo scroll— y (2)
// escucha el tema para seguirlo.
//
// Por qué sigue siendo un iframe: el documento trae su propio CSS y su propio JS
// (se dibuja solo desde `window.DOC`). Inyectarlo con dangerouslySetInnerHTML le
// dejaría pisar los estilos del portal.

/** El documento avisa su alto con este marcador; el portal ignora todo lo demás. */
export const LESSON_MSG = "sk-lesson";

// Los `!important` son a propósito: la hoja del documento ya está en el <head>
// y algunas de sus reglas son igual de específicas.
const EMBED_CSS = `
/* el portal ya pone la marca arriba y el pie abajo */
.top, .foot { display: none !important; }
html, body { background: transparent !important; }
/* el ancho de lectura lo decide el portal, no el documento */
.doc { max-width: none !important; margin: 0 !important; padding: 0 !important; }
/* la tarjeta se disuelve: el fondo del portal ya es la superficie */
.card {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
/* sin scroll interno: el alto lo fija el portal con el que le reportamos */
html { overflow: hidden !important; }
/* la animación de entrada deja bloques invisibles si el iframe arranca oculto */
.block, .tip, .compare, .quote, .cierre { opacity: 1 !important; transform: none !important; }

/* ---------- tema oscuro ----------
   El documento usa los MISMOS nombres de variables que el portal, así que
   remapearlas alcanza para casi todo. Lo que sigue abajo son los colores que
   trae fijos (no salen de una variable) y que en oscuro quedaban ilegibles. */
:root[data-sk-theme="dark"] {
  --paper: #172420; --accent: #46B49C; --accent-dark: #6FCBB6; --accent-soft: #2C7C6C;
  --tint: #1A2A25; --ink: #E9F1ED; --ink-soft: #9FB2AC; --line: #26332E;
  --warn: #CC7E71; --warn-tint: #2A1E1B;
}
:root[data-sk-theme="dark"] .lead,
:root[data-sk-theme="dark"] .tip p,
:root[data-sk-theme="dark"] .compare li,
:root[data-sk-theme="dark"] .keys li { color: var(--ink) !important; }
:root[data-sk-theme="dark"] .tip,
:root[data-sk-theme="dark"] .compare__card { background: rgba(255,255,255,.04) !important; }
:root[data-sk-theme="dark"] .tip--dato,
:root[data-sk-theme="dark"] .compare__card.is-after { background: var(--tint) !important; }
/* el número del paso: sobre el teal claro del modo oscuro, el blanco no se lee */
:root[data-sk-theme="dark"] .steps li::before { color: #0F1715 !important; }
/* .cierre se pinta con background:var(--ink) — en oscuro eso es CLARO y su
   texto (#EAF3EF) desaparecía. Se fija en tinta profunda. */
:root[data-sk-theme="dark"] .cierre { background: #0B1210 !important; }
`;

// postMessage con targetOrigin "*" porque el iframe corre en un origen opaco
// (sandbox sin allow-same-origin) y no puede saber el del portal. Lo único que
// viaja es un número de alto; del otro lado se valida que venga de ESTE iframe.
//
// OJO con la carrera: el iframe puede terminar de cargar ANTES de que el portal
// enganche su listener de "message". Por eso el portal PIDE el alto ("-pedido")
// y ese pedido siempre se contesta, aunque el alto no haya cambiado. Deduplicar
// sin esa salida dejaba el iframe clavado en su alto inicial para siempre.
const EMBED_JS = `
(function () {
  var ultimo = 0;
  function alto() {
    var d = document.documentElement, b = document.body;
    return Math.ceil(Math.max(d.scrollHeight, b ? b.scrollHeight : 0, d.offsetHeight));
  }
  function avisar(forzar) {
    var h = alto();
    if (!h) return;
    if (!forzar && Math.abs(h - ultimo) <= 1) return;
    ultimo = h;
    parent.postMessage({ tipo: "${LESSON_MSG}", alto: h }, "*");
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || typeof d.tipo !== "string" || d.tipo.indexOf("${LESSON_MSG}-") !== 0) return;
    if (d.tipo === "${LESSON_MSG}-tema") {
      document.documentElement.dataset.skTheme = d.tema === "dark" ? "dark" : "light";
    }
    // cualquier mensaje del portal vale como pedido de alto
    requestAnimationFrame(function () { avisar(true); });
  });
  window.addEventListener("load", function () { avisar(true); });
  window.addEventListener("resize", function () { avisar(true); });
  if (window.ResizeObserver) new ResizeObserver(function () { avisar(false); }).observe(document.documentElement);
  // el documento se dibuja solo desde window.DOC: puede terminar después de este script
  setTimeout(function () { avisar(true); }, 0);
  setTimeout(function () { avisar(true); }, 400);
  avisar(true);
})();
`;

/**
 * Devuelve el HTML de la lección con el cromo del documento apagado y el puente
 * de alto/tema puesto. Si el HTML no tuviera `</head>` o `</body>` (formato
 * viejo), igual se inyecta al final: es peor una lección sin estilos que una
 * con las etiquetas fuera de lugar.
 */
export function embedLesson(html: string): string {
  const style = `<style id="sk-portal-embed">${EMBED_CSS}</style>`;
  const script = `<script id="sk-portal-bridge">${EMBED_JS}</script>`;

  const conEstilo = html.includes("</head>")
    ? html.replace("</head>", `${style}</head>`)
    : style + html;

  return conEstilo.includes("</body>")
    ? conEstilo.replace("</body>", `${script}</body>`)
    : conEstilo + script;
}
