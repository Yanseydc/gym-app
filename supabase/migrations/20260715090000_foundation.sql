-- 0001 foundation
-- Extensions, gyms, profiles, and the generic helper functions/triggers that
-- every later migration depends on.
--
-- Design notes:
-- - profiles.email stays duplicated from auth.users.email on purpose: RLS
--   policies cannot see into the auth schema, so this is the only practical
--   way to filter/search by email under RLS. It is kept in sync exclusively
--   by the service-role admin flow in
--   src/modules/coaching/services/update-portal-access-email.ts (and the
--   invite flow in portal-access-service.ts), never by direct user edits.
--   That flow makes two separate calls (Auth Admin API, then a Postgres
--   UPDATE) that are NOT transactional with each other. If the second call
--   fails after the first succeeds, profiles.email and auth.users.email
--   drift. Compensation/verification strategy while this stays two-phase:
--     1. The service must catch a failure on the profiles UPDATE and
--        attempt to revert the auth.users email change back to the
--        previous value before returning an error to the caller.
--     2. Independently of that best-effort revert, run this reconciliation
--        query periodically (or on demand) to detect drift:
--          select p.id, p.email as profile_email, u.email as auth_email
--          from public.profiles p
--          join auth.users u on u.id = p.id
--          where p.email is distinct from u.email;
--        Any row returned is drift that needs manual correction.
--   An alternative, fully-atomic-at-the-database-level design is an
--   `after update on auth.users` trigger that copies the new email into
--   profiles automatically, removing the need for step 2 above. That
--   trigger is NOT part of this migration -- it touches a schema owned by
--   the platform (auth) and has not been approved as final design. It can
--   be added experimentally in a staging project only, e.g.:
--
--     create or replace function public.sync_profile_email()
--     returns trigger
--     language plpgsql
--     security definer
--     set search_path = ''
--     as $$
--     begin
--       update public.profiles set email = new.email where id = new.id;
--       return new;
--     end;
--     $$;
--
--     create trigger sync_profile_email_trigger
--     after update on auth.users
--     for each row
--     when (old.email is distinct from new.email)
--     execute function public.sync_profile_email();
--
--   Do not enable this in the real project until it has been validated in
--   the disposable/staging project and explicitly approved.

-- RLS filters rows, but only after Postgres has already confirmed the
-- querying role holds the base table-level GRANT for the operation --
-- without it, the request fails with "permission denied for table X"
-- before RLS is ever evaluated. A hosted Supabase project normally gets
-- this wired up once, invisibly, by the platform's project-bootstrap SQL
-- (outside of any migration), which is exactly the kind of undocumented,
-- unversioned dependency this whole rebuild exists to eliminate. So it is
-- declared explicitly here instead of assumed: any table `postgres`
-- creates in `public` from this point on (i.e. every table in all 6
-- migrations, since they all run in the same session) automatically gets
-- SELECT/INSERT/UPDATE/DELETE for authenticated and full access for
-- service_role. anon gets nothing at the table level anywhere in this
-- schema -- this app has no anonymous-facing functionality.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
  grant all on tables to service_role;

create extension if not exists pgcrypto;

-- =========================================================
-- gyms
-- =========================================================

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Tijuana',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gyms enable row level security;

-- =========================================================
-- profiles
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  role text not null default 'client'
    check (role in ('super_admin', 'admin', 'staff', 'coach', 'client')),
  gym_id uuid references public.gyms (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint profiles_gym_required_unless_super_admin
    check (role = 'super_admin' or gym_id is not null)
);

create index profiles_gym_id_idx on public.profiles (gym_id);

alter table public.profiles enable row level security;

