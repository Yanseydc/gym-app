-- 0007 membership payment lifecycle
-- Combined "assign membership + register payment" RPC, plus the shared
-- payment/status machinery it and the standalone payment-registration flow
-- both rely on.
--
-- Everything that must not be publicly callable lives in `private` (not
-- exposed by PostgREST, matching the convention from 0001/0003). The only
-- new function in `public` is assign_membership_with_payment, the single
-- entry point meant to be called via /rest/v1/rpc/.

-- =========================================================
-- Extension (idempotent -- already installed by 0002_core_business.sql)
-- =========================================================

create extension if not exists btree_gist with schema extensions;

-- =========================================================
-- Idempotency columns
-- =========================================================

alter table public.client_memberships add column if not exists idempotency_key uuid;
alter table public.client_memberships
  add constraint client_memberships_idempotency_key_key unique (idempotency_key);

alter table public.payments add column if not exists idempotency_key uuid;
alter table public.payments
  add constraint payments_idempotency_key_key unique (idempotency_key);

-- =========================================================
-- membership_period: genuinely immutable (date arithmetic has no timezone
-- dependency, unlike the timestamptz case in check_ins), so a real
-- GENERATED ALWAYS ... STORED column is the correct tool here -- no
-- trigger, no workaround.
-- =========================================================

alter table public.client_memberships
  add column if not exists membership_period daterange
  generated always as (daterange(start_date, end_date, '[]')) stored;

-- end_date >= start_date is already enforced by the original table check
-- constraint from 0002_core_business.sql -- confirmed, not re-added here.

-- =========================================================
-- Preflight: fail loudly and clearly if any existing data would violate
-- the exclusion constraint below, instead of a cryptic constraint-add
-- error. active/pending_payment/partial all occupy their period;
-- cancelled/expired do not (expired is never actually stored -- see the
-- design note on client_memberships_sync_payment_status below).
-- =========================================================

do $$
declare
  v_conflict_count integer;
begin
  select count(*) into v_conflict_count
  from public.client_memberships cm1
  join public.client_memberships cm2
    on cm1.client_id = cm2.client_id and cm1.id < cm2.id
  where cm1.status in ('active', 'pending_payment', 'partial')
    and cm2.status in ('active', 'pending_payment', 'partial')
    and daterange(cm1.start_date, cm1.end_date, '[]') && daterange(cm2.start_date, cm2.end_date, '[]');

  if v_conflict_count > 0 then
    raise exception
      'membership_payment_lifecycle: % pair(s) of overlapping active/pending_payment/partial memberships found -- resolve manually before this migration can add the exclusion constraint',
      v_conflict_count;
  end if;
end;
$$;

alter table public.client_memberships
  add constraint client_memberships_no_overlapping_active_periods
  exclude using gist (
    client_id with =,
    membership_period with &&
  ) where (status in ('active', 'pending_payment', 'partial'));

-- =========================================================
-- private.get_membership_payment_totals
-- Single source of truth for "price vs. total paid so far" -- used by
-- both the validation trigger and the status-sync trigger below, so the
-- active/partial/pending_payment threshold can never diverge between the
-- two.
-- =========================================================

