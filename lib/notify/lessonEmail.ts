// Render del mail "hay una lección nueva". Función PURA (sin I/O) para que el
// preview del panel de admin y el envío real usen exactamente el mismo código.
//
// Estética decidida: "personal con acento de marca". El mail tiene que parecer
// uno que escribe Pato, no una campaña — Gmail manda a Promociones lo que huele
// a newsletter. Reglas duras (ver email-ventas/reference/deliverability.md):
//   · sin imágenes (ni logo, ni banner, ni pixel de tracking)
//   · una columna, max-width 560px, tablas role="presentation" + CSS inline
//   · system fonts, sin webfonts
//   · UN solo link, como texto (no botón grande)
//   · parte text/plain en paralelo
//   · preheader oculto (lo que Gmail muestra al lado del asunto)
import { BRAND } from "@/lib/brand";

export interface LessonEmailInput {
  /** con quién saludamos: el nombre del DUEÑO ("Fernando"), no el del negocio */
  greetingName: string;
  title: string;
  intro: string; // el aviso, una frase
  summary: string; // de qué va (1-2 frases)
  why: string[]; // 2-3 bullets concretos
  readMinutes: number | null;
  lessonUrl: string; // https://portal.skoptimal.com/l/<id>
  fromName: string; // "Pato"
}

export interface LessonEmail {
  html: string;
  text: string;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Asunto por default (fallback si Claude no redactó): minúscula, sin palabras de
 * promoción. La minúscula inicial es deliberada — un asunto en mayúsculas
 * "de campaña" es una de las señales que manda el mail a Promociones.
 */
export function defaultSubject(title: string): string {
  const t = title.charAt(0).toLowerCase() + title.slice(1);
  const s = `nueva lección: ${t}`;
  return s.length <= 78 ? s : s.slice(0, 75).trimEnd() + "…";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderLessonEmail(i: LessonEmailInput): LessonEmail {
  const why = i.why.map((w) => w.trim()).filter(Boolean);
  const lectura = i.readMinutes ? `${i.readMinutes} min de lectura` : null;
  // El preheader es la segunda cosa que se lee en la lista de Gmail: va el
  // primer "por qué", que es el argumento más fuerte que tenemos.
  const preheader = why[0] ?? i.summary ?? i.intro;

  const p = `margin:0 0 14px;font-size:15px;line-height:1.62;color:${BRAND.ink};`;

  const bullets = why
    .map(
      (w) => `
              <tr>
                <td style="padding:0 0 7px;font-size:15px;line-height:1.55;color:${BRAND.ink};vertical-align:top;">
                  <span style="color:${BRAND.accent};font-weight:700;">·</span>&nbsp;${esc(w)}
                </td>
              </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(i.title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr>
    <td align="left" style="padding:26px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;font-family:${FONT};">

        <!-- acento de marca: una regla fina, nada de header de newsletter -->
        <tr><td style="height:3px;background:${BRAND.accent};line-height:3px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:24px 0 0;">

          <p style="${p}">Hola, ${esc(i.greetingName)}:</p>
          <p style="${p}">${esc(i.intro)}</p>

          <!-- el título, destacado en tinta -->
          <p style="margin:22px 0 4px;font-size:19px;line-height:1.35;font-weight:700;color:${BRAND.ink};">${esc(i.title)}</p>
          ${
            lectura
              ? `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.inkSoft};">${lectura}</p>`
              : `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
          }

          <p style="${p}">${esc(i.summary)}</p>

          ${
            bullets
              ? `<p style="margin:22px 0 9px;font-size:14px;font-weight:700;color:${BRAND.ink};">Por qué te conviene verla</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${bullets}
          </table>`
              : ""
          }

          <!-- UN solo link, como texto. Nada de botón. -->
          <p style="margin:26px 0 22px;font-size:16px;line-height:1.5;">
            <a href="${esc(i.lessonUrl)}" style="color:${BRAND.accentDark};font-weight:700;text-decoration:underline;">Leer la lección &rarr;</a>
          </p>

          <p style="${p}">Si querés que lo veamos juntos, respondeme este mail.</p>

          <!-- firma de persona + wordmark de texto (no imagen) -->
          <p style="margin:24px 0 2px;font-size:15px;color:${BRAND.ink};">${esc(i.fromName)}</p>
          <p style="margin:0;font-size:12px;letter-spacing:1.2px;font-weight:700;">
            <span style="color:${BRAND.ink};">SK</span> <span style="color:${BRAND.accent};">OPTIMAL</span>
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:22px 0 0;border-top:1px solid ${BRAND.line};">
              <p style="margin:12px 0 0;font-size:11.5px;line-height:1.6;color:${BRAND.inkSoft};">
                Te llega porque sos cliente de SK Optimal. Si no querés estos avisos, respondeme y te saco.
              </p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    `Hola, ${i.greetingName}:`,
    "",
    i.intro,
    "",
    i.title,
    lectura ?? "",
    "",
    i.summary,
    "",
    why.length ? "Por qué te conviene verla" : "",
    ...why.map((w) => `- ${w}`),
    "",
    `Leer la lección: ${i.lessonUrl}`,
    "",
    "Si querés que lo veamos juntos, respondeme este mail.",
    "",
    i.fromName,
    "SK Optimal",
    "",
    "Te llega porque sos cliente de SK Optimal. Si no querés estos avisos, respondeme y te saco.",
  ]
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");

  return { html, text };
}
