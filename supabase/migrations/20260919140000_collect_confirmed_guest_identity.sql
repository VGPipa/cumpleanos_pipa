alter table public.pipa_rsvps
  add column if not exists full_name text,
  add column if not exists dni text;

alter table public.pipa_rsvps
  drop constraint if exists pipa_rsvps_confirmed_identity_check;

alter table public.pipa_rsvps
  add constraint pipa_rsvps_confirmed_identity_check check (
    (status <> 'yes' and full_name is null and dni is null)
    or (
      status = 'yes'
      and
      full_name is not null
      and char_length(btrim(full_name)) between 3 and 120
      and full_name ~ '\S+[[:space:]]+\S+'
      and dni ~ '^[0-9]{8}$'
    )
  ) not valid;

create or replace function public.pipa_submit_rsvp_with_identity(
  p_session_id uuid,
  p_write_token_hash text,
  p_status public.pipa_rsvp_status,
  p_full_name text,
  p_dni text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  game_session public.pipa_game_sessions%rowtype;
  normalized_name text;
begin
  if p_write_token_hash is null or p_write_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Sesión no encontrada';
  end if;

  if p_status not in ('yes', 'no') then
    raise exception 'Asistencia inválida';
  end if;

  if p_status = 'yes' then
    normalized_name := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
    if char_length(normalized_name) not between 3 and 120 or normalized_name !~ '\S+[[:space:]]+\S+' then
      raise exception 'Escribe tu nombre completo';
    end if;
    if coalesce(p_dni, '') !~ '^[0-9]{8}$' then
      raise exception 'El DNI debe tener 8 dígitos';
    end if;
  else
    normalized_name := null;
    p_dni := null;
  end if;

  select * into game_session
  from public.pipa_game_sessions
  where id = p_session_id
  for update;

  if not found or game_session.write_token_hash <> p_write_token_hash then
    raise exception 'Sesión no encontrada';
  end if;

  if game_session.status <> 'completed' then
    raise exception 'Completa el cuestionario primero';
  end if;

  insert into public.pipa_rsvps (session_id, quiz_id, status, full_name, dni)
  values (game_session.id, game_session.quiz_id, p_status, normalized_name, p_dni)
  on conflict (session_id) do update
  set status = excluded.status,
      full_name = excluded.full_name,
      dni = excluded.dni,
      updated_at = now();
end;
$$;

revoke all on function public.pipa_submit_rsvp_with_identity(uuid, text, public.pipa_rsvp_status, text, text)
from public, anon, authenticated;

grant execute on function public.pipa_submit_rsvp_with_identity(uuid, text, public.pipa_rsvp_status, text, text)
to service_role;
