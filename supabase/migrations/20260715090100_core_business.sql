-- 0002 core business
-- clients (+ client_user_links, its identity/portal-access companion),
-- membership_plans, client_memberships, payments, check_ins.
--
-- Every tenant-scoped SELECT/INSERT/UPDATE/DELETE policy below uses
-- has_gym_role(allowed_roles, gym_id), never a bare gym_id match. A bare
-- `table.gym_id = profiles.gym_id` check (as previously deployed) is
-- satisfied by ANY role in that gym, including 'client' -- letting a
-- portal user read the whole gym's clients/payments/memberships. That is
-- the confirmed critical gap this migration closes at the source.
--
-- gym_id on every table below is never trusted from the request payload:
-- a BEFORE INSERT/UPDATE trigger derives and/or cross-validates it from
-- the related entities, raising an exception on any real inconsistency
-- instead of silently picking a value to hide it.

-- =========================================================
-- clients
-- =========================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_last_name_idx on public.clients (last_name);
create index clients_first_name_idx on public.clients (first_name);
create index clients_gym_id_idx on public.clients (gym_id);

-- Case-insensitive, trimmed email uniqueness per gym. Null/empty emails
-- are ignored.
create unique index clients_email_gym_unique
on public.clients (lower(trim(email)), gym_id)
where email is not null and trim(email) <> '';

alter table public.clients enable row level security;

create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

-- =========================================================
-- client_user_links
--
-- Moved here (was originally planned for the coaching-functions migration)
-- because clients_select_by_gym below needs is_linked_client() to exist,
-- and is_linked_client() needs this table to exist. Conceptually this
-- table is about client identity/portal access, not about the coaching
-- module -- it does not belong to, and nothing here depends on, anything
-- coaching-specific. client_user_links' own policies only need
-- has_gym_role (already defined in 0001_foundation.sql), so nothing here
-- creates a forward dependency of its own.
-- =========================================================

create table public.client_user_links (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  portal_invite_last_sent_at timestamptz,
  portal_invite_send_count_today integer not null default 0,
  portal_invite_send_count_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id),
  -- FUTURE DECISION (not resolved by this migration): this unique(profile_id)
  -- assumes one profile can only ever be linked to a single client, which
  -- also means a single gym. If a person is ever expected to be a member of
  -- more than one gym under the same account, this constraint and the 1:1
  -- profile<->client model both need to be revisited together.
  unique (profile_id)
);

create index client_user_links_client_id_idx on public.client_user_links (client_id);
create index client_user_links_profile_id_idx on public.client_user_links (profile_id);
create index client_user_links_gym_id_idx on public.client_user_links (gym_id);
create index client_user_links_portal_invite_last_sent_at_idx
  on public.client_user_links (portal_invite_last_sent_at);

alter table public.client_user_links enable row level security;

create trigger set_client_user_links_updated_at
before update on public.client_user_links
for each row
execute function public.set_updated_at();

-- gym_id is always derived from client_id, never trusted from the request.
create or replace function public.client_user_links_derive_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'client_user_links: client_id % not found', new.client_id;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.client_user_links_derive_gym() from public, anon, authenticated;

create trigger client_user_links_derive_gym_trigger
before insert or update on public.client_user_links
for each row
execute function public.client_user_links_derive_gym();

create policy "client_user_links_select_by_gym_or_self"
on public.client_user_links
for select
to authenticated
using (
  profile_id = auth.uid()
  or private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
);

create policy "client_user_links_insert_by_gym"
on public.client_user_links
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "client_user_links_update_by_gym"
on public.client_user_links
for update
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id))
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "client_user_links_delete_by_gym"
on public.client_user_links
for delete
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

-- is_linked_client lives here (not in 0003_coaching_functions.sql) purely
-- because of this dependency: clients_select_by_gym below needs it, and it
-- needs client_user_links above. can_access_client (which composes
-- has_gym_role + is_linked_client for the coaching module) stays in
-- 0003_coaching_functions.sql, since nothing before 0004_coaching_tables.sql
-- needs it.
create or replace function private.is_linked_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_user_links
    where client_id = target_client_id
      and profile_id = auth.uid()
  );
$$;

revoke all on function private.is_linked_client(uuid) from public, anon, authenticated;
revoke all on function private.is_linked_client(uuid) from anon;
grant execute on function private.is_linked_client(uuid) to authenticated;

-- =========================================================
-- clients: RLS policies (completed here, now that is_linked_client exists)
-- =========================================================

create policy "clients_select_by_gym"
on public.clients
for select
to authenticated
using (
  private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
  or private.is_linked_client(id)
);

