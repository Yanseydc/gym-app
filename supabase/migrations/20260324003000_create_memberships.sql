create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_in_days integer not null check (duration_in_days > 0),
  price numeric(10, 2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  membership_plan_id uuid not null references public.membership_plans (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists membership_plans_name_idx on public.membership_plans (name);
create index if not exists client_memberships_client_id_idx on public.client_memberships (client_id);
create index if not exists client_memberships_plan_id_idx on public.client_memberships (membership_plan_id);
create index if not exists client_memberships_status_idx on public.client_memberships (status);

alter table public.membership_plans enable row level security;
alter table public.client_memberships enable row level security;

create policy "membership_plans_select_authenticated"
on public.membership_plans
for select
to authenticated
using (true);

create policy "membership_plans_insert_authenticated"
on public.membership_plans
for insert
to authenticated
with check (true);

create policy "membership_plans_update_authenticated"
on public.membership_plans
for update
to authenticated
using (true)
with check (true);

create policy "client_memberships_select_authenticated"
on public.client_memberships
for select
to authenticated
using (true);

create policy "client_memberships_insert_authenticated"
on public.client_memberships
for insert
to authenticated
with check (true);

create policy "client_memberships_update_authenticated"
on public.client_memberships
for update
to authenticated
using (true)
with check (true);
