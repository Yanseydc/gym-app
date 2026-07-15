-- 0003 coaching functions
-- can_access_client: the single choke point used by every SELECT policy in
-- 0004_coaching_tables that needs "staff of the right gym OR the client
-- themself". Fixing the gym check here once fixes it everywhere it is
-- used, instead of repeating (and risking re-breaking) the check in every
-- policy.
--
-- client_user_links and is_linked_client() -- originally planned for this
-- file -- now live in 0002_core_business.sql instead: clients_select_by_gym
-- there needs is_linked_client(), which needs client_user_links, so both
-- had to move earlier in the dependency chain. can_access_client stays
-- here since nothing before 0004_coaching_tables.sql needs it, and it
-- composes has_gym_role (0001) with is_linked_client (now 0002), both
-- already available by the time this migration runs.

create or replace function private.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_gym_role(
      array['admin', 'staff', 'coach'],
      (select gym_id from public.clients where id = target_client_id)
    )
    or private.is_linked_client(target_client_id);
$$;

revoke all on function private.can_access_client(uuid) from public, anon, authenticated;
revoke all on function private.can_access_client(uuid) from anon;
grant execute on function private.can_access_client(uuid) to authenticated;