create policy "clients_insert_by_gym"
on public.clients
for insert
to authenticated
with check (
  private.has_gym_role(array['admin', 'staff'], gym_id)
);

create policy "clients_update_by_gym"
on public.clients
for update
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id))
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

-- No delete policy: physical deletion of a client is not exposed through
-- RLS to admin/staff. The normal deactivation path is status = 'inactive'.
-- The only physical delete path is merge_clients() (SECURITY DEFINER,
-- bypasses RLS), defined in 0005_rpcs.sql.

-- =========================================================
-- membership_plans
-- =========================================================

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  name text not null,
  duration_in_days integer not null check (duration_in_days > 0),
  price numeric(10, 2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index membership_plans_name_idx on public.membership_plans (name);
create index membership_plans_gym_id_idx on public.membership_plans (gym_id);

alter table public.membership_plans enable row level security;

create trigger set_membership_plans_updated_at
before update on public.membership_plans
for each row
execute function public.set_updated_at();

-- staff can read the catalog (needed to assign plans) but only admin
-- manages pricing.
create policy "membership_plans_select_by_gym"
on public.membership_plans
for select
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "membership_plans_insert_by_gym"
on public.membership_plans
for insert
to authenticated
with check (private.has_gym_role(array['admin'], gym_id));

create policy "membership_plans_update_by_gym"
on public.membership_plans
for update
to authenticated
using (private.has_gym_role(array['admin'], gym_id))
with check (private.has_gym_role(array['admin'], gym_id));

create policy "membership_plans_delete_by_gym"
on public.membership_plans
for delete
to authenticated
using (private.has_gym_role(array['admin'], gym_id));

-- =========================================================
-- client_memberships
-- =========================================================

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  membership_plan_id uuid not null references public.membership_plans (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending_payment'
    check (status in ('active', 'expired', 'cancelled', 'pending_payment', 'partial')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index client_memberships_client_id_idx on public.client_memberships (client_id);
create index client_memberships_plan_id_idx on public.client_memberships (membership_plan_id);
create index client_memberships_status_idx on public.client_memberships (status);
create index client_memberships_gym_id_idx on public.client_memberships (gym_id);

alter table public.client_memberships enable row level security;

create trigger set_client_memberships_updated_at
before update on public.client_memberships
for each row
execute function public.set_updated_at();

-- gym_id is always derived from client_id, never trusted from the request.
-- If membership_plan_id points to a plan in a different gym than the
-- client, that is a genuine inconsistency -- raise, do not silently pick one.
create or replace function public.client_memberships_validate_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
  v_plan_gym uuid;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'client_memberships: client_id % not found', new.client_id;
  end if;

  select gym_id into v_plan_gym from public.membership_plans where id = new.membership_plan_id;
  if v_plan_gym is null then
    raise exception 'client_memberships: membership_plan_id % not found', new.membership_plan_id;
  end if;

  if v_client_gym <> v_plan_gym then
    raise exception
      'client_memberships: client and membership_plan belong to different gyms (client_gym=%, plan_gym=%)',
      v_client_gym, v_plan_gym;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.client_memberships_validate_gym() from public, anon, authenticated;

create trigger client_memberships_validate_gym_trigger
before insert or update on public.client_memberships
for each row
execute function public.client_memberships_validate_gym();

-- Single access strategy for this table: only admin/staff get direct row
-- access. coach and client never get a SELECT policy here -- both must go
-- through get_client_membership_status() (0005_rpcs.sql), which returns
-- only status/end_date/plan_name and never notes, dates, or the raw
-- membership_plan_id/price. This is deliberate: no "SELECT or RPC" split
-- by role, one narrow path for anyone who isn't admin/staff.
create policy "client_memberships_select_by_gym"
on public.client_memberships
for select
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "client_memberships_insert_by_gym"
on public.client_memberships
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "client_memberships_update_by_gym"
on public.client_memberships
for update
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id))
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "client_memberships_delete_by_gym"
on public.client_memberships
for delete
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

-- =========================================================
-- payments
-- =========================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  client_membership_id uuid references public.client_memberships (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'card')),
  payment_date date not null,
  concept text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_client_id_idx on public.payments (client_id);
create index payments_membership_id_idx on public.payments (client_membership_id);
create index payments_payment_date_idx on public.payments (payment_date desc);
create index payments_gym_id_idx on public.payments (gym_id);

alter table public.payments enable row level security;

