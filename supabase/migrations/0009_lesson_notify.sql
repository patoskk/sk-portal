-- Aviso por mail cuando se publica una lección nueva.
-- El portal compone (destinatarios + HTML + log) y n8n envía por Gmail.

-- ---------- Contacto del DUEÑO (para los avisos) ----------
-- Distinto del mail de LOGIN: la cuenta del portal se crea con el mail de la
-- empresa (ej. ventas@gallocastagnetti.com), pero los avisos van al mail
-- personal del dueño (ej. fernandogallo@gmail.com) y lo saludan por su nombre.
-- Sin contact_email, ese cliente NO recibe avisos (no queremos escribirle a la
-- casilla de la empresa por descuido).
alter table public.clients add column if not exists contact_name  text;
alter table public.clients add column if not exists contact_email text;
alter table public.clients add column if not exists notify_lessons boolean not null default true;

-- ---------- Campos del aviso en la lección ----------
-- why = "por qué te conviene verla" (2-3 bullets, uno por línea).
-- Queda visible para el cliente por la policy lessons_sel ya existente.
alter table public.lessons add column if not exists why text;
alter table public.lessons add column if not exists notified_at timestamptz;

-- ---------- Log de envíos: idempotencia + auditoría ----------
-- Un aviso por CLIENTE (va al dueño), no por usuario del portal.
create table if not exists public.lesson_notifications (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  email       text not null,
  subject     text not null,
  status      text not null default 'queued',  -- queued | sent | error
  provider_id text,                            -- id del mensaje en Gmail
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  -- la garantía de que apretar "Avisar" dos veces no manda dos mails
  -- (el reenvío explícito borra la fila antes de re-encolar)
  unique (lesson_id, email)
);

create index if not exists lesson_notifications_lesson_idx
  on public.lesson_notifications (lesson_id);

-- RLS on, SIN policy para anon/authenticated => deny total.
-- Solo el service_role (backend) la toca. Mismo criterio que clients /
-- client_sources en 0001_init.sql.
alter table public.lesson_notifications enable row level security;
