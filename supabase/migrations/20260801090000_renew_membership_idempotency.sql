-- 0011 renew_membership idempotency
--
-- renewClientMembershipRecord (src/modules/memberships/services/membership-service.ts)
-- currently does its work as 4 sequential PostgREST round-trips from
-- TypeScript, with no idempotency key at all. The renewal dates are fully
-- deterministic (derived from the origin membership's own end_date and its
-- plan's duration), so a retry (double-submit, network retry) recomputes
-- the exact same period and collides with the row the first attempt
-- already created, surfacing a confusing "period conflict" error for an
-- operation that actually already succeeded - the same incident category
-- already fixed for extend_membership and register_membership_payment.
--
-- This migration:
--   1) adds a nullable, self-referencing `renewed_from_membership_id` to
--      client_memberships (null for every historical row and for normal
--      assign_membership_with_payment insertions - read-only production
--      audit confirmed only 5 existing rows, no positional inserts
--      anywhere that a new nullable column could break). ON DELETE RESTRICT:
--      this column is part of the idempotent fingerprint (see below) - an
--      origin membership with renewals must never become deletable in a
--      way that silently orphans the lineage;
--   2) adds public.renew_membership(p_source_membership_id, p_idempotency_key),
--      reusing the existing client_memberships.idempotency_key column and
--      its client_memberships_idempotency_key_key unique constraint -
--      exactly the pattern assign_membership_with_payment already
--      established for INSERT-shaped idempotent operations, rather than
--      the idempotent_operations ledger table (which is for UPDATE-shaped
--      operations like extend_membership).
--
-- No index is added on renewed_from_membership_id: the RPC only ever reads
-- it as part of a row already fetched by the (unique-indexed) idempotency_key,
-- and no UI/validation code in this change queries "all renewals of
-- membership X". Add one later only if such a query is actually introduced.

alter table public.client_memberships
  add column if not exists renewed_from_membership_id uuid references public.client_memberships (id) on delete restrict;

-- Deliberately NOT unique: a cancelled renewal must not block a legitimate
-- second renewal attempt from the same origin membership. The exclusion
-- constraint (client_memberships_no_overlapping_active_periods) remains the
-- authority over occupying periods regardless of how many rows share the
-- same renewed_from_membership_id.

