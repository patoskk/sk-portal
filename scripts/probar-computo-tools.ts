// Prueba de la lógica nueva de computeDaily: que los eventos de herramientas
// reportados por n8n se plieguen bien y no dupliquen lo que venga de la fuente.
// No toca la base ni la red.
//   npx tsx scripts/probar-computo-tools.ts
import { computeDaily } from "../lib/metrics/compute.ts";
import type { ToolEvent } from "../lib/metrics/types.ts";

let fallas = 0;
function esperar(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallas++;
  console.log(`  [${ok ? " ok  " : "FALLA"}] ${nombre}${ok ? "" : ` → esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`}`);
}

const fila = (id: number, tipo: string, contenido: string, toolCalls: { name: string; args: unknown }[] = []) => ({
  id,
  session_id: "chat:1",
  fecha: "2026-08-20T15:00:00Z", // 12:00 hora local (-3)
  message: JSON.stringify({ type: tipo, content: contenido, tool_calls: toolCalls }),
});

const evento = (tool: string, extra: Partial<ToolEvent> = {}): ToolEvent => ({
  ts: "2026-08-20T15:05:00Z",
  session_id: "chat:1",
  tool,
  query: null,
  outcome: "ok",
  ...extra,
});

console.log("\n== una conversación normal, con eventos de tools ==");
{
  const rows = [fila(1, "human", "tenés yerba?"), fila(2, "ai", "Sí, tenemos.")];
  const eventos = [
    evento("CONSULTAS", { query: "yerba" }),
    evento("CONSULTAS", { query: "aceite", outcome: "sin_resultado" }),
    evento("PEDIDOS"),
  ];
  const out = computeDaily(rows, -3, [], eventos);
  const d = out.metricsDaily[0];
  esperar("un solo día", out.metricsDaily.length, 1);
  esperar("conversaciones", d.conversations, 1);
  esperar("acciones del agente", d.tool_calls, 3);
  esperar("consultas sin resultado", d.no_result, 1);
  esperar("errores", d.errors, 0);
  esperar("conversión por tool de cierre", d.conversion_sessions, 1);
  esperar("lo más consultado", out.toolQueries.map((q) => q.query).sort(), ["aceite", "yerba"]);
  esperar("uso de herramientas", out.toolUsage.map((t) => `${t.tool}:${t.count}`).sort(), ["CONSULTAS:2", "PEDIDOS:1"]);
  esperar("el día salió de filas, no solo de eventos", out.daysFromEventsOnly, []);
}

console.log("\n== la consulta de una tool de CIERRE no entra en 'lo más consultado' ==");
{
  // el detalle del pedido lleva nombre y productos: no puede volverse una métrica
  const out = computeDaily([fila(1, "human", "hola")], -3, [], [evento("PEDIDOS", { query: "Juan Perez - 2 kg de asado" })]);
  esperar("sin consultas registradas", out.toolQueries.length, 0);
}

console.log("\n== precedencia: si hay eventos, no se cuentan las tool_calls de la fuente ==");
{
  const rows = [
    fila(1, "human", "tenés yerba?"),
    fila(2, "ai", "Sí.", [{ name: "CONSULTAS", args: { query: "yerba" } }]),
  ];
  const soloFilas = computeDaily(rows, -3, []);
  esperar("sin eventos, cuenta la de la fuente", soloFilas.metricsDaily[0].tool_calls, 1);

  const conEventos = computeDaily(rows, -3, [], [evento("CONSULTAS", { query: "yerba" })]);
  esperar("con eventos, no suma dos veces", conEventos.metricsDaily[0].tool_calls, 1);
  esperar("una sola consulta registrada", conEventos.toolQueries.length, 1);
}

console.log("\n== día que existe SOLO por eventos (vaciaron la tabla de memoria) ==");
{
  const out = computeDaily([], -3, [], [evento("CONSULTAS", { query: "yerba" })]);
  esperar("marca el día como solo-tools", out.daysFromEventsOnly, ["2026-08-20"]);
  esperar("registra la acción igual", out.metricsDaily[0].tool_calls, 1);
  esperar("no inventa conversaciones", out.metricsDaily[0].conversations, 0);
}

console.log("\n== un dato personal que se escape igual se filtra ==");
{
  const out = computeDaily([], -3, [], [evento("CONSULTAS", { query: "escribime al 11 5555 4444" })]);
  esperar("no entra como consulta", out.toolQueries.length, 0);
}

console.log(`\n${fallas} falla(s).`);
if (fallas) process.exit(1);
