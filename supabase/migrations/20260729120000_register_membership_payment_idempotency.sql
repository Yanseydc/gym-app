-- 0008 register_membership_payment idempotency
-- Stage 1 of the membership-operations idempotency plan: payments only.
-- Adds a single RPC that reuses the existing `payments.idempotency_key`
-- unique constraint (added in 20260717090000_membership_payment_lifecycle.sql)
-- with the exact same fast-path / atomic-insert / unique_violation-race
-- pattern already proven by public.assign_membership_with_payment. No new
-- tables or columns. Renew/extend/cancel are explicitly out of scope for
-- this migration.

-- =========================================================
-- public.register_membership_payment
--
-- SECURITY INVOKER: only does a SELECT (membership lookup) and an INSERT
-- into payments that admin/staff already have direct RLS permission for -
-- existing client_memberships_select_by_gym / payments_insert_by_gym
-- policies remain the real authorization boundary, evaluated as whoever
-- calls this, exactly like assign_membership_with_payment.
--
-- Deliberately does NOT re-check "amount <= remaining balance": that rule
-- already lives in private.payments_validate_amount (BEFORE INSERT
-- trigger, takes a row lock on client_memberships before computing the
-- total), which runs on every insert into public.payments regardless of
-- how it was inserted. Duplicating that check here would let the two
-- copies drift; this function only adds idempotency around the insert; it
-- does not touch or weaken that trigger.
-- =========================================================

create or replace function public.register_membership_payment(
  p_client_id uuid,
  p_client_membership_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_idempotency_key uuid
)
returns table (
  payment_id uuid,
  client_membership_id uuid,
  amount numeric,
  total_paid numeric,
  remaining_balance numeric,
  membership_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membership_client_id uuid;
  v_payment_id uuid;
  v_existing_client_id uuid;
  v_existing_membership_id uuid;
  v_existing_amount numeric;
  v_existing_payment_method text;
  v_constraint_name text;
begin
  if p_idempotency_key is null then
    raise exception 'register_membership_payment: p_idempotency_key is required';
  end if;

  if p_client_membership_id is null then
    raise exception 'register_membership_payment: p_client_membership_id is required';
  end if;

  if p_payment_method is null or trim(p_payment_method) = '' then
    raise exception 'register_membership_payment: p_payment_method is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'register_membership_payment: p_amount must be greater than zero';
  end if;

  -- Fast path: sequential retry (not a concurrent race) with the same key.
  -- Every column reference below is qualified (table alias or p_/v_ prefix)
  -- because this function's own OUT parameters are named client_membership_id
  -- and amount, which would otherwise collide with the identically-named
  -- columns on public.payments and make plpgsql raise "ambiguous column".
  select pay.id, pay.client_id, pay.client_membership_id, pay.amount, pay.payment_method
  into v_payment_id, v_existing_client_id, v_existing_membership_id, v_existing_amount, v_existing_payment_method
  from public.payments pay
  where pay.idempotency_key = p_idempotency_key;

  if v_payment_id is not null then
    if v_existing_client_id <> p_client_id
       or v_existing_membership_id <> p_client_membership_id
       or v_existing_amount <> p_amount
       or v_existing_payment_method <> p_payment_method then
      raise exception 'register_membership_payment: idempotency_key reused with different payment parameters';
    end if;

    return query
    select p.id, p.client_membership_id, p.amount,
           coalesce((select sum(pay2.amount) from public.payments pay2 where pay2.client_membership_id = p.client_membership_id), 0),
           greatest(mp.price - coalesce((select sum(pay2.amount) from public.payments pay2 where pay2.client_membership_id = p.client_membership_id), 0), 0),
           cm.status
    from public.payments p
    join public.client_memberships cm on cm.id = p.client_membership_id
    join public.membership_plans mp on mp.id = cm.membership_plan_id
    where p.id = v_payment_id;
    return;
  end if;

  -- Everything that matters is read from the database, never trusted from
  -- the frontend: the membership's own client_id must match p_client_id.
  -- (Same-gym alone is not enough, matching payments_validate_amount's own
  -- reasoning - two different clients of the same gym would both pass a
  -- gym-only check.) RLS filters out memberships outside the caller's gym
  -- before this SELECT ever sees them, so a cross-gym id also lands here
  -- as "not found", not a leaked row.
  select client_id into v_membership_client_id
  from public.client_memberships
  where id = p_client_membership_id;

  if v_membership_client_id is null then
    raise exception 'Selected membership is not available.';
  end if;

  if v_membership_client_id <> p_client_id then
    raise exception 'Selected membership does not belong to the selected client.';
  end if;

  begin
    insert into public.payments (
      client_id, client_membership_id, amount, payment_method, payment_date, concept, idempotency_key
    ) values (
      p_client_id, p_client_membership_id, p_amount, p_payment_method, current_date, 'Pago de membresía', p_idempotency_key
    )
    returning id into v_payment_id;

  exception when unique_violation then
    -- Only resolve this as an idempotency race if the violated constraint
    -- is actually the payments idempotency-key constraint. Any other
    -- unique_violation must propagate as a real error, not be silently
    -- swallowed.
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name <> 'payments_idempotency_key_key' then
      raise;
    end if;

    select pay.id, pay.client_id, pay.client_membership_id, pay.amount, pay.payment_method
    into v_payment_id, v_existing_client_id, v_existing_membership_id, v_existing_amount, v_existing_payment_method
    from public.payments pay
    where pay.idempotency_key = p_idempotency_key;

    if v_payment_id is null then
      raise exception 'register_membership_payment: idempotency key conflict could not be resolved';
    end if;

    if v_existing_client_id <> p_client_id
       or v_existing_membership_id <> p_client_membership_id
       or v_existing_amount <> p_amount
       or v_existing_payment_method <> p_payment_method then
      raise exception 'register_membership_payment: idempotency_key reused with different payment parameters';
    end if;
  end;

  return query
  select p.id, p.client_membership_id, p.amount,
         coalesce((select sum(pay2.amount) from public.payments pay2 where pay2.client_membership_id = p.client_membership_id), 0),
         greatest(mp.price - coalesce((select sum(pay2.amount) from public.payments pay2 where pay2.client_membership_id = p.client_membership_id), 0), 0),
         cm.status
  from public.payments p
  join public.client_memberships cm on cm.id = p.client_membership_id
  join public.membership_plans mp on mp.id = cm.membership_plan_id
  where p.id = v_payment_id;
end;
$$;

revoke all on function public.register_membership_payment(uuid, uuid, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.register_membership_payment(uuid, uuid, numeric, text, uuid) to authenticated;
