-- "Lo más consultado": valores que el agente pasa a sus tools de búsqueda/info
-- (para El Búho = productos buscados). Genérico, sin datos personales.
create table if not exists public.tool_queries_daily (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  query      text not null,
  count      int not null default 0,
  primary key (client_id, date, query)
);

alter table public.tool_queries_daily enable row level security;
drop policy if exists tool_queries_daily_sel on public.tool_queries_daily;
create policy tool_queries_daily_sel on public.tool_queries_daily
  for select to authenticated
  using (client_id = public.current_client_id());
