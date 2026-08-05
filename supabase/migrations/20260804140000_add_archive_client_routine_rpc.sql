-- Entrega A0.1 (expand stage): adds the dedicated archive_client_routine
-- RPC ahead of any app code that will call it, and ahead of any
-- enforcement that would block the currently-deployed app's own archiving
-- path. This migration does not touch client_routines RLS/triggers and
-- does not change client_routines_update_by_gym in any way -- the
-- currently-deployed app keeps archiving via its existing direct UPDATE
-- (status = 'archived') exactly as it does today. This RPC exists purely
-- additively, so it can be verified end-to-end before any app deploy
-- depends on it, and before a later migration (Entrega A0.3) closes the
-- direct-UPDATE path entirely.
--
-- Deliberately minimal -- the only caller-supplied value is the routine
-- id; gym/authorization are re-derived fresh from the row itself
-- (client_routines.gym_id, read inside this same function call, right
-- before the has_gym_role check) and from auth.uid() via has_gym_role. No
-- client_id, title, notes, or gym_id is ever accepted as a parameter from
-- the caller, so there is no forged parameter for the authorization check
-- to trust in the first place.
--
-- Behavior:
--   * routine not found (or caller lacks gym access to it): exception
--     ("Routine not found." / "Not authorized ...").
--   * already archived: idempotent success (already_archived = true),
--     not an error -- repeating the call has a stable, predictable
--     outcome instead of a surprising failure.
--   * draft or active: archived (already_archived = false).
--
-- security definer + set search_path = '' match the existing
-- activate_client_routine convention (20260803120000_...). Owned by
-- `postgres` (the role every migration in this project runs as, local and
-- remote), same as every other SECURITY DEFINER function here.
create or replace function public.archive_client_routine(
  target_routine_id uuid
)
returns table (
  id uuid,
  already_archived boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gym_id uuid;
  v_status text;
begin
  select cr.gym_id, cr.status
  into v_gym_id, v_status
  from public.client_routines cr
  where cr.id = target_routine_id
  for update;

  if v_gym_id is null then
    raise exception 'Routine not found.';
  end if;

  if not private.has_gym_role(array['admin', 'staff', 'coach'], v_gym_id) then
    raise exception 'Not authorized to archive this routine.';
  end if;

  if v_status = 'archived' then
    return query select cr.id, true from public.client_routines cr where cr.id = target_routine_id;
    return;
  end if;

  return query
  update public.client_routines cr
  set status = 'archived', updated_at = timezone('utc', now())
  where cr.id = target_routine_id
  returning cr.id, false;
end;
$$;

revoke all on function public.archive_client_routine(uuid) from public, anon, authenticated;
revoke all on function public.archive_client_routine(uuid) from anon;
grant execute on function public.archive_client_routine(uuid) to authenticated;
