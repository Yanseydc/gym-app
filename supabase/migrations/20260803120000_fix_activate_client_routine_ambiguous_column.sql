-- Fix activate_client_routine: ambiguous column reference "id"
--
-- Root cause: `returns table (id uuid, archived_previous boolean)` makes
-- `id` a PL/pgSQL variable in scope for the entire function body, exactly
-- like any other OUT parameter. The very first statement in the original
-- body (0005_rpcs.sql) read `... from public.clients where id =
-- target_client_id` with a bare, unqualified `id` -- ambiguous between
-- that OUT-parameter variable and public.clients.id. Confirmed empirically
-- two ways: `supabase db lint --local` reports SQLSTATE 42702 for this
-- function, and calling it directly against seeded local data raises the
-- same error at runtime on every invocation ("column reference \"id\" is
-- ambiguous"). This is not a lint-only false positive -- the function has
-- never successfully activated a routine.
--
-- Every other statement in the original body already qualified `id` via
-- the table's own name as an implicit range variable (e.g.
-- `client_routines.id`), which is NOT ambiguous with the OUT parameter --
-- only the one bare `id` above ever raised. This migration nonetheless
-- gives every table reference in the function an explicit short alias (c,
-- cr) instead of relying on implicit range variables, so no bare or
-- OUT-parameter-shadowable identifier remains anywhere in the body -- not
-- just at the one line that happened to fail first.
--
-- Everything else is unchanged on purpose: same signature (name + argument
-- types + OUT parameters), same `security definer`, same
-- `set search_path = ''`, same authorization checks (has_gym_role +
-- can_access_client), same row-locking order, same "archive any other
-- active routine for this client, then activate the target" business
-- rule, same behavior when target_routine_id does not exist or does not
-- belong to target_client_id (the final UPDATE ... RETURNING simply
-- matches zero rows; no exception is raised, matching the current
-- TypeScript caller in routine-service.ts, which already treats an empty
-- result as "Unable to activate routine."). This is an additive
-- CREATE OR REPLACE migration -- 0005_rpcs.sql is not edited, and
-- `CREATE OR REPLACE FUNCTION` on an unchanged signature preserves the
-- function's existing grants/ownership, so the revoke/grant statements
-- below are not strictly required to restore access -- they are repeated
-- anyway, identical to 0005_rpcs.sql, so the end state is asserted
-- explicitly rather than assumed.

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

  perform 1
  from public.client_routines cr
  where cr.id = target_routine_id
    and cr.client_id = target_client_id
  for update;

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
