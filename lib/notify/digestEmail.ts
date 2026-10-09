// Render del resumen de novedades, cada dos semanas ("lo que le fuimos haciendo a tu agente"). Función PURA,
// igual que lessonEmail.ts, y con sus MISMAS reglas de estética por la misma razón: tiene que parecer un
// mail que escribió Pato, no una campaña, para caer en la bandeja Principal. Sin imágenes, una columna a
// ancho completo, un solo link como texto, parte text/plain, sin tracking. Leé los comentarios de
// lessonEmail.ts antes de "embellecerlo".
//
// Sin Claude a propósito: cada novedad ya la aprobó Pato al publicarla, así que el mail solo las junta.
import { BRAND } from "@/lib/brand";
import type { UpdateKind } from "@/lib/updateKinds";

export interface DigestItem {
  kind: UpdateKind;
  title: string;
  body: string | null;
}

export interface DigestEmailInput {
  greetingName: string;
  items: DigestItem[];
  updatesUrl: string; // https://portal.skoptimal.com/novedades
  fromName: string;
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const GRUPOS: { kind: UpdateKind; titulo: string }[] = [
  { kind: "nuevo", titulo: "Lo nuevo" },
  { kind: "mejora", titulo: "Mejoras" },
  { kind: "arreglo", titulo: "Arreglos" },
];

/**
 * Minúscula y sin palabras de campaña: mismo criterio que defaultSubject() de lessonEmail.ts. Sin fecha ni
 * mes a propósito: el resumen junta todo lo publicado desde el anterior, que puede venir de más de dos semanas.
 */
export function digestSubject(): string {
  return "lo que le fuimos haciendo a tu agente";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderDigestEmail(i: DigestEmailInput): { html: string; text: string } {
  const p = `margin:0 0 14px;font-size:15px;line-height:1.62;color:${BRAND.ink};`;
  const n = i.items.length;
  const intro =
    n === 1
      ? "Te cuento el último cambio que hicimos en tu agente."
      : `Te cuento los ${n} cambios que hicimos en tu agente estas últimas semanas.`;
  const preheader = i.items[0]?.title ?? intro;

  const bloques = GRUPOS.map((g) => {
    const its = i.items.filter((x) => x.kind === g.kind);
    if (!its.length) return "";
    const filas = its
      .map(
        (x) => `
          <p style="margin:0 0 4px;font-size:15px;line-height:1.5;font-weight:700;color:${BRAND.ink};">${esc(x.title)}</p>
          ${(x.body ?? "")
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => `<p style="margin:0 0 6px;font-size:15px;line-height:1.58;color:${BRAND.ink};">${esc(l)}</p>`)
            .join("")}
          <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>`,
      )
      .join("");
    return `
          <p style="margin:22px 0 10px;font-size:13px;letter-spacing:.6px;text-transform:uppercase;font-weight:700;color:${BRAND.accentDark};">${g.titulo}</p>${filas}`;
  }).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(digestSubject())}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
  <tr>
    <td align="left" style="padding:22px 6px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:${FONT};">
        <tr><td style="height:3px;background:${BRAND.accent};line-height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 0 0;">

          <p style="${p}">Hola, ${esc(i.greetingName)}:</p>
          <p style="${p}">${esc(intro)}</p>
${bloques}
          <p style="margin:18px 0 22px;font-size:16px;line-height:1.5;">
            <a href="${esc(i.updatesUrl)}" style="color:${BRAND.accentDark};font-weight:700;text-decoration:underline;">Verlo en el portal &rarr;</a>
          </p>

          <p style="${p}">Si notás algo fuera de lugar o hay algo que te gustaría cambiar, respondeme este mail.</p>

          <p style="margin:24px 0 2px;font-size:15px;color:${BRAND.ink};">${esc(i.fromName)}</p>
          <p style="margin:0;font-size:14px;font-weight:800;">
            <span style="color:${BRAND.ink};">SK</span> <span style="color:${BRAND.accent};">Optimal</span>
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:22px 0 0;border-top:1px solid ${BRAND.line};">
              <p style="margin:12px 0 0;font-size:11.5px;line-height:1.6;color:${BRAND.inkSoft};">
                Te llega porque sos cliente de SK Optimal. Si no querés estos avisos, respondeme y te doy de baja.
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
    intro,
    ...GRUPOS.flatMap((g) => {
      const its = i.items.filter((x) => x.kind === g.kind);
      if (!its.length) return [];
      return ["", g.titulo.toUpperCase(), ...its.flatMap((x) => ["", x.title, ...(x.body ? [x.body] : [])])];
    }),
    "",
    `Verlo en el portal: ${i.updatesUrl}`,
    "",
    "Si notás algo fuera de lugar o hay algo que te gustaría cambiar, respondeme este mail.",
    "",
    i.fromName,
    "SK Optimal",
    "",
    "Te llega porque sos cliente de SK Optimal. Si no querés estos avisos, respondeme y te doy de baja.",
  ].join("\n");

  return { html, text };
}
