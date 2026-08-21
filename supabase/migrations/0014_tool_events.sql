-- Registro de uso de herramientas, reportado por n8n.
--
-- Por qué existe: la memoria de n8n guarda SOLO los turnos de texto (humano y
-- respuesta final). Las tool calls del loop interno del agente no se persisten,
-- así que desde julio/2026 quedaron en cero "Acciones del agente", "Uso de
-- herramientas", "Lo más consultado", "Consultas sin resultado", "Errores" y la
-- señal de conversión por nombre de tool.
--
-- Por qué NO se arregla escribiendo en la tabla de conversaciones del cliente:
-- esa tabla es la memoria que el agente vuelve a leer como contexto
-- (contextWindowLength). Meterle filas es lo que envenenó al modelo el 04/08.
-- Por eso el registro vive acá, en la base central, y no toca ninguna fuente.

create table if not exists public.tool_events (
  client_id   uuid not null references public.clients(id) on delete cascade,
  -- idempotencia: id de ejecución de n8n + índice del paso. Si n8n reintenta,
  -- el upsert pisa la misma fila en vez de inflar el contador.
  event_id    text not null,
  ts          timestamptz not null,        -- UTC, igual criterio que `fecha` en las fuentes
  session_id  text not null default '',
  tool        text not null,               -- el nombre tal cual lo usa el agente
  -- "lo más consultado". Solo para tools de búsqueda y ya saneado por el endpoint:
  -- nunca se guardan los args crudos ni nada que pueda identificar a una persona.
  query       text,
  outcome     text not null default 'ok',  -- ok | sin_resultado | error
  created_at  timestamptz not null default now(),
  primary key (client_id, event_id)
);

create index if not exists tool_events_client_ts_idx
  on public.tool_events(client_id, ts desc);

-- Sin policies a propósito: solo el service role escribe y lee. El cliente nunca
-- toca esta tabla — la ve agregada en metrics_daily / tool_usage_daily.
alter table public.tool_events enable row level security;
