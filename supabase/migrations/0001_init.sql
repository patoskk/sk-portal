-- =====================================================================
-- SK Optimal — Portal del cliente · base central
-- Tablas resumen (grano diario) + multi-tenant con Row Level Security.
-- Aislamiento garantizado en la BASE: cada cliente solo ve sus filas,
-- aunque la app tenga un bug. El cron usa service_role (bypassa RLS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Registro de clientes (tenants) ----------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rubro         text not null default '',
  utc_offset    numeric not null default -3,   -- huso local para hora/día
  brand         jsonb not null default '{}'::jsonb, -- overrides de marca opcionales
  created_at    timestamptz not null default now()
);

-- ---------- Mapeo usuario -> cliente (1 cliente por usuario en el piloto) ----------
create table if not exists public.user_clients (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null default 'viewer'  -- viewer (cliente) | admin (SK Optimal)
);
create index if not exists user_clients_client_idx on public.user_clients(client_id);

-- ---------- Fuentes de datos (Supabase de cada cliente) ----------
-- NO guardar la service_key en claro: usar Supabase Vault y referenciar el id.
create table if not exists public.client_sources (
  client_id        uuid primary key references public.clients(id) on delete cascade,
  supabase_url     text not null,
  vault_secret_id  uuid,            -- id del secreto en vault.secrets (service/anon key del cliente)
  table_name       text not null default 'n8n_chat_histories',
  last_synced_at   timestamptz
);

-- ---------- Tablas resumen (lo que lee el dashboard) ----------
create table if not exists public.metrics_daily (
  client_id        uuid not null references public.clients(id) on delete cascade,
  date             date not null,
  conversations    int not null default 0,
  order_sessions   int not null default 0,
  stock_sessions   int not null default 0,
  messages_human   int not null default 0,
  messages_total   int not null default 0,
  stock_queries    int not null default 0,
  orders           int not null default 0,
  errors           int not null default 0,
  tool_results     int not null default 0,
  images_sent      int not null default 0,
  response_sum_sec int not null default 0,
  response_count   int not null default 0,
  primary key (client_id, date)
);

create table if not exists public.product_queries_daily (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  product    text not null,
  found      boolean not null,      -- true: hubo resultado · false: quiebre (venta perdida)
  count      int not null default 0,
  primary key (client_id, date, product, found)
);

create table if not exists public.tool_usage_daily (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  tool       text not null,
  count      int not null default 0,
  primary key (client_id, date, tool)
);

create table if not exists public.activity_hourly (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  hour       smallint not null check (hour between 0 and 23),
  count      int not null default 0,
  primary key (client_id, date, hour)
);

create table if not exists public.intent_daily (
  client_id  uuid not null references public.clients(id) on delete cascade,
  date       date not null,
  intent     text not null,
  count      int not null default 0,
  primary key (client_id, date, intent)
);

-- ---------- Insights / oportunidades (generados por Claude, semanal) ----------
create table if not exists public.insights (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  opportunities   jsonb not null default '[]'::jsonb,  -- [{title, text}]
  funnel_insight  text,
  products_insight text,
  usage_insight   text,
  activity_insight text,
  misses_insight  text,
  proxima_etapa   text,
  reviewed        boolean not null default false,       -- gate: no se muestra al cliente hasta revisar
  generated_at    timestamptz not null default now()
);
create index if not exists insights_client_period_idx
  on public.insights(client_id, period_end desc);

-- =====================================================================
-- Custom Access Token Hook: inyecta client_id y role en el JWT al login.
-- Configurar en Dashboard → Authentication → Hooks (Access Token).
-- =====================================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb := event->'claims';
  uc record;
begin
  select client_id, role into uc
  from public.user_clients
  where user_id = (event->>'user_id')::uuid;

  if uc.client_id is not null then
    claims := jsonb_set(claims, '{client_id}', to_jsonb(uc.client_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(uc.role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant all on table public.user_clients to supabase_auth_admin;
-- el hook corre como supabase_auth_admin; con RLS el grant no alcanza, hace falta policy
create policy "auth_admin_read_user_clients" on public.user_clients
  as permissive for select to supabase_auth_admin using (true);

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- helper: client_id del JWT actual
create or replace function public.current_client_id()
returns uuid
language sql
stable
as $$ select nullif(auth.jwt() ->> 'client_id', '')::uuid $$;

-- Tablas internas: RLS on, SIN policy para anon/authenticated => deny total.
-- Solo el service_role (cron / backend) las toca.
alter table public.clients         enable row level security;
alter table public.client_sources  enable row level security;
alter table public.user_clients    enable row level security;

-- el usuario puede ver su propio mapeo (útil para el front), nada más
create policy "own mapping" on public.user_clients
  for select to authenticated
  using (user_id = auth.uid());

-- Tablas de métricas: cada usuario ve SOLO las filas de su client_id.
do $$
declare t text;
begin
  foreach t in array array[
    'metrics_daily','product_queries_daily','tool_usage_daily',
    'activity_hourly','intent_daily','insights'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (client_id = public.current_client_id());',
      t || '_sel', t
    );
  end loop;
end $$;

-- Para insights, además ocultar lo no revisado a los clientes (viewers).
drop policy if exists insights_sel on public.insights;
create policy insights_sel on public.insights
  for select to authenticated
  using (
    client_id = public.current_client_id()
    and (reviewed = true or coalesce(auth.jwt() ->> 'user_role','') = 'admin')
  );