-- Para lecciones en HTML: guardamos el contenido y lo servimos desde la app
-- (Supabase Storage fuerza text/plain en HTML por seguridad, así que no renderiza).
-- Los PDF siguen yendo por Storage (url); los links externos también por url.
alter table public.lessons add column if not exists body text;