create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create or replace function public.payments_validate_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
  v_membership_gym uuid;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'payments: client_id % not found', new.client_id;
  end if;

  if new.client_membership_id is not null then
    select gym_id into v_membership_gym
    from public.client_memberships
    where id = new.client_membership_id;

    if v_membership_gym is null then
      raise exception 'payments: client_membership_id % not found', new.client_membership_id;
    end if;

    if v_membership_gym <> v_client_gym then
      raise exception
        'payments: client and client_membership belong to different gyms (client_gym=%, membership_gym=%)',
        v_client_gym, v_membership_gym;
    end if;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.payments_validate_gym() from public, anon, authenticated;

create trigger payments_validate_gym_trigger
before insert or update on public.payments
for each row
execute function public.payments_validate_gym();

-- Financial data: coach and client have zero access, no policy for them.
create policy "payments_select_by_gym"
on public.payments
for select
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "payments_insert_by_gym"
on public.payments
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "payments_update_by_gym"
on public.payments
for update
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id))
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "payments_delete_by_gym"
on public.payments
for delete
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

-- =========================================================
-- check_ins (front-desk attendance log)
-- =========================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Duplicate-check strategy: the original design used a BEFORE INSERT
-- trigger doing `select exists(... checked_in_at between new.checked_in_at
-- - 5 minutes and new.checked_in_at ...)`. That is a check-then-insert
-- pattern: two concurrent transactions can both run the check before
-- either commits and both pass, producing two check-ins inside the same
-- 5-minute window (a realistic case: an NFC/QR scanner double-tap firing
-- two near-simultaneous inserts).
--
-- A first attempt at fixing this wrapped `checked_in_at + interval '5
-- minutes'` in a function declared IMMUTABLE so it could be used in a
-- functional EXCLUDE index. That was rejected on review: `timestamptz +
-- interval` is genuinely STABLE for the general operator (it depends on
-- calendar/timezone rules when the interval carries month/day components),
-- and declaring IMMUTABLE was a promise Postgres cannot verify -- a future
-- edit introducing a calendar-dependent interval would silently corrupt
-- the index with no error at all.
--
-- Instead: check_in_window is a real, stored column, computed once by a
-- plain (non-immutable) BEFORE INSERT OR UPDATE trigger, and the EXCLUDE
-- constraint indexes that stored value directly -- no function volatility
-- claim involved anywhere. The anti-race-condition guarantee is unchanged:
-- the EXCLUDE constraint is still enforced atomically at the index level
-- during the write itself, not as a separate check-then-insert step.
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  check_in_window tstzrange not null,
  notes text,
  created_at timestamptz not null default now()
);

create index check_ins_client_id_idx on public.check_ins (client_id);
create index check_ins_checked_in_at_idx on public.check_ins (checked_in_at desc);
create index check_ins_gym_id_idx on public.check_ins (gym_id);

create or replace function public.check_ins_set_window()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.check_in_window := tstzrange(new.checked_in_at, new.checked_in_at + interval '5 minutes');
  return new;
end;
$$;

revoke all on function public.check_ins_set_window() from public, anon, authenticated;

create trigger check_ins_set_window_trigger
before insert or update on public.check_ins
for each row
execute function public.check_ins_set_window();

-- Behavior note: this enforces a SYMMETRIC +/-5 minute window (no other
-- check-in starts within 5 minutes on either side), whereas the original
-- trigger only looked backward. This is an intentional tightening -- confirm
-- if the backward-only semantics must be preserved exactly instead.
-- Boundary tested empirically: +4:59 is rejected, exactly +5:00 is allowed,
-- +5:01 is allowed (range is [checked_in_at, checked_in_at + 5min), i.e.
-- inclusive lower bound, exclusive upper bound per row).
alter table public.check_ins
add constraint check_ins_no_duplicates_5min
exclude using gist (
  client_id with =,
  check_in_window with &&
);

alter table public.check_ins enable row level security;

-- gym_id is always derived from client_id, never trusted from the request.
create or replace function public.check_ins_derive_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'check_ins: client_id % not found', new.client_id;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.check_ins_derive_gym() from public, anon, authenticated;

create trigger check_ins_derive_gym_trigger
before insert on public.check_ins
for each row
execute function public.check_ins_derive_gym();

create policy "check_ins_select_by_gym"
on public.check_ins
for select
to authenticated
using (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

create policy "check_ins_insert_by_gym"
on public.check_ins
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

-- No update/delete policy: the attendance log is treated as immutable.
-- Revisit if a correction workflow is ever required.

-- See the matching note in 0001_foundation.sql: hosted Supabase projects
-- grant anon table-level access by default that the local Docker stack
-- does not, so this is repeated for every table this migration creates.
revoke all on table
  public.clients, public.client_user_links, public.membership_plans,
  public.client_memberships, public.payments, public.check_ins
from anon;
