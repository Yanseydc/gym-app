-- Entrega A0.3 (contract stage, part 1 of 2): closes the "archived can be
-- reactivated" gap found during review of the enforcement trigger added in
-- 20260806100000_enforce_client_routine_status_transitions.sql (which must
-- apply AFTER this migration -- see that file's ordering note). That
-- trigger only constrains DIRECT writes performed as `authenticated`;
-- activate_client_routine runs SECURITY DEFINER as `postgres`, so the
-- trigger's `current_user in ('service_role', 'postgres')` fast path lets
-- every write this RPC performs through unconditionally. The RPC itself
-- must therefore be the sole authority for which status transitions it is
-- willing to perform -- it cannot rely on the trigger for this rule.
--
-- Deployed today (20260803120000_fix_activate_client_routine_ambiguous_
-- column.sql, already applied in production) performs zero validation of
-- the routine's CURRENT status: given any target_routine_id belonging to
-- target_client_id, it unconditionally archives any other active routine
-- for that client and sets the target to 'active', regardless of whether
-- the target was 'draft', 'active', or 'archived'. That last case is a
-- real defect: it lets an authorized coach/admin/staff silently revive an
-- archived routine via the same "Activate" control shown for any
-- non-active routine, contradicting the definitive contract that archived
-- is a terminal state reachable only forward, never backward.
--
-- This migration is purely additive (CREATE OR REPLACE FUNCTION on the
-- unchanged signature) and does not touch the already-applied 20260803120000
-- migration. Every existing behavior is preserved byte-for-byte except the
-- new status guard described below:
--   * same signature, same SECURITY DEFINER, same `set search_path = ''`;
--   * same authorization checks (has_gym_role + can_access_client), in the
--     same order, before any row is even locked;
--   * same "lock target row, lock+archive any other active routine for
--     this client, then activate the target" sequence for the permitted
--     cases;
--   * same silent zero-row result (no exception) when target_routine_id
--     does not exist or does not belong to target_client_id -- unchanged,
--     matching the existing TypeScript caller (routine-service.ts /
--     activate-routine.ts), which already treats an empty result as
--     "Unable to activate routine.";
--   * same concurrency guarantees: the target row and any other active row
--     for the client are still locked with `for update` before either is
--     mutated, so two concurrent activations for the same client still
--     serialize on the row locks, and client_routines_one_active_per_
--     client_idx (the pre-existing unique partial index) remains the final
--     backstop ensuring at most one active routine survives either way.
--
-- New: the routine's current status is fetched (via the same `for update`
-- lock, now capturing the value instead of discarding it) and checked
-- BEFORE any mutation:
--   * 'draft'  -> proceeds exactly as before (draft -> active);
--   * 'active' -> proceeds exactly as before. At most one routine per
--     client can ever be 'active' (unique partial index), so the
--     "archive any other active routine" step necessarily finds none
--     besides the target itself; the final UPDATE re-applies the same
--     field values the caller already holds (activate-routine.ts always
--     calls this RPC with the routine's own freshly-read title/notes/
--     dates), so re-activating the already-active routine is a stable,
--     side-effect-free no-op on every other row;
--   * 'archived' or any other unexpected value -> rejected with a stable
--     exception BEFORE the archive-other-actives step or the final UPDATE
--     ever run, so no row (including any other active routine) is
--     touched. Reviving an archived routine is not supported by any path.
--   * target_routine_id not found for target_client_id (status reads as
--     NULL) -> unchanged: no exception is raised for this case either, so
--     execution falls through to the final UPDATE, which matches zero
--     rows exactly like today.

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
set search_path = ''
as $$
declare
  previous_active_id uuid;
  v_client_gym uuid;
  v_current_status text;
begin
  select c.gym_id into v_client_gym from public.clients c where c.id = target_client_id;
  if v_client_gym is null then
    raise exception 'Client not found.';
  end if;

  if not private.has_gym_role(array['admin', 'staff', 'coach'], v_client_gym) then
    raise exception 'Not authorized to activate routines for this client.';
  end if;

  if not private.can_access_client(target_client_id) then
    raise exception 'Not authorized to access this client.';
  end if;

  select cr.status
  into v_current_status
  from public.client_routines cr
  where cr.id = target_routine_id
    and cr.client_id = target_client_id
  for update;

  if v_current_status is not null and v_current_status not in ('draft', 'active') then
    raise exception 'Archived routines cannot be reactivated directly; create a new routine instead.';
  end if;

  select cr.id
  into previous_active_id
  from public.client_routines cr
  where cr.client_id = target_client_id
    and cr.status = 'active'
    and cr.id <> target_routine_id
  limit 1
  for update;

  update public.client_routines cr
  set status = 'archived', updated_at = timezone('utc', now())
  where cr.client_id = target_client_id
    and cr.status = 'active'
    and cr.id <> target_routine_id;

  return query
  update public.client_routines cr
  set title = trim(target_title),
      notes = nullif(trim(coalesce(target_notes, '')), ''),
      status = 'active',
      starts_on = target_starts_on,
      ends_on = target_ends_on,
      updated_at = timezone('utc', now())
  where cr.id = target_routine_id
    and cr.client_id = target_client_id
  returning cr.id, previous_active_id is not null;
end;
$$;

revoke all on function public.activate_client_routine(uuid, uuid, text, text, date, date) from public, anon, authenticated;
revoke all on function public.activate_client_routine(uuid, uuid, text, text, date, date) from anon;
grant execute on function public.activate_client_routine(uuid, uuid, text, text, date, date) to authenticated;
