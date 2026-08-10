"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LESSON_MSG } from "@/lib/lessonEmbed";

/**
 * Muestra la lección sin que parezca embebida: el iframe crece hasta el alto
 * real del documento, así scrollea la página y no una cajita adentro.
 *
 * Sigue siendo iframe porque el documento trae su propio CSS y su propio JS
 * (ver lib/lessonEmbed.ts). El puente de alto y tema lo pone ese módulo.
 */
export function LessonFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  // arranca alto para que no se vea un salto al terminar de medir
  const [alto, setAlto] = useState(900);

  /** Manda el tema y, de paso, le pide el alto: todo mensaje del portal se
   *  contesta con el alto actual (ver lib/lessonEmbed.ts). */
  const pedirAlto = useCallback(() => {
    const tema = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    ref.current?.contentWindow?.postMessage({ tipo: `${LESSON_MSG}-tema`, tema }, "*");
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // el iframe corre en origen opaco, así que e.origin es "null": lo que
      // vale es que el mensaje venga de ESTA ventana y no de cualquier otra.
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const d = e.data as { tipo?: string; alto?: number } | null;
      if (d?.tipo === LESSON_MSG && typeof d.alto === "number" && d.alto > 0) setAlto(d.alto);
    }
    window.addEventListener("message", onMsg);
    // El iframe puede haber cargado antes de que este listener existiera y su
    // primer aviso se habría perdido. Se le vuelve a pedir apenas se engancha,
    // y una vez más por si el documento todavía se estaba dibujando.
    pedirAlto();
    const t = setTimeout(pedirAlto, 500);
    return () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(t);
    };
  }, [pedirAlto]);

  // el documento tiene que seguir el tema del portal, también si se cambia leyendo
  useEffect(() => {
    const obs = new MutationObserver(pedirAlto);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // al cambiar el ancho de la ventana el texto se re-acomoda y el alto cambia
    window.addEventListener("resize", pedirAlto);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", pedirAlto);
    };
  }, [pedirAlto]);

  return (
    <iframe
      ref={ref}
      className="reader-frame"
      title={title}
      srcDoc={html}
      // allow-scripts es obligatorio: el documento se dibuja solo desde window.DOC.
      // SIN allow-same-origin a propósito — con los dos juntos el iframe puede
      // sacarse el sandbox y llegar a las cookies de sesión. Así queda en un
      // origen opaco: corre su JS y no toca nada del portal.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      scrolling="no"
      loading="eager"
      style={{ height: alto }}
      onLoad={pedirAlto}
    />
  );
}
