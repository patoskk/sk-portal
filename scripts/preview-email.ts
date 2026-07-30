// Render del mail de aviso con datos de ejemplo, para revisarlo sin mandar nada.
//   npx tsx scripts/preview-email.ts [salida.html]
// Usa el MISMO renderer que el envío real, así lo que se ve acá es lo que llega.
import { writeFileSync } from "node:fs";
import { renderLessonEmail, defaultSubject } from "../lib/notify/lessonEmail.ts";

const out = process.argv[2] || "preview-email.html";

const title = "Cómo revisar lo que tu agente no supo responder";
const { html, text } = renderLessonEmail({
  greetingName: "Fernando", // el DUEÑO, no el negocio
  title,
  intro: "Subí una lección nueva al portal.",
  summary:
    "Te muestro dónde ver las consultas que tu agente no pudo contestar y cómo convertirlas en ventas la semana siguiente.",
  why: [
    "Vas a poder revisar en 5 minutos qué te preguntaron y el agente no encontró.",
    "Cada consulta sin respuesta es un cliente que se fue a otro lado.",
    "Se arregla cargando los productos que faltan: 15 minutos por semana.",
  ],
  readMinutes: 6,
  lessonUrl: "https://portal.skoptimal.com/l/8f3c1a20-0000-0000-0000-000000000000",
  fromName: "Pato",
});

writeFileSync(out, html, "utf8");
console.log(`asunto: ${defaultSubject(title)}`);
console.log(`\n--- versión texto ---\n${text}`);
console.log(`\nHTML escrito en ${out}`);
