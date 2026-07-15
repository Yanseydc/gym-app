-- 0005 rpcs
-- Explicit RPC functions called directly by application code (not referenced
-- from inside any RLS policy, so this migration can run after all tables
-- exist). Every SECURITY DEFINER function here follows the same hardening
-- rules as 0001/0003:
--   - set search_path = '' with fully schema-qualified identifiers.
--   - EXECUTE revoked from PUBLIC and anon, granted only to authenticated.
--   - Internal auth.uid()/role/gym/link validation -- these functions run
--     with the owner's privileges and are NOT filtered by RLS on the
--     tables they touch internally, so they must not rely on RLS to
--     protect themselves.

-- =========================================================
-- lookup_portal_profile_by_email / lookup_portal_profile_by_id
--
-- Used by portal-access-service.ts to check whether an email/profile
-- already exists before inviting a new portal user. Previously these did
-- not compare the found profile's gym against the caller's gym, which
-- could leak whether an email belongs to a profile in a different gym.
-- Now the result is only returned if it belongs to the caller's own gym
-- (or the caller is super_admin).
-- =========================================================

create or replace function public.lookup_portal_profile_by_email(target_email text)
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email, p.first_name, p.last_name, p.role
  from public.profiles p
  where private.has_any_role(array['admin', 'staff', 'coach'])
    and lower(p.email) = lower(trim(target_email))
    and (
      private.has_any_role(array['super_admin'])
      or p.gym_id = (select gym_id from public.profiles where id = auth.uid())
    )
  limit 1;
$$;

revoke all on function public.lookup_portal_profile_by_email(text) from public, anon, authenticated;
revoke all on function public.lookup_portal_profile_by_email(text) from anon;
grant execute on function public.lookup_portal_profile_by_email(text) to authenticated;

create or replace function public.lookup_portal_profile_by_id(target_profile_id uuid)
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email, p.first_name, p.last_name, p.role
  from public.profiles p
  where private.has_any_role(array['admin', 'staff', 'coach'])
    and p.id = target_profile_id
    and (
      private.has_any_role(array['super_admin'])
      or p.gym_id = (select gym_id from public.profiles where id = auth.uid())
    )
  limit 1;
$$;

revoke all on function public.lookup_portal_profile_by_id(uuid) from public, anon, authenticated;
revoke all on function public.lookup_portal_profile_by_id(uuid) from anon;
grant execute on function public.lookup_portal_profile_by_id(uuid) to authenticated;

-- =========================================================
-- merge_clients
-- Already validated gym match internally before this rebuild; kept as the
-- reference pattern the other functions in this file follow. Only search_path
-- and fully-qualified names changed.
-- =========================================================

