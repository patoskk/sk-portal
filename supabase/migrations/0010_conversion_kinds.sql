-- Conversiones SEPARADAS por tipo de evento (opt-in, por cliente).
-- Caso real: Kopf und Puls cierra dos cosas distintas — vende productos (PEDIDOS)
-- y agenda turnos (AGENDAR_TURNO). Sumarlas en un solo número escondía cuál de las
-- dos funciona. Los clientes SIN configuración siguen exactamente igual (un solo
-- KPI con `conversion_label`): esta migración no cambia ningún número existente.

-- Config por cliente. NULL = comportamiento actual (una sola conversión).
--   [{"key":"pedidos","label":"Pedidos","tools":["PEDIDOS"],"signal":"order"},
--    {"key":"turnos","label":"Turnos","tools":["AGENDAR_TURNO"],"signal":"booking"}]
--   key    : identificador estable (se guarda en conversions_daily; no cambiarlo después)
--   label  : lo que ve el cliente en el panel
--   tools  : nombres de tools que CIERRAN ese evento (case-insensitive)
--   signal : "order" | "booking" — además detecta el cierre declarativo en el
--            mensaje del agente ("tu turno quedó confirmado"), como el genérico.
alter table public.clients add column if not exists conversion_kinds jsonb;

-- Grano diario por tipo, mismo patrón que las demás tablas resumen.
create table if not exists public.conversions_daily (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  kind       text not null,        -- coincide con conversion_kinds[].key
  sessions   int not null default 0,  -- conversaciones distintas con ese evento (lo que se muestra)
  events     int not null default 0,  -- cantidad de eventos (puede haber >1 por charla)
  primary key (client_id, date, kind)
);

alter table public.conversions_daily enable row level security;
drop policy if exists conversions_daily_sel on public.conversions_daily;
create policy conversions_daily_sel on public.conversions_daily
  for select to authenticated
  using (client_id = public.current_client_id());

-- ---------------------------------------------------------------------------
-- Kopf und Puls (wellness): pedidos de productos y turnos con Kinga, separados.
-- REGISTRAR_PAGO no cuenta: confirma un turno/pedido que YA se contó en su charla.
-- ---------------------------------------------------------------------------
update public.clients
set conversion_kinds = '[
  {"key":"pedidos","label":"Pedidos","tools":["PEDIDOS"],"signal":"order"},
  {"key":"turnos","label":"Turnos","tools":["AGENDAR_TURNO"],"signal":"booking"}
]'::jsonb
where id = '708eb787-409f-4a91-a79c-3a014ca5c1d7';

-- El cómputo es INCREMENTAL: sin esto solo separaría los días nuevos y el historial
-- quedaría sin desglose. Borrar la marca fuerza una relectura completa de la fuente
-- en la próxima corrida del cron. Hacerlo SIEMPRE que se activen tipos en un cliente.
update public.client_sources
set last_synced_at = null
where client_id = '708eb787-409f-4a91-a79c-3a014ca5c1d7';
