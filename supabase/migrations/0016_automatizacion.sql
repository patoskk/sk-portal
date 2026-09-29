-- Automatizaciones de n8n (28/09/2026): la lección de los lunes por Telegram y el resumen mensual de novedades.
--
-- Solo agrega: ninguna página existente pide estas columnas ni estas tablas, así que el portal que está
-- en producción sigue andando igual antes y después de correr esto. Igual se corre ANTES del push:
-- las rutas nuevas de /api/automation las usan.

-- ---------- Qué tema del banco originó cada lección ----------
-- El banco vive en la skill nutricion-ia (reference/temas.json). El índice único es la garantía de que
-- el mismo tema no se publica dos veces, aunque Pato toque dos veces el mismo botón o lo elija en dos
-- mensajes distintos. Las lecciones cargadas a mano desde /admin quedan con null.
alter table public.lessons add column if not exists source_topic text;
create unique index if not exists lessons_source_topic_uidx
  on public.lessons (source_topic) where source_topic is not null;

-- ---------- La semana de la lección ----------
-- Una fila por semana (lunes, hora argentina). La escribe n8n:
--   ofrecida -> el lunes a las 18 se mandaron los temas (offered = sus ids)
--   elegida  -> Pato tocó uno (lesson_id se completa cuando la lección se publica)
--   salteada -> tocó "Esta semana no"
-- El recordatorio del martes solo sale si sigue "ofrecida".
create table if not exists public.lesson_weeks (
  week_start  date primary key,
  status      text not null check (status in ('ofrecida', 'elegida', 'salteada')),
  offered     jsonb not null default '[]'::jsonb,
  lesson_id   uuid references public.lessons(id) on delete set null,
  updated_at  timestamptz not null default now()
);
-- RLS on, SIN policies => solo el service_role (backend). Mismo criterio que lesson_notifications.
alter table public.lesson_weeks enable row level security;

-- ---------- El resumen mensual de novedades, por cliente ----------
-- Un mail por cliente y por mes. El unique es la idempotencia: si el workflow corre dos veces, el
-- segundo no manda nada. period = 'YYYY-MM' del mes que se resume.
create table if not exists public.update_digests (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete cascade,
  period       text not null,
  email        text not null,
  subject      text not null,
  items        integer not null default 0,
  status       text not null default 'queued',  -- queued | sent | error
  provider_id  text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (client_id, period)
);
create index if not exists update_digests_period_idx on public.update_digests (period);
alter table public.update_digests enable row level security;