create or replace function public.renew_membership(
  p_source_membership_id uuid,
  p_idempotency_key uuid
)
returns table (
  membership_id uuid,
  status text,
  start_date date,
  end_date date
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing record;
  v_membership record;
  v_duration integer;
  v_today date;
  v_calc_start_date date;
  v_calc_end_date date;
  v_new_id uuid;
  v_constraint_name text;
begin
  if p_idempotency_key is null then
    raise exception 'renew_membership: p_idempotency_key is required';
  end if;

  if p_source_membership_id is null then
    raise exception 'renew_membership: p_source_membership_id is required';
  end if;

  -- Fast path, first attempt: happens before touching the origin
  -- membership's mutable state at all (no read of its status/dates, no
  -- plan lookup, no sibling checks). RLS-scoped, so a key already used by
  -- another gym's renewal is invisible here (see the unique_violation
  -- branch further down for what happens when that invisible row still
  -- collides at the database level).
  --
  -- The ONLY fingerprint comparison is renewed_from_membership_id against
  -- p_source_membership_id - the one real request parameter. client_id,
  -- membership_plan_id and the renewal dates are all server-derived from
  -- the origin row, never request parameters, so they must never be part
  -- of this comparison: if the origin membership's state changed after
  -- this key's original success (a different end_date, a status change, a
  -- new sibling), a retry with the same key must still return the exact
  -- original renewal, not fail or recompute anything. A key that belongs
  -- to a normal assign_membership_with_payment insertion has
  -- renewed_from_membership_id = null, which never equals
  -- p_source_membership_id, so it is correctly rejected as reuse with
  -- different parameters; same for a key that belongs to a renewal of a
  -- different origin membership.
  select cm.id, cm.status, cm.start_date, cm.end_date, cm.renewed_from_membership_id
  into v_existing
  from public.client_memberships cm
  where cm.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.renewed_from_membership_id is distinct from p_source_membership_id then
      raise exception 'renew_membership: idempotency_key reused with different parameters';
    end if;

    return query select v_existing.id, v_existing.status, v_existing.start_date, v_existing.end_date;
    return;
  end if;

  -- New operation: lock the origin membership row before computing
  -- eligibility or dates. This is what serializes two concurrent
  -- renew_membership calls against the SAME origin (different idempotency
  -- keys): whichever call arrives second blocks here until the first
  -- either commits (its INSERT is now visible) or rolls back. This turns
  -- what would otherwise be a genuine INSERT-time race on the
  -- client_memberships_no_overlapping_active_periods exclusion constraint
  -- (which can surface as either 23P01 or, under GiST index contention,
  -- 40P01 deadlock_detected) into a plain sequential check: the second
  -- caller's own pre-check below will see the first caller's now-committed
  -- row and reject with the same stable, friendly overlap message no
  -- concurrent caller ever hits the exclusion constraint directly for this
  -- same-origin case.
  select cm.client_id, cm.membership_plan_id, cm.start_date, cm.end_date, cm.status
  into v_membership
  from public.client_memberships cm
  where cm.id = p_source_membership_id
  for update;

  if not found then
    raise exception 'Membership not found.';
  end if;

  -- Fast path, second attempt (double-checked locking): while this call
  -- was blocked waiting for the lock above, a concurrent call with the
  -- SAME idempotency key may have already completed and committed its
  -- INSERT. Without re-checking here, this call would fall through to the
  -- pre-check below, see that other call's row as an occupying sibling,
  -- and incorrectly reject what is actually a legitimate same-key retry
  -- with a false overlap error instead of returning the original result.
  select cm.id, cm.status, cm.start_date, cm.end_date, cm.renewed_from_membership_id
  into v_existing
  from public.client_memberships cm
  where cm.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.renewed_from_membership_id is distinct from p_source_membership_id then
      raise exception 'renew_membership: idempotency_key reused with different parameters';
    end if;

    return query select v_existing.id, v_existing.status, v_existing.start_date, v_existing.end_date;
    return;
  end if;

  select mp.duration_in_days
  into v_duration
  from public.membership_plans mp
  where mp.id = v_membership.membership_plan_id
    and mp.is_active = true;

  if not found then
    raise exception 'Selected membership plan is not available.';
  end if;

  v_today := (now() at time zone 'America/Tijuana')::date;

  -- Unchanged from the existing TypeScript computation: contiguous the day
  -- after the origin's end_date when it hasn't lapsed yet, otherwise today.
  -- Example verified against the existing "Jesus Dominguez" fixture:
  -- end_date=2026-08-15, duration=30 -> start=2026-08-16, end=2026-09-14.
  v_calc_start_date := case
    when v_membership.end_date >= v_today then v_membership.end_date + 1
    else v_today
  end;
  v_calc_end_date := v_calc_start_date + v_duration - 1;

  -- Eligibility: authoritatively applies canRenewMembership's exact rule
  -- (membership-operations-permissions.ts), not the older, gap-prone
  -- isCurrentActiveMembership check the TypeScript service still uses
  -- today - the same correction already made for extend_membership.
  if v_membership.status = 'cancelled' then
    raise exception 'This membership is cancelled and cannot be renewed.';
  end if;

  if v_membership.start_date > v_today then
    raise exception 'This membership has not started yet.';
  end if;

  if v_membership.end_date >= v_today then
    -- Temporally current: blocked only if a future (non-cancelled) sibling
    -- already exists - the next period was already created.
    if exists (
      select 1
      from public.client_memberships cm2
      where cm2.client_id = v_membership.client_id
        and cm2.id <> p_source_membership_id
        and cm2.status <> 'cancelled'
        and cm2.start_date > v_today
    ) then
      raise exception 'This client already has an upcoming membership.';
    end if;
  else
    -- Expired: blocked only if the client already has another
    -- (non-cancelled) membership that is temporally current right now.
    if exists (
      select 1
      from public.client_memberships cm2
      where cm2.client_id = v_membership.client_id
        and cm2.id <> p_source_membership_id
        and cm2.status <> 'cancelled'
        and cm2.start_date <= v_today
        and cm2.end_date >= v_today
    ) then
      raise exception 'This client already has an active membership.';
    end if;
  end if;

  -- Authoritative overlap pre-check, mirrors overlapsExistingPeriod's exact
  -- semantics (membership-service.ts): inclusive intervals on both ends,
  -- only active/pending_payment/partial siblings occupy their period,
  -- cancelled never blocks, the origin membership itself is excluded. By
  -- construction (the FOR UPDATE lock above), a concurrent renewal of this
  -- SAME origin with a different key can only ever be seen here as either
  -- absent (we won the lock first) or fully committed (we waited for it) -
  -- never in-flight - so this check is what a same-origin race actually
  -- resolves through, not the exclusion constraint. The exclusion
  -- constraint (23P01) remains the last line of defense for any other
  -- concurrent path (e.g. two different origins of the same client).
  if exists (
    select 1
    from public.client_memberships cm2
    where cm2.client_id = v_membership.client_id
      and cm2.id <> p_source_membership_id
      and cm2.status in ('active', 'pending_payment', 'partial')
      and cm2.start_date <= v_calc_end_date
      and v_calc_start_date <= cm2.end_date
  ) then
    raise exception 'This client already has a membership occupying that period.';
  end if;

  begin
    insert into public.client_memberships (
      client_id, membership_plan_id, start_date, end_date, status, notes,
      idempotency_key, renewed_from_membership_id
    ) values (
      v_membership.client_id, v_membership.membership_plan_id, v_calc_start_date, v_calc_end_date,
      'pending_payment', null, p_idempotency_key, p_source_membership_id
    )
    returning id into v_new_id;

  exception when unique_violation then
    -- Only resolve this as an idempotency race if the violated constraint
    -- is actually the idempotency-key one. Any other unique_violation must
    -- propagate as a real error, not be silently swallowed. Kept as
    -- defense-in-depth even though the double-checked lock above already
    -- makes this branch unreachable for a same-origin race - matches the
    -- established assign_membership_with_payment/extend_membership pattern
    -- of never relying on a single layer of protection.
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name <> 'client_memberships_idempotency_key_key' then
      raise;
    end if;

    select cm.id, cm.status, cm.start_date, cm.end_date, cm.renewed_from_membership_id
    into v_existing
    from public.client_memberships cm
    where cm.idempotency_key = p_idempotency_key;

    if not found then
      -- The colliding row is invisible under this caller's RLS (e.g. it
      -- belongs to a different gym) - never resolved as success, never
      -- leaks the other gym's data.
      raise exception 'renew_membership: idempotency key conflict could not be resolved';
    end if;

    if v_existing.renewed_from_membership_id is distinct from p_source_membership_id then
      raise exception 'renew_membership: idempotency_key reused with different parameters';
    end if;

    return query select v_existing.id, v_existing.status, v_existing.start_date, v_existing.end_date;
    return;
  end;

  return query select v_new_id, 'pending_payment'::text, v_calc_start_date, v_calc_end_date;
end;
$$;

revoke all on function public.renew_membership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.renew_membership(uuid, uuid) to authenticated;
