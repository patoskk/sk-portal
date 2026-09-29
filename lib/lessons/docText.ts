// Leer el contenido de una lección de nutricion-ia desde su HTML.
//
// Esas lecciones no tienen el texto en el HTML: la plantilla lo DIBUJA en el navegador a partir de
// `window.DOC = {...}`, que vive adentro de un <script>. Todo lo que limpia el HTML sacando los scripts
// (como hacía lessonToText) se queda con el encabezado y el pie, y nada más. Por eso el borrador del mail
// que redactaba Claude salía solo del título: lo corregía Pato a mano en /admin y no se notaba. En la
// lección automática nadie lo corrige, así que acá se lee el documento de verdad.
//
// Mismo patrón con el que se extrajeron las 12 lecciones publicadas (n8n/automatizaciones/fixtures).

interface Bloque {
  tipo?: string;
  titulo?: string;
  texto?: string;
  parrafos?: string[];
  pasos?: { t?: string; d?: string }[];
  items?: string[];
  nombre?: string;
  que?: string;
  como?: string;
  para?: string;
  antes?: { titulo?: string; items?: string[] };
  despues?: { titulo?: string; items?: string[] };
}

export interface LessonDoc {
  titulo?: string;
  subtitulo?: string;
  intro?: string;
  lectura?: string;
  bloques?: Bloque[];
  cierre?: { titulo?: string; texto?: string };
}

/** El `window.DOC` de una lección, o null si el HTML no lo tiene (PDF, link, HTML armado a mano). */
export function docFromHtml(body: string | null): LessonDoc | null {
  if (!body) return null;
  const m = body.match(/window\.DOC\s*=\s*([\s\S]*?)\s*;\s*\n\s*function esc/);
  if (!m) return null;
  try {
    const d = JSON.parse(m[1]) as LessonDoc;
    return d && Array.isArray(d.bloques) ? d : null;
  } catch {
    return null;
  }
}

const sinMarcas = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

/** El documento como texto plano, en el orden en que lo lee el cliente. */
export function docToText(d: LessonDoc): string {
  const out: string[] = [];
  const add = (s?: string) => {
    if (s && s.trim()) out.push(sinMarcas(s.trim()));
  };
  add(d.titulo);
  add(d.subtitulo);
  add(d.intro);
  for (const b of d.bloques ?? []) {
    add(b.titulo);
    add(b.nombre);
    b.parrafos?.forEach(add);
    b.pasos?.forEach((p) => add([p.t, p.d].filter(Boolean).join(": ")));
    add(b.que);
    add(b.como);
    add(b.para);
    add(b.texto);
    b.items?.forEach((i) => add(`- ${i}`));
    for (const k of ["antes", "despues"] as const) {
      const c = b[k];
      if (c) {
        add(c.titulo);
        c.items?.forEach((i) => add(`- ${i}`));
      }
    }
  }
  add(d.cierre?.texto);
  return out.join("\n");
}
