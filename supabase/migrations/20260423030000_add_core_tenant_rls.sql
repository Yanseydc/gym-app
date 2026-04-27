-- Add Row Level Security policies for core multi-tenant business tables.
-- super_admin can access all rows.
-- Other authenticated users can only access rows from their own gym.
-- Existing data is not modified.

-- =========================================================
-- clients
-- =========================================================

alter table public.clients enable row level security;

drop policy if exists "clients_select_by_gym" on public.clients;
drop policy if exists "clients_insert_by_gym" on public.clients;
drop policy if exists "clients_update_by_gym" on public.clients;
drop policy if exists "clients_delete_by_gym" on public.clients;

create policy "clients_select_by_gym"
on public.clients
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.clients.gym_id = p.gym_id
      )
  )
);

create policy "clients_insert_by_gym"
on public.clients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.clients.gym_id = p.gym_id
      )
  )
);

create policy "clients_update_by_gym"
on public.clients
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.clients.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.clients.gym_id = p.gym_id
      )
  )
);

create policy "clients_delete_by_gym"
on public.clients
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.clients.gym_id = p.gym_id
      )
  )
);

-- =========================================================
-- membership_plans
-- =========================================================

alter table public.membership_plans enable row level security;

drop policy if exists "membership_plans_select_by_gym" on public.membership_plans;
drop policy if exists "membership_plans_insert_by_gym" on public.membership_plans;
drop policy if exists "membership_plans_update_by_gym" on public.membership_plans;
drop policy if exists "membership_plans_delete_by_gym" on public.membership_plans;

create policy "membership_plans_select_by_gym"
on public.membership_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.membership_plans.gym_id = p.gym_id
      )
  )
);

create policy "membership_plans_insert_by_gym"
on public.membership_plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.membership_plans.gym_id = p.gym_id
      )
  )
);

create policy "membership_plans_update_by_gym"
on public.membership_plans
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.membership_plans.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.membership_plans.gym_id = p.gym_id
      )
  )
);

create policy "membership_plans_delete_by_gym"
on public.membership_plans
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.membership_plans.gym_id = p.gym_id
      )
  )
);

-- =========================================================
-- client_memberships
-- =========================================================

alter table public.client_memberships enable row level security;

drop policy if exists "client_memberships_select_by_gym" on public.client_memberships;
drop policy if exists "client_memberships_insert_by_gym" on public.client_memberships;
drop policy if exists "client_memberships_update_by_gym" on public.client_memberships;
drop policy if exists "client_memberships_delete_by_gym" on public.client_memberships;

create policy "client_memberships_select_by_gym"
on public.client_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_memberships.gym_id = p.gym_id
      )
  )
);

create policy "client_memberships_insert_by_gym"
on public.client_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_memberships.gym_id = p.gym_id
      )
  )
);

create policy "client_memberships_update_by_gym"
on public.client_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_memberships.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_memberships.gym_id = p.gym_id
      )
  )
);

create policy "client_memberships_delete_by_gym"
on public.client_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_memberships.gym_id = p.gym_id
      )
  )
);

-- =========================================================
-- payments
-- =========================================================

alter table public.payments enable row level security;

drop policy if exists "payments_select_by_gym" on public.payments;
drop policy if exists "payments_insert_by_gym" on public.payments;
drop policy if exists "payments_update_by_gym" on public.payments;
drop policy if exists "payments_delete_by_gym" on public.payments;

create policy "payments_select_by_gym"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.payments.gym_id = p.gym_id
      )
  )
);

create policy "payments_insert_by_gym"
on public.payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.payments.gym_id = p.gym_id
      )
  )
);

create policy "payments_update_by_gym"
on public.payments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.payments.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.payments.gym_id = p.gym_id
      )
  )
);

create policy "payments_delete_by_gym"
on public.payments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.payments.gym_id = p.gym_id
      )
  )
);

-- =========================================================
-- client_routines
-- =========================================================

alter table public.client_routines enable row level security;

drop policy if exists "client_routines_select_by_gym" on public.client_routines;
drop policy if exists "client_routines_insert_by_gym" on public.client_routines;
drop policy if exists "client_routines_update_by_gym" on public.client_routines;
drop policy if exists "client_routines_delete_by_gym" on public.client_routines;

create policy "client_routines_select_by_gym"
on public.client_routines
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_routines.gym_id = p.gym_id
      )
  )
);

create policy "client_routines_insert_by_gym"
on public.client_routines
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_routines.gym_id = p.gym_id
      )
  )
);

create policy "client_routines_update_by_gym"
on public.client_routines
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_routines.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_routines.gym_id = p.gym_id
      )
  )
);

create policy "client_routines_delete_by_gym"
on public.client_routines
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_routines.gym_id = p.gym_id
      )
  )
);

-- =========================================================
-- client_checkins
-- =========================================================

alter table public.client_checkins enable row level security;

drop policy if exists "client_checkins_select_by_gym" on public.client_checkins;
drop policy if exists "client_checkins_insert_by_gym" on public.client_checkins;
drop policy if exists "client_checkins_update_by_gym" on public.client_checkins;
drop policy if exists "client_checkins_delete_by_gym" on public.client_checkins;

create policy "client_checkins_select_by_gym"
on public.client_checkins
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_checkins.gym_id = p.gym_id
      )
  )
);

create policy "client_checkins_insert_by_gym"
on public.client_checkins
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_checkins.gym_id = p.gym_id
      )
  )
);

create policy "client_checkins_update_by_gym"
on public.client_checkins
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_checkins.gym_id = p.gym_id
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_checkins.gym_id = p.gym_id
      )
  )
);

create policy "client_checkins_delete_by_gym"
on public.client_checkins
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or public.client_checkins.gym_id = p.gym_id
      )
  )
);
