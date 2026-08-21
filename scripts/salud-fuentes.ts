// ¿Están todos los portales leyendo bien? Un chequeo de las cuatro fuentes contra
// las métricas que salieron de ellas. Sale 1 si algo está en FALLA.
//   npx tsx scripts/salud-fuentes.ts
//
// Cada chequeo existe por un bug que ya pasó:
//   1. contrato   — kopfundpuls no tenía columna `fecha`: TODO en cero, sync en verde
//   2. huso       — el backfill quedó 3 h corrido: el horario pico mentía
//   3. frescura   — la fuente de CGG dejó de escribir y nadie se enteró por 15 días
//   4. cobertura  — vacían la tabla de memoria antes del cron y el día se pierde
//   5. tools      — la memoria no persiste tool calls: 6 métricas en cero desde julio
//   6. coherencia — números imposibles que delatan un cómputo mal enchufado
import { loadEnv } from "./loadEnv.ts";
loadEnv();
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSourceKey } from "../lib/metrics/runCompute.ts";
import { parseFechaLocal } from "../lib/metrics/parse.ts";

type Nivel = "OK" | "AVISO" | "FALLA";
interface Resultado {
  nivel: Nivel;
  chequeo: string;
  detalle: string;
}

const DIAS_FRESCURA = 4; // más que esto sin datos y hay algo que mirar
// Los prompts inyectan la hora local con distinta redacción según el cliente
// ("...en Argentina:", "...en Córdoba:"), así que el lugar se matchea suelto.
const RE_FECHA_EN_TEXTO =
  /Fecha y hora actual[^:]{0,40}:[^0-9]*(\d{2})\/(\d{2})\/(\d{4})[^0-9]{1,3}(\d{2}):(\d{2})/;

function dias(desde: string | number): number {
  const ms = typeof desde === "number" ? desde : Date.parse(desde);
  return Math.floor((Date.now() - ms) / 86400000);
}

