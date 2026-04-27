-- Manual client merge helper.
-- This is intentionally not automatic: the UI must choose the duplicate client.
-- The function runs in one transaction because PostgreSQL functions are atomic.

create or replace function public.merge_clients(
  main_client_id uuid,
  duplicate_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_gym_id uuid;
  main_gym_id uuid;
  duplicate_gym_id uuid;
begin
  if main_client_id = duplicate_client_id then
    raise exception 'Clients must be different.';
  end if;

  select role, gym_id
  into actor_role, actor_gym_id
  from public.profiles
  where id = auth.uid();

  if actor_role is null then
    raise exception 'Authentication required.';
  end if;

  if actor_role not in ('admin', 'staff') then
    raise exception 'You do not have permission to merge clients.';
  end if;

  select gym_id
  into main_gym_id
  from public.clients
  where id = main_client_id;

  select gym_id
  into duplicate_gym_id
  from public.clients
  where id = duplicate_client_id;

  if main_gym_id is null and not exists (select 1 from public.clients where id = main_client_id) then
    raise exception 'Main client not found.';
  end if;

  if duplicate_gym_id is null and not exists (select 1 from public.clients where id = duplicate_client_id) then
    raise exception 'Duplicate client not found.';
  end if;

  if main_gym_id is distinct from duplicate_gym_id then
    raise exception 'Clients must belong to the same gym.';
  end if;

  if actor_gym_id is distinct from main_gym_id then
    raise exception 'Clients are not available for your gym.';
  end if;

  if exists (
    select 1 from public.client_onboarding_responses where client_id = main_client_id
  ) and exists (
    select 1 from public.client_onboarding_responses where client_id = duplicate_client_id
  ) then
    raise exception 'Both clients have coaching onboarding data. Resolve that manually before merging.';
  end if;

  if exists (
    select 1 from public.client_user_links where client_id = main_client_id
  ) and exists (
    select 1 from public.client_user_links where client_id = duplicate_client_id
  ) then
    raise exception 'Both clients have portal access linked. Resolve that manually before merging.';
  end if;

  update public.client_routines
  set client_id = main_client_id
  where client_id = duplicate_client_id;

  update public.client_checkins
  set client_id = main_client_id
  where client_id = duplicate_client_id;

  update public.payments
  set client_id = main_client_id
  where client_id = duplicate_client_id;

  update public.client_memberships
  set client_id = main_client_id
  where client_id = duplicate_client_id;

  update public.check_ins
  set client_id = main_client_id
  where client_id = duplicate_client_id;

  update public.client_onboarding_responses
  set client_id = main_client_id
  where client_id = duplicate_client_id
    and not exists (
      select 1
      from public.client_onboarding_responses
      where client_id = main_client_id
    );

  update public.client_user_links
  set client_id = main_client_id,
      gym_id = main_gym_id,
      updated_at = now()
  where client_id = duplicate_client_id
    and not exists (
      select 1
      from public.client_user_links
      where client_id = main_client_id
    );

  delete from public.clients
  where id = duplicate_client_id;
end;
$$;