-- =========================================================
-- generic trigger helper
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Pure trigger function: Postgres invokes trigger functions internally as
-- part of executing the statement and does not check EXECUTE privilege on
-- them for the triggering role, so no grant is ever needed.
--
-- `revoke ... from public` alone is NOT enough to remove it from
-- PostgREST's callable-RPC surface on a hosted Supabase project -- verified
-- empirically: a hosted project grants EXECUTE to `anon`/`authenticated`
-- directly, by name, on every new function (not just via the PUBLIC
-- pseudo-role), the same way it grants table access by default (see the
-- ALTER DEFAULT PRIVILEGES note above). Revoking only from PUBLIC leaves
-- those named grants untouched, so `anon` remained able to call this via
-- `/rest/v1/rpc/...` even after that revoke -- the local Docker stack does
-- not do this, which is why this only surfaced once tested against a real
-- hosted project. Every function revoke in this codebase now names
-- `anon`/`authenticated` explicitly instead of relying on PUBLIC alone.
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger set_gyms_updated_at
before update on public.gyms
for each row
execute function public.set_updated_at();

-- =========================================================
-- role/gym helper functions
--
-- Both are SECURITY DEFINER because they are called from inside RLS
-- policies evaluated as `authenticated`, and need to read public.profiles
-- regardless of the caller's own row-level visibility into that table.
-- Per the hardening rules agreed for every SECURITY DEFINER function in
-- this project:
--   - search_path is set to '' (empty), forcing every identifier below to
--     be fully schema-qualified, so nothing can be hijacked by a session
--     that manipulates search_path.
--   - EXECUTE is revoked from PUBLIC and anon explicitly, then granted
--     only to the role that actually needs it.
--   - The function performs its own internal auth.uid()/role/gym checks;
--     it does not assume RLS on public.profiles will do that for it,
--     because SECURITY DEFINER functions run with the function owner's
--     privileges and are NOT rewritten by RLS on the tables they touch.
--
-- All four RLS helper functions (has_any_role, has_gym_role here, plus
-- is_linked_client in 0002_core_business.sql and can_access_client in
-- 0003_coaching_functions.sql) live
-- in a dedicated `private` schema instead of `public`. PostgREST only
-- exposes schemas explicitly listed in the project's API configuration
-- (public by default) as callable RPC endpoints -- a function's schema
-- location, not just its GRANTs, determines whether `/rest/v1/rpc/<fn>`
-- can ever reach it. Since `private` is never added to that exposed-schema
-- list, these helpers are unreachable via the REST API by construction,
-- regardless of what EXECUTE grants they carry. RLS policies and other
-- SECURITY DEFINER functions can still call them freely by fully
-- qualifying `private.<fn>(...)`: Postgres resolves cross-schema function
-- calls the same way regardless of whether the schema is API-exposed --
-- exposure is a PostgREST-layer concept, not a SQL-layer one.
--
-- Postgres does not grant USAGE on a newly created schema to PUBLIC by
-- default (that historical default only applies to the `public` schema
-- itself), so `private` starts fully inaccessible to every role until
-- explicitly granted below -- only `authenticated` gets USAGE, never
-- `anon` or PUBLIC.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any (allowed_roles)
  );
$$;

revoke all on function private.has_any_role(text[]) from public, anon, authenticated;
revoke all on function private.has_any_role(text[]) from anon;
grant execute on function private.has_any_role(text[]) to authenticated;

-- Canonical building block for every tenant-scoped policy in this project:
-- true for super_admin unconditionally, true for any of allowed_roles only
-- if the caller's own profile belongs to target_gym_id. This is the fix for
-- the confirmed critical gap where prior policies checked gym_id alone
-- (letting a 'client' role read whole tables of their own gym) or role
-- alone (letting staff of any gym write into another gym's rows).
create or replace function private.has_gym_role(allowed_roles text[], target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (p.role = any (allowed_roles) and p.gym_id = target_gym_id)
      )
  );
$$;

revoke all on function private.has_gym_role(text[], uuid) from public, anon, authenticated;
revoke all on function private.has_gym_role(text[], uuid) from anon;
grant execute on function private.has_gym_role(text[], uuid) to authenticated;

