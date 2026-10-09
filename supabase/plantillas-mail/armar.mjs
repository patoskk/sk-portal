// armar.mjs — los mails de acceso del portal (Supabase Auth), con la marca y el registro de SK.
//
// POR QUÉ EXISTE. Estas plantillas vivían SOLO en el panel de Supabase (Authentication → Emails),
// pegadas a mano en julio, y quedaron con el teal viejo cuando la marca pasó a la paleta Noche. Lo que
// existe solo en un panel no se puede revisar ni actualizar junto con el resto: ahora la fuente es esta
// carpeta y el panel es una copia. Si cambia una plantilla, se cambia acá, se corre esto y se vuelve a pegar.
//
//   node supabase/plantillas-mail/armar.mjs
//     → un .html por plantilla, PEGAR-en-supabase.txt (asunto + HTML de cada una, en el orden del panel)
//       y vista-previa.html (las cinco con datos de ejemplo, para mirarlas antes de pegar).
//
// Diseño: el mismo de los avisos de lección (lib/notify/lessonEmail.ts): fondo blanco, una regla verde
// arriba, letra del sistema (Gmail no carga letras), firma con el nombre en texto. El botón es verde del
// logo con texto noche, la regla de la marca para un botón lleno. Colores de
// ~/.claude/skills/carruseles/assets/marca/marca.json (marca-check.mjs revisa este archivo).
//
// Los links van al /auth/confirm del portal con token_hash: así el enlace funciona aunque se abra en otro
// navegador que el que lo pidió (el formato por defecto de Supabase, con ?code, no).

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const C = {
  verde: "#4AB39F", // el del logo: la regla de arriba, el botón y "Optimal"
  verdeTexto: "#1E7565", // el link de respaldo (verde sobre blanco, legible)
  noche: "#0A1218", // texto y el texto del botón
  gris: "#5B6770", // texto secundario
  linea: "#E3E7EA",
  blanco: "#FFFFFF",
};
// El número vive en lib/contact.ts (TS, no se puede importar desde acá): se lee de ahí para no copiarlo.
const WHATSAPP = readFileSync(join(AQUI, "..", "..", "lib", "contact.ts"), "utf8").match(/CONTACT_WHATSAPP = "(\d+)"/)[1];
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const confirmar = (type, next) =>
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${encodeURIComponent(next)}`;

// En el orden en que aparecen en el panel de Supabase.
const PLANTILLAS = [
  {
    archivo: "confirmar-registro",
    panel: "Confirm signup",
    asunto: "Confirmá tu correo para entrar al portal de SK Optimal",
    previa: "Un paso más para entrar a tu portal.",
    parrafos: ["Para terminar de crear tu acceso al portal de SK Optimal, confirmá que este correo es tuyo."],
    boton: "Confirmar mi correo",
    link: confirmar("email", "/dashboard"),
    pie: "Si no pediste un acceso al portal, ignorá este mail: no se crea nada sin tu confirmación.",
  },
  {
    archivo: "invitacion",
    panel: "Invite user",
    asunto: "Tu acceso al portal de SK Optimal",
    previa: "Creá tu contraseña y entrá a ver cómo trabaja tu agente.",
    parrafos: [
      "Te damos la bienvenida al portal de SK Optimal. Ahí vas a ver cómo trabaja tu agente, las lecciones de IA que preparamos para vos y las novedades de cada semana.",
      "Para entrar, creá tu contraseña:",
    ],
    boton: "Crear mi contraseña",
    link: confirmar("invite", "/auth/update-password"),
    pie: "Si no esperabas esta invitación, ignorá este mail.",
  },
  {
    archivo: "enlace-magico",
    panel: "Magic Link",
    asunto: "Tu enlace para entrar al portal de SK Optimal",
    previa: "Entrá al portal con un clic, sin contraseña.",
    parrafos: ["Este es tu enlace para entrar al portal de SK Optimal sin escribir la contraseña."],
    boton: "Entrar al portal",
    link: confirmar("email", "/dashboard"),
    pie: "Si no lo pediste vos, ignorá este mail: nadie puede entrar sin este enlace.",
  },
  {
    archivo: "cambio-de-correo",
    panel: "Change Email Address",
    asunto: "Confirmá tu nuevo correo en el portal de SK Optimal",
    previa: "Confirmá el cambio de correo de tu acceso.",
    parrafos: [
      "Pediste cambiar el correo de tu acceso al portal de SK Optimal de {{ .Email }} a {{ .NewEmail }}.",
      "Para que el cambio quede hecho, confirmalo:",
    ],
    boton: "Confirmar el cambio",
    link: confirmar("email_change", "/configuracion"),
    pie: "Si no pediste este cambio, no confirmes y escribinos por WhatsApp: tu acceso sigue con el correo de siempre.",
  },
  {
    archivo: "recuperar-contrasena",
    panel: "Reset Password",
    asunto: "Tu enlace para crear una contraseña nueva",
    previa: "Creá una contraseña nueva para tu portal.",
    parrafos: ["Recibimos un pedido para cambiar la contraseña de tu acceso al portal de SK Optimal."],
    boton: "Crear contraseña nueva",
    link: confirmar("recovery", "/auth/update-password"),
    pie: "Si no lo pediste vos, ignorá este mail: tu contraseña sigue igual.",
  },
];

function html(t) {
  const p = `margin:0 0 14px;font-size:15px;line-height:1.62;color:${C.noche};`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${t.asunto}</title>
</head>
<body style="margin:0;padding:0;background:${C.blanco};">
<div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0;color:transparent;">${t.previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.blanco};">
  <tr>
    <td align="left" style="padding:22px 6px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:560px;font-family:${FONT};">

        <tr><td style="height:3px;background:${C.verde};line-height:3px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:24px 0 0;">
          <p style="margin:0 0 22px;font-size:17px;font-weight:800;">
            <span style="color:${C.noche};">SK</span> <span style="color:${C.verde};">Optimal</span>
          </p>

          <p style="${p}">Hola:</p>
${t.parrafos.map((x) => `          <p style="${p}">${x}</p>`).join("\n")}

          <!-- botón a prueba de clientes de correo: el color va en la celda, no solo en el link -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 24px;">
            <tr><td bgcolor="${C.verde}" style="background:${C.verde};border-radius:8px;">
              <a href="${t.link}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:700;color:${C.noche};text-decoration:none;border-radius:8px;">${t.boton}</a>
            </td></tr>
          </table>

          <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:${C.gris};">Por seguridad, el enlace sirve una sola vez y vence al rato. ${t.pie}</p>

          <p style="margin:0 0 6px;font-size:12.5px;line-height:1.6;color:${C.gris};">Si el botón no abre, copiá este enlace en el navegador:</p>
          <p style="margin:0 0 24px;font-size:12.5px;line-height:1.5;word-break:break-all;"><a href="${t.link}" style="color:${C.verdeTexto};">${t.link}</a></p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="padding:18px 0 0;border-top:1px solid ${C.linea};">
              <p style="margin:0;font-size:11.5px;line-height:1.6;color:${C.gris};">
                Mail automático del portal de clientes de SK Optimal: las respuestas a esta dirección no se leen.
                Si tenés una duda, <a href="https://wa.me/${WHATSAPP}" style="color:${C.verdeTexto};">escribinos por WhatsApp</a>.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const pegar = [
  "PLANTILLAS DE MAIL DEL PORTAL — para pegar en Supabase",
  "Proyecto central del portal → Authentication → Emails → (cada plantilla) → Subject + Message body (pestaña Source).",
  "Generado por supabase/plantillas-mail/armar.mjs: si hay que cambiar algo, se cambia ahí y se vuelve a generar.",
  "",
];
const previa = [];
for (const t of PLANTILLAS) {
  const h = html(t);
  writeFileSync(join(AQUI, `${t.archivo}.html`), h);
  pegar.push("=".repeat(100), `${t.panel}`, "=".repeat(100), "", "ASUNTO (Subject):", t.asunto, "", "CUERPO (Message body):", h);
  const ejemplo = h
    .replaceAll("{{ .SiteURL }}", "https://portal.skoptimal.com")
    .replaceAll("{{ .TokenHash }}", "pkce_ejemplo")
    .replaceAll("{{ .Email }}", "dueño@negocio.com")
    .replaceAll("{{ .NewEmail }}", "nuevo@negocio.com");
  previa.push(`<h2 style="font:600 14px system-ui;margin:28px 0 6px;color:#5B6770">${t.panel} — ${t.asunto}</h2>
<iframe style="width:100%;height:560px;border:1px solid #E3E7EA;border-radius:8px;background:#FFFFFF" srcdoc="${ejemplo.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>`);
}
writeFileSync(join(AQUI, "PEGAR-en-supabase.txt"), pegar.join("\n"));
writeFileSync(
  join(AQUI, "vista-previa.html"),
  `<!doctype html><meta charset="utf-8"><title>Mails del portal</title><body style="margin:0;padding:24px;max-width:760px;background:#F2F4F5">${previa.join("\n")}</body>`,
);
console.log(`✓ ${PLANTILLAS.length} plantillas → supabase/plantillas-mail/ (PEGAR-en-supabase.txt y vista-previa.html)`);
