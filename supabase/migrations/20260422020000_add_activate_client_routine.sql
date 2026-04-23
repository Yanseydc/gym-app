create or replace function public.activate_client_routine(
  target_routine_id uuid,
  target_client_id uuid,
  target_title text,
  target_notes text,
  target_starts_on date,
  target_ends_on date
)
returns table (
  id uuid,
  archived_previous boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_active_id uuid;
begin
  if not public.has_any_role(array['admin', 'staff', 'coach']) then
    raise exception 'Not authorized to activate routines for this client.';
  end if;

  if not public.can_access_client(target_client_id) then
    raise exception 'Not authorized to access this client.';
  end if;

  perform 1
  from public.client_routines
  where client_routines.id = target_routine_id
    and client_routines.client_id = target_client_id
  for update;

  select client_routines.id
  into previous_active_id
  from public.client_routines
  where client_routines.client_id = target_client_id
    and client_routines.status = 'active'
    and client_routines.id <> target_routine_id
  limit 1
  for update;

  update public.client_routines
  set status = 'archived',
      updated_at = timezone('utc', now())
  where client_routines.client_id = target_client_id
    and client_routines.status = 'active'
    and client_routines.id <> target_routine_id;

  return query
  update public.client_routines
  set title = trim(target_title),
      notes = nullif(trim(coalesce(target_notes, '')), ''),
      status = 'active',
      starts_on = target_starts_on,
      ends_on = target_ends_on,
      updated_at = timezone('utc', now())
  where client_routines.id = target_routine_id
    and client_routines.client_id = target_client_id
  returning client_routines.id, previous_active_id is not null;
end;
$$;
