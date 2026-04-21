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
set search_path = public
as $$
  select
    profiles.id,
    profiles.email,
    profiles.first_name,
    profiles.last_name,
    profiles.role
  from public.profiles
  where public.has_any_role(array['admin', 'staff', 'coach'])
    and lower(profiles.email) = lower(trim(target_email))
  limit 1;
$$;

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
set search_path = public
as $$
  select
    profiles.id,
    profiles.email,
    profiles.first_name,
    profiles.last_name,
    profiles.role
  from public.profiles
  where public.has_any_role(array['admin', 'staff', 'coach'])
    and profiles.id = target_profile_id
  limit 1;
$$;