create or replace function public.merge_clients(
  main_client_id uuid,
  duplicate_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
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

  select gym_id into main_gym_id from public.clients where id = main_client_id;
  select gym_id into duplicate_gym_id from public.clients where id = duplicate_client_id;

  if not found or main_gym_id is null then
    raise exception 'Main client not found.';
  end if;

  if duplicate_gym_id is null then
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

  update public.client_routines set client_id = main_client_id where client_id = duplicate_client_id;
  update public.client_checkins set client_id = main_client_id where client_id = duplicate_client_id;
  update public.payments set client_id = main_client_id where client_id = duplicate_client_id;
  update public.client_memberships set client_id = main_client_id where client_id = duplicate_client_id;
  update public.check_ins set client_id = main_client_id where client_id = duplicate_client_id;

  update public.client_onboarding_responses
  set client_id = main_client_id
  where client_id = duplicate_client_id
    and not exists (
      select 1 from public.client_onboarding_responses where client_id = main_client_id
    );

  update public.client_user_links
  set client_id = main_client_id, gym_id = main_gym_id, updated_at = now()
  where client_id = duplicate_client_id
    and not exists (
      select 1 from public.client_user_links where client_id = main_client_id
    );

  delete from public.clients where id = duplicate_client_id;
end;
$$;

revoke all on function public.merge_clients(uuid, uuid) from public, anon, authenticated;
revoke all on function public.merge_clients(uuid, uuid) from anon;
grant execute on function public.merge_clients(uuid, uuid) to authenticated;

-- =========================================================
-- activate_client_routine
-- Previously did not check that the actor's gym matched the client's gym
-- (only role + can_access_client, and can_access_client's staff branch was
-- itself gym-blind before 0003's fix). Now explicit.
-- =========================================================

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
  select gym_id into v_client_gym from public.clients where id = target_client_id;
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
  set status = 'archived', updated_at = timezone('utc', now())
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

revoke all on function public.activate_client_routine(uuid, uuid, text, text, date, date) from public, anon, authenticated;
revoke all on function public.activate_client_routine(uuid, uuid, text, text, date, date) from anon;
grant execute on function public.activate_client_routine(uuid, uuid, text, text, date, date) to authenticated;

-- =========================================================
-- reorder_client_routine_days / reorder_client_routine_exercises
-- SECURITY INVOKER (unchanged): these run with the caller's own privileges,
-- so RLS on client_routine_days/client_routine_exercises already protects
-- them. search_path is still hardened to '' for defense in depth.
-- =========================================================

create or replace function public.reorder_client_routine_days(
  p_routine_id uuid,
  p_day_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_offset integer;
begin
  v_offset := greatest(coalesce(array_length(p_day_ids, 1), 0), 1) + 1000;

  with ordered as (
    select day_id, ordinality::integer as next_index
    from unnest(p_day_ids) with ordinality as t(day_id, ordinality)
  )
  update public.client_routine_days as d
  set day_index = ordered.next_index + v_offset
  from ordered
  where d.id = ordered.day_id
    and d.client_routine_id = p_routine_id;

  with ordered as (
    select day_id, ordinality::integer as next_index
    from unnest(p_day_ids) with ordinality as t(day_id, ordinality)
  )
  update public.client_routine_days as d
  set day_index = ordered.next_index
  from ordered
  where d.id = ordered.day_id
    and d.client_routine_id = p_routine_id;
end;
$$;

revoke all on function public.reorder_client_routine_days(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_client_routine_days(uuid, uuid[]) from anon;
grant execute on function public.reorder_client_routine_days(uuid, uuid[]) to authenticated;

create or replace function public.reorder_client_routine_exercises(
  p_routine_day_id uuid,
  p_exercise_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_offset integer;
begin
  v_offset := greatest(coalesce(array_length(p_exercise_ids, 1), 0), 1) + 1000;

  with ordered as (
    select exercise_id, ordinality::integer as next_index
    from unnest(p_exercise_ids) with ordinality as t(exercise_id, ordinality)
  )
  update public.client_routine_exercises as e
  set sort_order = ordered.next_index + v_offset
  from ordered
  where e.id = ordered.exercise_id
    and e.client_routine_day_id = p_routine_day_id;

  with ordered as (
    select exercise_id, ordinality::integer as next_index
    from unnest(p_exercise_ids) with ordinality as t(exercise_id, ordinality)
  )
  update public.client_routine_exercises as e
  set sort_order = ordered.next_index
  from ordered
  where e.id = ordered.exercise_id
    and e.client_routine_day_id = p_routine_day_id;
end;
$$;

revoke all on function public.reorder_client_routine_exercises(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_client_routine_exercises(uuid, uuid[]) from anon;
grant execute on function public.reorder_client_routine_exercises(uuid, uuid[]) to authenticated;

-- =========================================================
-- get_client_membership_status
-- Column-narrowing RPC: coach and client must see membership status
-- without ever touching payments or membership_plans.price. RLS filters
-- rows, not columns, so a SECURITY DEFINER function is used instead of a
-- view (a plain view owned by a role with BYPASSRLS -- the default for
-- migration-runner roles in Supabase -- would silently bypass RLS on the
-- underlying tables entirely, which is worse than the problem being
-- solved). This mirrors the existing lookup_portal_profile_by_email
-- pattern already used in the app.
-- =========================================================

create or replace function public.get_client_membership_status(target_client_id uuid)
returns table (
  status text,
  end_date date,
  plan_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select cm.status, cm.end_date, mp.name
  from public.client_memberships cm
  join public.membership_plans mp on mp.id = cm.membership_plan_id
  where cm.client_id = target_client_id
    and (
      private.has_gym_role(array['admin', 'staff', 'coach'], cm.gym_id)
      or private.is_linked_client(target_client_id)
    )
  order by cm.end_date desc
  limit 1;
$$;

revoke all on function public.get_client_membership_status(uuid) from public, anon, authenticated;
revoke all on function public.get_client_membership_status(uuid) from anon;
grant execute on function public.get_client_membership_status(uuid) to authenticated;
