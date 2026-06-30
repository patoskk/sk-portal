-- Sección "Lecciones": lecturas/material de IA que SK Optimal entrega a los clientes.
-- client_id NULL = visible para todos los clientes; con valor = lección targeteada a uno.

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients(id) on delete cascade, -- null = global
  title         text not null,
  summary       text,
  url           text,                 -- link a la lectura (PDF/HTML) — opcional
  published_at  date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists lessons_pub_idx on public.lessons (published_at desc);

alter table public.lessons enable row level security;

-- cada usuario ve las globales + las de su propio cliente
drop policy if exists lessons_sel on public.lessons;
create policy lessons_sel on public.lessons
  for select to authenticated
  using (client_id is null or client_id = public.current_client_id());