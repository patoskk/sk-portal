-- Sección "Novedades": lo que le fuimos haciendo al agente del cliente.
-- Existe para hacer visible el trabajo del mes — el cliente ve métricas y
-- lecciones, pero no tenía forma de enterarse de qué mejoramos ni qué arreglamos.
--
-- Mismo modelo que lessons: client_id NULL = novedad global (aplica a todos),
-- con valor = novedad de ese cliente.

create table if not exists public.updates (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients(id) on delete cascade, -- null = global
  kind          text not null default 'mejora'
                check (kind in ('nuevo', 'mejora', 'arreglo')),
  title         text not null,
  body          text,
  published_at  date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists updates_pub_idx on public.updates (published_at desc);

alter table public.updates enable row level security;

-- cada usuario ve las globales + las de su propio cliente (igual que lessons_sel)
drop policy if exists updates_sel on public.updates;
create policy updates_sel on public.updates
  for select to authenticated
  using (client_id is null or client_id = public.current_client_id());
