-- Métrica de "Conversiones" (evento clave: pedido/turno/reserva…), genérica por rubro.
alter table public.metrics_daily add column if not exists conversions int not null default 0;
alter table public.metrics_daily add column if not exists conversion_sessions int not null default 0;

-- Etiqueta configurable por cliente (default mostrado en la app: "Conversiones").
alter table public.clients add column if not exists conversion_label text;

-- El cliente puede leer SU propia fila (para mostrar su etiqueta/nombre). Aislado por RLS.
drop policy if exists clients_sel_own on public.clients;
create policy clients_sel_own on public.clients
  for select to authenticated
  using (id = public.current_client_id());

-- El Búho vende: su evento clave se llama "Pedidos".
update public.clients set conversion_label = 'Pedidos'
where id = 'd3b9967f-a5c9-465e-a42c-c4b116be71ba';