async function chequearCliente(
  admin: SupabaseClient,
  c: { id: string; name: string; utc_offset: number },
  src: { supabase_url: string; table_name: string } | null,
): Promise<Resultado[]> {
  const r: Resultado[] = [];

  if (!src) {
    r.push({ nivel: "OK", chequeo: "fuente", detalle: "sin fuente (cliente demo): no aplica" });
    return r;
  }

  const key = resolveSourceKey(c.id);
  if (!key) {
    r.push({ nivel: "FALLA", chequeo: "credencial", detalle: "no hay key de lectura para la fuente" });
    return r;
  }
  const fuente = createClient(src.supabase_url, key, { auth: { persistSession: false } });

  // ---------- 1. contrato de la tabla ----------
  const muestra = await fuente.from(src.table_name).select("*").limit(200);
  if (muestra.error) {
    r.push({ nivel: "FALLA", chequeo: "contrato", detalle: `no se puede leer ${src.table_name}: ${muestra.error.message}` });
    return r;
  }
  const filas = muestra.data ?? [];
  if (!filas.length) {
    r.push({ nivel: "AVISO", chequeo: "contrato", detalle: `${src.table_name} está vacía: no se puede validar el esquema` });
  } else {
    const cols = new Set(Object.keys(filas[0]).map((k) => k.toLowerCase()));
    const faltan = ["fecha", "session_id", "message"].filter((n) => !cols.has(n));
    if (faltan.length) {
      r.push({
        nivel: "FALLA",
        chequeo: "contrato",
        detalle: `a ${src.table_name} le faltan columnas: ${faltan.join(", ")} → el panel va a dar todo en cero`,
      });
    } else {
      r.push({ nivel: "OK", chequeo: "contrato", detalle: "fecha, session_id y message presentes" });
    }
  }

  // ---------- 2. huso horario ----------
  // La `fecha` guardada tiene que coincidir con la hora que el propio prompt
  // escribió adentro del mensaje. Si no coincide, la columna está corrida.
  let comparadas = 0;
  let corridas = 0;
  let desvioTipico = 0;
  for (const f of filas) {
    const fecha = (f as Record<string, unknown>).fecha;
    if (!fecha) continue;
    const m = RE_FECHA_EN_TEXTO.exec(JSON.stringify((f as Record<string, unknown>).message ?? ""));
    if (!m) continue;
    const local = parseFechaLocal(String(fecha), c.utc_offset);
    if (!local) continue;
    // hora de pared local que tiene guardada la columna, contra la que dice el texto
    const guardadoLocal = local.ms + c.utc_offset * 3600000;
    const esperado = Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00Z`);
    const minutos = Math.round((guardadoLocal - esperado) / 60000);
    comparadas++;
    // Entre que el prompt arma el contexto y se escribe la fila pasa un minuto o
    // dos: eso es normal. Un desvío de 45 min para arriba es huso mal guardado.
    if (Math.abs(minutos) > 45) {
      corridas++;
      desvioTipico = Math.round(minutos / 60);
    }
  }
  if (!comparadas) {
    r.push({ nivel: "AVISO", chequeo: "huso", detalle: "ningún mensaje trae la fecha en el texto: no se pudo verificar" });
  } else if (corridas > comparadas / 2) {
    r.push({
      nivel: "FALLA",
      chequeo: "huso",
      detalle: `${corridas}/${comparadas} filas con la fecha corrida ~${desvioTipico} h → el horario pico miente`,
    });
  } else {
    r.push({ nivel: "OK", chequeo: "huso", detalle: `${comparadas - corridas}/${comparadas} filas coinciden con la hora del texto` });
  }

  // ---------- 3. frescura y 4. cobertura ----------
  const { data: md } = await admin
    .from("metrics_daily")
    .select("date,conversations,messages_human,conversions,conversion_sessions,tool_calls")
    .eq("client_id", c.id)
    .order("date", { ascending: false })
    .limit(120);
  const metricas = md ?? [];
  const ultimoDato = metricas[0]?.date ?? null;

  const { data: ultimaFila } = await fuente
    .from(src.table_name)
    .select("fecha")
    .order("fecha", { ascending: false })
    .limit(1);
  const ultimaFuente = (ultimaFila ?? [])[0]?.fecha as string | undefined;

  if (!ultimoDato) {
    r.push({ nivel: "FALLA", chequeo: "frescura", detalle: "el cliente no tiene una sola fila de métricas" });
  } else if (dias(ultimoDato) > DIAS_FRESCURA) {
    r.push({ nivel: "AVISO", chequeo: "frescura", detalle: `último día con métricas: ${ultimoDato} (${dias(ultimoDato)} días)` });
  } else {
    r.push({ nivel: "OK", chequeo: "frescura", detalle: `último día con métricas: ${ultimoDato}` });
  }

  if (ultimaFuente) {
    const diasFuente = new Set<string>();
    const { data: todas } = await fuente.from(src.table_name).select("fecha").limit(1000);
    for (const f of todas ?? []) {
      const p = parseFechaLocal(String((f as { fecha: unknown }).fecha ?? ""), c.utc_offset);
      if (p) diasFuente.add(p.date);
    }
    const conMetricas = new Set(metricas.map((x) => x.date));
    const sinComputar = [...diasFuente].filter((d) => !conMetricas.has(d)).sort();
    if (sinComputar.length) {
      r.push({
        nivel: "FALLA",
        chequeo: "cobertura",
        detalle: `días con filas en la fuente y sin métricas: ${sinComputar.join(", ")} → correr el cómputo`,
      });
    } else {
      r.push({ nivel: "OK", chequeo: "cobertura", detalle: `${diasFuente.size} día(s) de la fuente, todos computados` });
    }
  }

  // ---------- 5. registro de tools ----------
  const te = await admin
    .from("tool_events")
    .select("ts")
    .eq("client_id", c.id)
    .order("ts", { ascending: false })
    .limit(1);
  if (te.error) {
    r.push({ nivel: "AVISO", chequeo: "tools", detalle: `no se pudo leer tool_events: ${te.error.message}` });
  } else {
    const ultimo = (te.data ?? [])[0]?.ts as string | undefined;
    const hayConversaciones = metricas.some((x) => x.conversations > 0);
    if (!ultimo && hayConversaciones) {
      r.push({
        nivel: "FALLA",
        chequeo: "tools",
        detalle: "hay conversaciones pero cero tool_events → 'Acciones del agente' y 'Lo más consultado' van a dar 0",
      });
    } else if (ultimo && dias(ultimo) > DIAS_FRESCURA) {
      r.push({ nivel: "AVISO", chequeo: "tools", detalle: `último registro de tools: hace ${dias(ultimo)} días` });
    } else if (!ultimo) {
      r.push({ nivel: "OK", chequeo: "tools", detalle: "sin conversaciones todavía: nada que registrar" });
    } else {
      r.push({ nivel: "OK", chequeo: "tools", detalle: `último registro de tools: ${String(ultimo).slice(0, 16)}` });
    }
  }

  // ---------- 6. coherencia ----------
  const imposibles = metricas.filter(
    (x) => x.conversion_sessions > x.conversations || (x.conversations > 0 && x.messages_human === 0),
  );
  if (imposibles.length) {
    r.push({
      nivel: "FALLA",
      chequeo: "coherencia",
      detalle: `${imposibles.length} día(s) con números imposibles (ej. ${imposibles[0].date})`,
    });
  } else {
    r.push({ nivel: "OK", chequeo: "coherencia", detalle: "conversiones ≤ conversaciones y ningún día mudo" });
  }

  return r;
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: clientes } = await admin.from("clients").select("id,name,utc_offset").order("created_at");
  const { data: fuentes } = await admin.from("client_sources").select("client_id,supabase_url,table_name");
  const porCliente = new Map((fuentes ?? []).map((s) => [s.client_id, s]));

  let fallas = 0;
  let avisos = 0;
  for (const c of clientes ?? []) {
    const src = porCliente.get(c.id) ?? null;
    console.log(`\n== ${c.name} ${src ? `(${src.table_name})` : ""}`);
    const resultados = await chequearCliente(
      admin,
      { id: c.id, name: c.name, utc_offset: Number(c.utc_offset ?? -3) },
      src,
    );
    for (const x of resultados) {
      const marca = x.nivel === "OK" ? "  ok  " : x.nivel === "AVISO" ? " aviso" : " FALLA";
      console.log(`  [${marca}] ${x.chequeo.padEnd(10)} ${x.detalle}`);
      if (x.nivel === "FALLA") fallas++;
      if (x.nivel === "AVISO") avisos++;
    }
  }

  console.log(`\n${fallas} falla(s), ${avisos} aviso(s).`);
  if (fallas) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