create or replace function private.get_membership_payment_totals(
  p_membership_id uuid,
  p_exclude_payment_id uuid default null
)
returns table (price numeric, total_paid numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    mp.price,
    coalesce((
      select sum(pay.amount)
      from public.payments pay
      where pay.client_membership_id = p_membership_id
        and (p_exclude_payment_id is null or pay.id <> p_exclude_payment_id)
    ), 0) as total_paid
  from public.client_memberships cm
  join public.membership_plans mp on mp.id = cm.membership_plan_id
  where cm.id = p_membership_id;
$$;

revoke all on function private.get_membership_payment_totals(uuid, uuid) from public, anon, authenticated;

-- =========================================================
-- private.recompute_membership_payment_status
-- =========================================================

create or replace function private.recompute_membership_payment_status(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric;
  v_total_paid numeric;
begin
  if p_membership_id is null then
    return;
  end if;

  select price, total_paid into v_price, v_total_paid
  from private.get_membership_payment_totals(p_membership_id);

  if v_price is null then
    return;
  end if;

  -- expired is never written by application code -- it is always derived
  -- at read time in TypeScript (resolveMembershipStatus) by comparing
  -- end_date against the current date. This function only ever needs to
  -- guard against reactivating a cancelled membership.
  update public.client_memberships
  set status = case
        when v_total_paid >= v_price then 'active'
        when v_total_paid > 0 then 'partial'
        else 'pending_payment'
      end,
      updated_at = now()
  where id = p_membership_id
    and status <> 'cancelled';
end;
$$;

revoke all on function private.recompute_membership_payment_status(uuid) from public, anon, authenticated;

-- =========================================================
-- private.payments_validate_amount (BEFORE trigger)
--
-- Takes a pessimistic row lock on the affected client_memberships row(s)
-- BEFORE computing any total: without this, two concurrent payments
-- against the same membership can both read the same "total paid so
-- far", both pass validation, and together overpay it. When an UPDATE
-- moves a payment between two memberships, both rows are locked in
-- ascending id order (never "old then new") so that two concurrent
-- opposite-direction moves between the same pair of memberships
-- serialize instead of deadlocking.
--
-- Also validates payments.client_id against the membership's own
-- client_id -- same-gym is not enough, since two different clients of
-- the same gym would both pass a gym-only check.
-- =========================================================

create or replace function private.payments_validate_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric;
  v_client_id uuid;
  v_total_paid numeric;
  v_old_membership_id uuid;
  v_new_membership_id uuid;
begin
  if new.client_membership_id is null then
    return new;
  end if;

  v_new_membership_id := new.client_membership_id;
  v_old_membership_id := case
    when tg_op = 'UPDATE'
         and old.client_membership_id is not null
         and old.client_membership_id is distinct from new.client_membership_id
    then old.client_membership_id
    else null
  end;

  if v_old_membership_id is not null then
    if v_old_membership_id < v_new_membership_id then
      perform id from public.client_memberships where id = v_old_membership_id for update;
      perform id from public.client_memberships where id = v_new_membership_id for update;
    else
      perform id from public.client_memberships where id = v_new_membership_id for update;
      perform id from public.client_memberships where id = v_old_membership_id for update;
    end if;
  else
    perform id from public.client_memberships where id = v_new_membership_id for update;
  end if;

  select cm.client_id, mp.price
  into v_client_id, v_price
  from public.client_memberships cm
  join public.membership_plans mp on mp.id = cm.membership_plan_id
  where cm.id = v_new_membership_id;

  if v_price is null then
    raise exception 'payments: client_membership_id % not found', v_new_membership_id;
  end if;

  if v_client_id <> new.client_id then
    raise exception 'payments: client_id % does not match client_membership %''s client %',
      new.client_id, v_new_membership_id, v_client_id;
  end if;

  select total_paid into v_total_paid
  from private.get_membership_payment_totals(
    v_new_membership_id,
    case when tg_op = 'UPDATE' then old.id else null end
  );

  if new.amount > greatest(v_price - v_total_paid, 0) then
    raise exception 'payments: amount % exceeds remaining balance % for membership %',
      new.amount, greatest(v_price - v_total_paid, 0), v_new_membership_id;
  end if;

  return new;
end;
$$;

revoke all on function private.payments_validate_amount() from public, anon, authenticated;

drop trigger if exists payments_validate_amount_trigger on public.payments;
create trigger payments_validate_amount_trigger
before insert or update on public.payments
for each row
execute function private.payments_validate_amount();

-- =========================================================
-- private.client_memberships_sync_payment_status (AFTER trigger)
--
-- TG_OP handled explicitly (no coalesce(NEW, OLD) branching): INSERT
-- recomputes NEW, DELETE recomputes OLD, UPDATE recomputes NEW and also
-- OLD when client_membership_id changed. Runs after payments_validate_amount
-- in the same transaction, so it reuses the row lock already taken there --
-- no separate FOR UPDATE needed here.
-- =========================================================

create or replace function private.client_memberships_sync_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.recompute_membership_payment_status(new.client_membership_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform private.recompute_membership_payment_status(old.client_membership_id);
    return old;
  elsif tg_op = 'UPDATE' then
    perform private.recompute_membership_payment_status(new.client_membership_id);
    if new.client_membership_id is distinct from old.client_membership_id then
      perform private.recompute_membership_payment_status(old.client_membership_id);
    end if;
    return new;
  end if;

  return null;
end;
$$;

revoke all on function private.client_memberships_sync_payment_status() from public, anon, authenticated;

drop trigger if exists client_memberships_sync_payment_status_trigger on public.payments;
create trigger client_memberships_sync_payment_status_trigger
after insert or update or delete on public.payments
for each row
execute function private.client_memberships_sync_payment_status();

-- =========================================================
-- public.assign_membership_with_payment
--
-- The only new function exposed as an RPC. SECURITY INVOKER: it only does
-- INSERTs that admin/staff already have direct RLS permission for, so it
-- does not need to bypass anything -- existing client_memberships/payments
-- policies remain the real authorization boundary, evaluated as whoever
-- calls this.
-- =========================================================

create or replace function public.assign_membership_with_payment(
  p_client_id uuid,
  p_membership_plan_id uuid,
  p_start_date date,
  p_notes text,
  p_payment_method text,
  p_amount numeric,
  p_idempotency_key uuid
)
returns table (
  membership_id uuid,
  payment_id uuid,
  status text,
  amount_paid numeric,
  total_paid numeric,
  remaining_balance numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_client_gym uuid;
  v_plan_gym uuid;
  v_price numeric;
  v_duration integer;
  v_is_active boolean;
  v_end_date date;
  v_notes text;
  v_membership_id uuid;
  v_payment_id uuid;
  v_existing_client_id uuid;
  v_existing_plan_id uuid;
  v_existing_start_date date;
  v_existing_amount numeric;
  v_existing_payment_method text;
  v_constraint_name text;
begin
  if p_idempotency_key is null then
    raise exception 'assign_membership_with_payment: p_idempotency_key is required';
  end if;

  if p_start_date is null then
    raise exception 'assign_membership_with_payment: p_start_date is required';
  end if;

  if p_payment_method is null or trim(p_payment_method) = '' then
    raise exception 'assign_membership_with_payment: p_payment_method is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'assign_membership_with_payment: p_amount must be greater than zero';
  end if;

  -- Fast path: sequential retry (not a concurrent race) with the same key.
  select id, client_id, membership_plan_id, start_date
  into v_membership_id, v_existing_client_id, v_existing_plan_id, v_existing_start_date
  from public.client_memberships
  where idempotency_key = p_idempotency_key;

  if v_membership_id is not null then
    if v_existing_client_id <> p_client_id
       or v_existing_plan_id <> p_membership_plan_id
       or v_existing_start_date <> p_start_date then
      raise exception 'assign_membership_with_payment: idempotency_key reused with different membership parameters';
    end if;

    select id, amount, payment_method
    into v_payment_id, v_existing_amount, v_existing_payment_method
    from public.payments
    where idempotency_key = p_idempotency_key;

    if v_payment_id is null or v_existing_amount <> p_amount or v_existing_payment_method <> p_payment_method then
      raise exception 'assign_membership_with_payment: idempotency_key reused with different payment parameters';
    end if;

    return query
    select cm.id, v_payment_id, cm.status, v_existing_amount,
           coalesce((select sum(amount) from public.payments where client_membership_id = cm.id), 0),
           greatest(mp.price - coalesce((select sum(amount) from public.payments where client_membership_id = cm.id), 0), 0)
    from public.client_memberships cm
    join public.membership_plans mp on mp.id = cm.membership_plan_id
    where cm.id = v_membership_id;
    return;
  end if;

  -- Everything that matters is read from the database, never trusted from
  -- the frontend: client's gym, plan's price/duration/active flag/gym.
  select gym_id into v_client_gym from public.clients where id = p_client_id;
  if v_client_gym is null then
    raise exception 'Client not found or not accessible.';
  end if;

  select price, duration_in_days, is_active, gym_id
  into v_price, v_duration, v_is_active, v_plan_gym
  from public.membership_plans
  where id = p_membership_plan_id;

  if v_plan_gym is null then
    raise exception 'Selected membership plan is not available.';
  end if;

  if v_price is null or v_price <= 0 then
    raise exception 'assign_membership_with_payment: plan price is invalid';
  end if;

  if v_duration is null or v_duration <= 0 then
    raise exception 'assign_membership_with_payment: plan duration is invalid';
  end if;

  if not v_is_active then
    raise exception 'Selected membership plan is not available.';
  end if;

  if v_plan_gym <> v_client_gym then
    raise exception 'Client and membership plan belong to different gyms.';
  end if;

  if p_amount > v_price then
    raise exception 'Payment amount exceeds the plan price.';
  end if;

  v_end_date := p_start_date + v_duration - 1;
  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if exists (
    select 1 from public.client_memberships cm
    where cm.client_id = p_client_id
      and cm.status in ('active', 'pending_payment', 'partial')
      and daterange(cm.start_date, cm.end_date, '[]') && daterange(p_start_date, v_end_date, '[]')
  ) then
    raise exception 'This client already has a membership occupying that period.';
  end if;

  begin
    insert into public.client_memberships (
      client_id, membership_plan_id, start_date, end_date, notes, idempotency_key
    ) values (
      p_client_id, p_membership_plan_id, p_start_date, v_end_date, v_notes, p_idempotency_key
    )
    returning id into v_membership_id;

    -- payment_date is always today, never p_start_date: the membership can
    -- start on a future/past date while the cash is handed over now.
    insert into public.payments (
      client_id, client_membership_id, amount, payment_method, payment_date, concept, idempotency_key
    ) values (
      p_client_id, v_membership_id, p_amount, p_payment_method, current_date, 'Pago inicial de membresía', p_idempotency_key
    )
    returning id into v_payment_id;

  exception when unique_violation then
    -- Only resolve this as an idempotency race if the violated constraint
    -- is actually one of the two idempotency-key constraints. Any other
    -- unique_violation (e.g. a future, unrelated constraint on either
    -- table) must propagate as a real error, not be silently swallowed.
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name not in ('client_memberships_idempotency_key_key', 'payments_idempotency_key_key') then
      raise;
    end if;

    select id, client_id, membership_plan_id, start_date
    into v_membership_id, v_existing_client_id, v_existing_plan_id, v_existing_start_date
    from public.client_memberships
    where idempotency_key = p_idempotency_key;

    if v_membership_id is null then
      raise exception 'assign_membership_with_payment: idempotency key conflict could not be resolved';
    end if;

    if v_existing_client_id <> p_client_id
       or v_existing_plan_id <> p_membership_plan_id
       or v_existing_start_date <> p_start_date then
      raise exception 'assign_membership_with_payment: idempotency_key reused with different membership parameters';
    end if;

    select id, amount, payment_method
    into v_payment_id, v_existing_amount, v_existing_payment_method
    from public.payments
    where idempotency_key = p_idempotency_key;

    if v_payment_id is null or v_existing_amount <> p_amount or v_existing_payment_method <> p_payment_method then
      raise exception 'assign_membership_with_payment: idempotency_key reused with different payment parameters';
    end if;
  end;

  return query
  select cm.id, v_payment_id, cm.status, p_amount,
         coalesce((select sum(amount) from public.payments where client_membership_id = cm.id), 0),
         greatest(mp.price - coalesce((select sum(amount) from public.payments where client_membership_id = cm.id), 0), 0)
  from public.client_memberships cm
  join public.membership_plans mp on mp.id = cm.membership_plan_id
  where cm.id = v_membership_id;
end;
$$;

revoke all on function public.assign_membership_with_payment(uuid, uuid, date, text, text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.assign_membership_with_payment(uuid, uuid, date, text, text, numeric, uuid) to authenticated;
