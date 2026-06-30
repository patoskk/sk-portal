-- Fix: el Custom Access Token Hook corre como supabase_auth_admin y lee user_clients.
-- Con RLS activado, un GRANT no alcanza: hace falta una policy para ese rol.
-- (Patrón documentado de Supabase para hooks que leen tablas con RLS.)

grant all on table public.user_clients to supabase_auth_admin;

drop policy if exists "auth_admin_read_user_clients" on public.user_clients;
create policy "auth_admin_read_user_clients" on public.user_clients
  as permissive for select
  to supabase_auth_admin
  using (true);
