// Cliente de DEMOSTRACIÓN: datos sintéticos para capturas, deck y contenido de redes.
// Existe para no tener que mostrar nunca el panel de un cliente real.
//   npx tsx scripts/seed-demo.ts [password-del-usuario-demo]
//
// Idempotente: los números salen de un generador con semilla fija, así que
// correrlo dos veces deja exactamente las mismas filas (upsert, no duplica).
// NO toca ningún otro cliente: todo va filtrado por DEMO_ID.
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient } from "@supabase/supabase-js";

const DEMO_ID = "00000000-0000-4000-8000-0000000000d0"; // uuid fijo y reconocible
const DEMO_EMAIL = "demo@skoptimal.test";
const DEMO_PASSWORD = process.argv[2] || "Demo-SKOptimal-2026!";
const DIAS = 70; // 30 visibles por defecto + la ventana anterior de los deltas
const UTC_OFFSET = -3;

// ---------- generador con semilla (mulberry32): mismos números siempre ----------
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260821);
const entre = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

function isoDaysAgo(n: number): string {
  const local = new Date(Date.now() + UTC_OFFSET * 3600 * 1000);
  local.setUTCDate(local.getUTCDate() - n);
  return local.toISOString().slice(0, 10);
}

// Curva de un almacén: pico fuerte a las 18 y un repunte a media mañana.
const PESO_HORA = [0, 0, 0, 0, 0, 1, 2, 4, 9, 15, 21, 25, 20, 13, 11, 12, 17, 23, 31, 26, 17, 9, 4, 1];
const PRODUCTOS = [
  "Yerba", "Aceite de girasol", "Harina 000", "Gaseosa 2,25 L", "Fideos", "Arroz",
  "Azúcar", "Leche", "Café", "Papel higiénico", "Detergente", "Galletitas",
];
const TOOLS: [string, number][] = [["STOCK", 0.53], ["PEDIDOS", 0.24], ["GET_PROMOS", 0.15], ["IMAGENES", 0.08]];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // 1. El cliente. Sin fila en client_sources a propósito: no tiene fuente real,
  //    y así se distingue de un cliente de verdad de un vistazo.
  const c = await admin
    .from("clients")
    .upsert({
      id: DEMO_ID,
      name: "Panel de demostración",
      rubro: "almacén",
      utc_offset: UTC_OFFSET,
      conversion_label: "Pedidos",
    })
    .select();
  if (c.error) throw c.error;
  console.log("OK cliente:", c.data?.[0]?.name);

  // 2. Métricas diarias. Los fines de semana bajan; hay una tendencia suave a más.
  const metrics: Record<string, unknown>[] = [];
  const horas: Record<string, unknown>[] = [];
  const consultas: Record<string, unknown>[] = [];
  const usos: Record<string, unknown>[] = [];
  const intents: Record<string, unknown>[] = [];

  for (let i = DIAS - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    const dow = new Date(date + "T12:00:00Z").getUTCDay();
    const finde = dow === 0 ? 0.35 : dow === 6 ? 0.7 : 1;
    const tendencia = 1 + (DIAS - i) / (DIAS * 6); // ~17% de crecimiento punta a punta

    const conversations = Math.max(1, Math.round(entre(11, 17) * finde * tendencia));
    const messagesHuman = Math.round(conversations * (4.2 + rand() * 0.5));
    const messagesAgent = Math.round(conversations * (2.0 + rand() * 0.4));
    const toolCalls = Math.round(conversations * (2.2 + rand() * 0.4));
    const orders = Math.round(conversations * (0.28 + rand() * 0.07));
    const noResult = rand() < 0.72 ? entre(0, 2) : 0;
    // El panel demo va SIN errores a propósito: es la vidriera del producto y
    // lo que tiene que mostrar es que el agente no falla. Lo que sí queda a la
    // vista son las consultas sin resultado, que no son una falla del agente
    // sino productos que el negocio no tiene cargados.
    rand(); // se consume igual, para no correr la serie y que el resto de los números no cambie
    const errors = 0;
    const toolResults = Math.round(toolCalls * 0.9);

    metrics.push({
      client_id: DEMO_ID,
      date,
      conversations,
      messages_human: messagesHuman,
      messages_agent: messagesAgent,
      messages_total: messagesHuman + messagesAgent + toolResults,
      tool_calls: toolCalls,
      tool_results: toolResults,
      orders,
      order_sessions: orders,
      conversions: orders,
      conversion_sessions: orders,
      stock_queries: Math.round(toolCalls * 0.53),
      stock_sessions: Math.round(conversations * 0.6),
      no_result: noResult,
      errors,
      images_sent: Math.round(toolCalls * 0.08),
      response_sum_sec: conversations * entre(6, 11),
      response_count: conversations,
    });

    // horas: reparte los mensajes del día según la curva
    const total = messagesHuman + messagesAgent;
    const suma = PESO_HORA.reduce((s, p) => s + p, 0);
    for (let h = 0; h < 24; h++) {
      const count = Math.round((PESO_HORA[h] / suma) * total);
      if (count > 0) horas.push({ client_id: DEMO_ID, date, hour: h, count });
    }

    // lo más consultado: los primeros productos pesan más
    PRODUCTOS.forEach((product, idx) => {
      const base = Math.max(0, Math.round((conversations * 0.42) / (idx + 1.35)));
      const count = base + (rand() < 0.3 ? 1 : 0);
      if (count > 0) consultas.push({ client_id: DEMO_ID, date, query: product, count });
    });

    for (const [tool, peso] of TOOLS) {
      const count = Math.round(toolCalls * peso);
      if (count > 0) usos.push({ client_id: DEMO_ID, date, tool, count });
    }

    intents.push(
      { client_id: DEMO_ID, date, intent: "precio_stock", count: Math.round(conversations * 0.55) },
      { client_id: DEMO_ID, date, intent: "pedido", count: orders },
      { client_id: DEMO_ID, date, intent: "promociones", count: Math.round(conversations * 0.18) },
    );
  }

  const cargar = async (tabla: string, filas: Record<string, unknown>[]) => {
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await admin.from(tabla).upsert(filas.slice(i, i + 500));
      if (error) throw new Error(tabla + ": " + error.message);
    }
    console.log("OK " + tabla + ": " + filas.length + " filas");
  };
  await cargar("metrics_daily", metrics);
  await cargar("activity_hourly", horas);
  await cargar("tool_queries_daily", consultas);
  await cargar("tool_usage_daily", usos);
  await cargar("intent_daily", intents);

  // 3. Insight de la última semana, escrito a mano (el cron lo regenera si corre).
  const desde = isoDaysAgo(7);
  const hasta = isoDaysAgo(1);
  await admin.from("insights").delete().eq("client_id", DEMO_ID);
  const ins = await admin.from("insights").insert({
    client_id: DEMO_ID,
    period_start: desde,
    period_end: hasta,
    reviewed: true,
    opportunities: [
      {
        title: "Cargá los productos que te preguntan y no tenés en la lista",
        text: "Hubo consultas que se fueron sin respuesta porque el producto no figura en la planilla. Cargarlos lleva diez minutos y son ventas que hoy se pierden.",
      },
      {
        title: "Usá la franja de 18 a 21",
        text: "Es tu hora pico y concentra la mayor parte de los pedidos. Una promo enviada a esa hora rinde bastante más que a la mañana.",
      },
      {
        title: "Seguí las charlas que quedaron a mitad de camino",
        text: "Varias personas preguntaron precio y no cerraron. Un mensaje al día siguiente recupera cerca de una de cada cuatro.",
      },
    ],
    funnel_insight: "Tres de cada diez charlas terminan en pedido y la tendencia viene en alza.",
    products_insight: "La yerba encabeza el ranking cuatro semanas seguidas. Es el producto para poner en promo.",
    usage_insight: "Ocho de cada diez consultas son precio o stock: es lo que más tiempo le sacaba a tu equipo.",
    activity_insight: "La actividad crece todas las semanas y los sábados a la mañana ya mueven como un día hábil.",
    misses_insight: "Las consultas sin resultado son casi todas productos que no están cargados en la planilla.",
    proxima_etapa: "La semana que viene sumamos el aviso automático de reposición: cuando un producto vuelve a estar disponible, el agente le escribe a quien lo pidió.",
  });
  if (ins.error) throw ins.error;
  console.log("OK insight de " + desde + " a " + hasta);

  // 4. Usuario demo mapeado al cliente: sirve para capturar el panel COMO LO VE
  //    un cliente, sin el selector de admin ni tu mail en la barra lateral.
  const list = await admin.auth.admin.listUsers();
  let user = list.data.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) {
    const creado = await admin.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true });
    if (creado.error) throw creado.error;
    user = creado.data.user!;
    console.log("OK usuario demo creado: " + DEMO_EMAIL);
  } else {
    await admin.auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD });
    console.log("OK usuario demo ya existia, contrasena actualizada: " + DEMO_EMAIL);
  }
  const uc = await admin.from("user_clients").upsert({ user_id: user.id, client_id: DEMO_ID, role: "viewer" });
  if (uc.error) throw uc.error;

  // 5. Resumen de los 30 días visibles, para chequear que los números cierren.
  const ult30 = metrics.slice(-30);
  const t = (k: string) => ult30.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const conv = t("conversations");
  console.log("\n== 30 dias visibles ==");
  console.log("  Pedidos: " + t("orders") + " (" + Math.round((100 * t("orders")) / conv) + "% de las charlas)");
  console.log("  Conversaciones: " + conv);
  console.log("  Mensajes de clientes: " + t("messages_human"));
  console.log("  Acciones del agente: " + t("tool_calls"));
  console.log("  Mensajes por charla: " + Math.round((10 * (t("messages_human") + t("messages_agent"))) / conv) / 10);
  console.log("  Errores: " + t("errors") + " - Consultas sin resultado: " + t("no_result"));
  console.log("\nEntra con " + DEMO_EMAIL + " o elegi 'Panel de demostracion' en Ver como cliente.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
