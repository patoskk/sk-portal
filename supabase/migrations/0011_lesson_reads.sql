-- Progreso de lectura por usuario. Hasta ahora el portal no registraba nada:
-- no había forma de saber si el cliente abrió una lección, ni de mostrarle
-- "te faltan 3". El único dato existente era notified_at (mail enviado), que
-- mide lo que mandamos nosotros, no lo que leyó él.

create table if not exists public.lesson_reads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists lesson_reads_user_idx on public.lesson_reads (user_id);

alter table public.lesson_reads enable row level security;

-- Cada usuario ve y escribe SOLO sus propias marcas de lectura.
drop policy if exists lesson_reads_sel on public.lesson_reads;
create policy lesson_reads_sel on public.lesson_reads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists lesson_reads_ins on public.lesson_reads;
create policy lesson_reads_ins on public.lesson_reads
  for insert to authenticated
  with check (user_id = auth.uid());

-- update para el upsert: reabrir una lección refresca read_at
drop policy if exists lesson_reads_upd on public.lesson_reads;
create policy lesson_reads_upd on public.lesson_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
