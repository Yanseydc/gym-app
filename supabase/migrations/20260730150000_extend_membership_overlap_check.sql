-- 0010 extend_membership overlap pre-check
-- Fixes a real production incident: extending Jesus Dominguez's current
-- membership (end_date 2026-08-15) by 7 days computed a new end_date of
-- 2026-08-22, which overlaps his already-existing future membership
-- (2026-08-16..2026-09-14, status 'partial') by exactly 7 days - the two
-- periods are contiguous with a zero-day gap. extend_membership's
-- eligibility check (start_date <= today <= end_date, added in
-- 20260730090000) only validates the membership being extended itself; it
-- never checked whether the client has an occupying sibling period the
-- extension would run into. The UPDATE reached the
-- client_memberships_no_overlapping_active_periods exclusion constraint
-- (SQLSTATE 23P01), which correctly rejected it and rolled back the whole
-- transaction (including the idempotent_operations reservation) - but the
-- error was a raw, unmapped Postgres message, so the user only ever saw
-- the generic "No se pudo extender la membresía" fallback.
--
-- This migration only replaces extend_membership's function body (adding
-- an authoritative pre-check before the UPDATE, mirroring
-- renewClientMembershipRecord's own overlapsExistingPeriod pattern) - it
-- does not touch 20260730090000, which is already applied in production.

create or replace function public.extend_membership(
  p_client_membership_id uuid,
  p_days integer,
  p_idempotency_key uuid
)
returns table (
  end_date date,
  status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fingerprint jsonb;
  v_existing_fingerprint jsonb;
  v_existing_result jsonb;
  v_membership record;
  v_today date;
  v_next_end_date date;
  v_result jsonb;
  v_constraint_name text;
begin
  if p_idempotency_key is null then
    raise exception 'extend_membership: p_idempotency_key is required';
  end if;

  if p_client_membership_id is null then
    raise exception 'extend_membership: p_client_membership_id is required';
  end if;

  if p_days is null or p_days <= 0 then
    raise exception 'extend_membership: p_days must be greater than zero';
  end if;

  v_fingerprint := jsonb_build_object('client_membership_id', p_client_membership_id, 'days', p_days);

  -- Authoritative membership read, gym-scoped by RLS. Looked up before the
  -- fast-path check (unchanged from 20260730090000) because the
  -- idempotent_operations uniqueness is scoped by (gym_id, idempotency_key),
  -- so the caller's gym_id is needed to even know which row to look for.
  -- client_id is now also read, needed for the new overlap pre-check below.
  select cm.client_id, cm.start_date, cm.end_date, cm.status, cm.gym_id
  into v_membership
  from public.client_memberships cm
  where cm.id = p_client_membership_id;

  if not found then
    raise exception 'Membership not found.';
  end if;

  -- Fast path: sequential retry (not a concurrent race) with the same key,
  -- scoped to this membership's own gym. Never re-validates membership
  -- state or overlap - a retry must return the exact same result as the
  -- original call, not whatever the current state happens to be now.
  select ido.request_fingerprint, ido.result
  into v_existing_fingerprint, v_existing_result
  from public.idempotent_operations ido
  where ido.gym_id = v_membership.gym_id
    and ido.idempotency_key = p_idempotency_key
    and ido.operation_type = 'extend_membership';

  if found then
    if v_existing_fingerprint <> v_fingerprint then
      raise exception 'extend_membership: idempotency_key reused with different parameters';
    end if;

    return query
    select (v_existing_result ->> 'end_date')::date, v_existing_result ->> 'status';
    return;
  end if;

  if v_membership.status = 'cancelled' then
    raise exception 'Cancelled memberships cannot be extended.';
  end if;

  v_today := (now() at time zone 'America/Tijuana')::date;

  if v_membership.start_date > v_today then
    raise exception 'This membership has not started yet.';
  end if;

  if v_membership.end_date < v_today then
    raise exception 'Expired memberships cannot be extended. Renew instead.';
  end if;

  v_next_end_date := v_membership.end_date + p_days;

  -- New: authoritative overlap pre-check, mirroring
  -- overlapsExistingPeriod's exact semantics (membership-service.ts) -
  -- inclusive intervals on both ends, only active/pending_payment/partial
  -- siblings occupy their period (cancelled never blocks), the membership
  -- being extended itself is excluded. Rejects with a specific, stable
  -- message before ever reaching the UPDATE - the
  -- client_memberships_no_overlapping_active_periods exclusion constraint
  -- remains as the last line of defense for a genuine concurrent race
  -- (e.g. the conflicting future membership is created in the instant
  -- between this check and the UPDATE below), which is a different
  -- SQLSTATE (23P01) that this function deliberately does not catch here -
  -- see membership-service.ts's isMembershipPeriodConflictError, which the
  -- TypeScript layer now uses for that residual case.
  if exists (
    select 1
    from public.client_memberships cm2
    where cm2.client_id = v_membership.client_id
      and cm2.id <> p_client_membership_id
      and cm2.status in ('active', 'pending_payment', 'partial')
      and cm2.start_date <= v_next_end_date
      and v_membership.start_date <= cm2.end_date
  ) then
    raise exception 'This extension would overlap with an upcoming membership.';
  end if;

  v_result := jsonb_build_object('end_date', v_next_end_date, 'status', 'active');

  begin
    insert into public.idempotent_operations (
      idempotency_key, operation_type, entity_id, gym_id, request_fingerprint, result
    ) values (
      p_idempotency_key, 'extend_membership', p_client_membership_id, v_membership.gym_id, v_fingerprint, v_result
    );

  exception when unique_violation then
    -- Only resolve this as an idempotency race if the violated constraint
    -- is actually the (gym_id, idempotency_key) constraint. Any other
    -- unique_violation must propagate as a real error, not be silently
    -- swallowed.
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name <> 'idempotent_operations_gym_idempotency_key' then
      raise;
    end if;

    select ido.request_fingerprint, ido.result
    into v_existing_fingerprint, v_existing_result
    from public.idempotent_operations ido
    where ido.gym_id = v_membership.gym_id
      and ido.idempotency_key = p_idempotency_key
      and ido.operation_type = 'extend_membership';

    if not found then
      raise exception 'extend_membership: idempotency key conflict could not be resolved';
    end if;

    if v_existing_fingerprint <> v_fingerprint then
      raise exception 'extend_membership: idempotency_key reused with different parameters';
    end if;

    return query
    select (v_existing_result ->> 'end_date')::date, v_existing_result ->> 'status';
    return;
  end;

  -- Same transaction as the idempotent_operations insert and the overlap
  -- pre-check above: any error here (including the residual-race
  -- exclusion_violation, or one deliberately injected for testing) rolls
  -- back that insert too - a plpgsql function body is atomic unless it
  -- uses an explicit sub-block exception handler, which this UPDATE does
  -- not.
  update public.client_memberships
  set end_date = v_next_end_date,
      status = 'active',
      updated_at = now()
  where id = p_client_membership_id;

  return query select v_next_end_date, 'active'::text;
end;
$$;

revoke all on function public.extend_membership(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.extend_membership(uuid, integer, uuid) to authenticated;