-- =========================================================
-- profiles: RLS policies
-- =========================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Self-service edits are limited to first_name/last_name. role, gym_id and
-- email are managed exclusively by the service-role admin flow.
--
-- A column-level REVOKE alone does NOT achieve this: Postgres stores
-- table-level and column-level privileges separately, and a broad
-- table-level UPDATE grant (which this table already has, via the
-- ALTER DEFAULT PRIVILEGES at the top of this file) still permits
-- updating every column regardless of any column-specific REVOKE layered
-- on top -- the column REVOKE only removes what was granted at the column
-- level, it cannot carve an exception out of a table-wide grant. Verified
-- empirically: with only the column REVOKE, `authenticated` still showed
-- UPDATE on role/gym_id in information_schema.column_privileges, and a
-- real PATCH request only got blocked by the trigger below, not by any
-- grant. The correct fix is to revoke the table-level UPDATE entirely and
-- re-grant it only for the specific columns that should be editable.
revoke update on public.profiles from authenticated, anon;
grant update (first_name, last_name) on public.profiles to authenticated;

-- Defense in depth: blocks role/gym_id changes even if the column grant
-- above is ever restored by mistake in a future migration.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.gym_id is distinct from old.gym_id)
     and auth.role() <> 'service_role' then
    raise exception 'Modifying role or gym_id is not allowed for this session.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;

create trigger prevent_profile_privilege_escalation_trigger
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

-- No insert/delete policy exists for profiles: rows are created exclusively
-- via the service-role admin client (bypasses RLS), matching current app
-- behavior in portal-access-service.ts.

-- =========================================================
-- gyms: RLS policies
-- =========================================================

create policy "gyms_select_own_or_all_for_super_admin"
on public.gyms
for select
to authenticated
using (
  private.has_any_role(array['super_admin'])
  or id = (select gym_id from public.profiles where id = auth.uid())
);

create policy "gyms_insert_super_admin_only"
on public.gyms
for insert
to authenticated
with check (private.has_any_role(array['super_admin']));

create policy "gyms_update_own_or_super_admin"
on public.gyms
for update
to authenticated
using (
  private.has_any_role(array['super_admin'])
  or (
    private.has_any_role(array['admin'])
    and id = (select gym_id from public.profiles where id = auth.uid())
  )
)
with check (
  private.has_any_role(array['super_admin'])
  or (
    private.has_any_role(array['admin'])
    and id = (select gym_id from public.profiles where id = auth.uid())
  )
);

-- admin may update name/timezone but never is_active: (de)activating a gym
-- is a platform-level decision reserved to super_admin.
--
-- Unlike profiles.role/gym_id, this cannot be enforced with a column-level
-- GRANT/REVOKE at all: admin and super_admin are both the same Postgres
-- role (`authenticated`) -- the distinction only exists in profiles.role,
-- which a table/column-level grant has no way to see. Column privileges
-- would have to allow or deny is_active for every authenticated session
-- uniformly, blocking super_admin along with admin. The trigger below is
-- therefore the only mechanism that can express "super_admin yes, admin
-- no", since it reads profiles.role for the specific caller. gyms keeps
-- its full table-wide UPDATE grant from ALTER DEFAULT PRIVILEGES; this
-- trigger is the actual enforcement, not a backstop.

create or replace function public.prevent_gym_deactivation_by_non_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active
     and auth.role() <> 'service_role'
     and not private.has_any_role(array['super_admin']) then
    raise exception 'Only super_admin can activate or deactivate a gym.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_gym_deactivation_by_non_super_admin() from public, anon, authenticated;

create trigger prevent_gym_deactivation_by_non_super_admin_trigger
before update on public.gyms
for each row
execute function public.prevent_gym_deactivation_by_non_super_admin();

-- No delete policy: physical deletion of a gym is intentionally unavailable
-- through the application. Deactivation is is_active = false.

-- Hosted Supabase projects apply their own platform-level default
-- privileges (verified empirically: db diff against a fresh hosted
-- project proposed granting anon full table access on every table here,
-- which the local Docker stack never does) -- our own ALTER DEFAULT
-- PRIVILEGES above cannot override a different role's default-privilege
-- rule, so the only reliable fix is an explicit REVOKE, repeated at the
-- end of every migration that creates tables. This app has no
-- anon-facing functionality anywhere: no policy in any migration is ever
-- `to anon`, so this is a hard close, not a behavior change.
revoke all on table public.gyms, public.profiles from anon;
