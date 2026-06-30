-- Soporte de rol admin (SK Optimal) para gestionar lecciones desde el portal.
-- Un admin no está atado a un cliente, así que client_id puede ser NULL.

alter table public.user_clients alter column client_id drop not null;

-- El hook ahora SIEMPRE setea user_role si hay mapeo; client_id solo si existe.
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

  if uc.role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(uc.role));
    if uc.client_id is not null then
      claims := jsonb_set(claims, '{client_id}', to_jsonb(uc.client_id::text));
    end if;
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;
