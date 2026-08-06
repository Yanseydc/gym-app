-- Entrega A0.3 (contract stage): closes the direct-write bypass that A0.1
-- (RLS isolation + archive_client_routine RPC) and A0.2 (app exclusively
-- uses activate_client_routine/archive_client_routine) deliberately left
-- open so the previously-deployed app kept working without interruption.
-- A0.1 and A0.2 are already live in production; this migration is the only
-- remaining step, and it is purely additive at the schema level -- no
-- table shape changes, no RLS policy changes, no data changes, no
-- re-creation of either RPC.
--
-- Mechanism: a BEFORE INSERT OR UPDATE trigger on client_routines that
-- allows only:
--   * INSERT with status = 'draft' (the only initial state any create/
--     import path ever produces);
--   * UPDATE that does not change status at all (ordinary metadata edits
--     -- title/notes/dates/days/exercises never touch this column);
--   * any INSERT/UPDATE performed while current_user is 'service_role' or
--     'postgres'.
-- Every other transition (draft->active, draft->archived, active->draft,
-- active->archived, archived->draft, archived->active, or creating a row
-- pre-set to anything but draft) is rejected.
--
-- current_user, not a session GUC, is what distinguishes a trusted
-- SECURITY DEFINER call from a direct authenticated write. This is not a
-- value a caller can set or spoof: Postgres itself sets current_user to a
-- SECURITY DEFINER function's OWNER for the duration of that function's
-- execution (see "Writing SECURITY DEFINER Functions Safely" in the
-- Postgres docs). Every migration in this project -- local
-- `supabase db reset`/`migration up` and the equivalent remote deploy path
-- -- runs as the `postgres` role, so both activate_client_routine and
-- archive_client_routine (already deployed in A0.1, unchanged by this
-- migration) are owned by postgres. A plain authenticated PostgREST
-- request can never make current_user read "postgres" or "service_role":
-- PostgREST only ever executes anon/authenticated/service_role requests
-- as those exact roles, and neither of those is ever "postgres". Audited
-- adversarially before writing this migration (re-confirmed against this
-- exact commit of main, see the PR description): both RPCs are owned by
-- postgres and SECURITY DEFINER with search_path = ''; their ACL is
-- {postgres=X, authenticated=X} (no anon, no bare PUBLIC); no other
-- SECURITY DEFINER function reachable by authenticated writes
-- client_routines.status (merge_clients only ever touches client_id;
-- start_routine_session and is_exercise_referenced_by_caller_routine are
-- read-only); authenticated has no CREATE privilege on either the public
-- or private schema (verified both via has_schema_privilege and a live
-- rejected CREATE FUNCTION attempt), so it cannot forge a rogue
-- SECURITY DEFINER function of its own to spoof this signal.
--
-- archived is a terminal state for direct writes: this trigger does not
-- special-case archived -> draft or archived -> active for any
-- non-trusted current_user. Reviving an archived routine remains possible
-- exclusively through activate_client_routine (already supported there,
-- unchanged), matching the existing "Activate" UI, which is shown for any
-- non-active routine including archived ones.
--
-- No GRANT is added for this function to authenticated (or any other
-- role): it is only ever invoked by the trigger executor when a row is
-- inserted/updated on client_routines, never called directly, and Postgres
-- does not check the invoking role's EXECUTE privilege for trigger
-- invocation. REVOKE below is defense-in-depth/consistency with every
-- other function in the private schema, not a functional requirement --
-- verified empirically that revoking all EXECUTE still lets the trigger
-- fire correctly for authenticated, anon, and service_role alike (see
-- supabase/tests/routines-a0-enforcement.integration.test.ts).

create or replace function private.enforce_client_routine_status_transition()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'postgres') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A routine can only be created as draft.';
    end if;
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  raise exception 'Routine status can only change via the dedicated activate or archive action, not a direct write.';
end;
$$;

revoke all on function private.enforce_client_routine_status_transition() from public, anon, authenticated;

create trigger client_routines_enforce_status_transition
before insert or update on public.client_routines
for each row
execute function private.enforce_client_routine_status_transition();
