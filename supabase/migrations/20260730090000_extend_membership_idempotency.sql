-- 0009 extend_membership idempotency
-- Stage 2 of the membership-operations idempotency plan: "Extender
-- membresía" only. Renew and cancel are explicitly out of scope.
--
-- Unlike register_membership_payment (Stage 1), extending a membership is
-- an UPDATE to an existing row, not an INSERT of a new one - there is no
-- new row to stamp with a unique idempotency_key the way payments/
-- client_memberships already do. This migration introduces the generic
-- ledger table proposed in the Stage 0 diagnosis for exactly this class of
-- operation: idempotent_operations records the reservation and the result
-- to return on retry, keyed by the same idempotency_key pattern already
-- proven for payments.

-- =========================================================
-- idempotent_operations
-- =========================================================

create table public.idempotent_operations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  operation_type text not null,
  entity_id uuid not null,
  gym_id uuid not null references public.gyms (id) on delete restrict,
  request_fingerprint jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  -- Scoped per gym, not global: two different gyms independently
  -- generating the exact same random UUID (astronomically unlikely, but
  -- not impossible) must never block one gym's legitimate operation just
  -- because another gym already used that key. Real concurrent-request
  -- races always share a gym (the caller can only ever act within their
  -- own gym, enforced by RLS below), so this is still a genuine unique
  -- constraint for the only case that matters.
  constraint idempotent_operations_gym_idempotency_key unique (gym_id, idempotency_key)
);

alter table public.idempotent_operations enable row level security;

-- Same isolation strategy as every other tenant-scoped table in this
-- project (private.has_gym_role, never a bare gym_id match) - see
-- 20260715090000_foundation.sql for the canonical rationale. Insert-only
-- ledger: no update/delete policy, matching payments' immutability. No
-- retention/cleanup job yet - see the note at the bottom of this file.
create policy "idempotent_operations_select_by_gym"
on public.idempotent_operations
for select
to authenticated
using (private.has_gym_role(array['admin', 'staff'], gym_id));

create policy "idempotent_operations_insert_by_gym"
on public.idempotent_operations
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff'], gym_id));

-- =========================================================
-- public.extend_membership
--
-- SECURITY INVOKER: the membership lookup and the idempotent_operations/
-- client_memberships writes all run under the caller's own RLS
-- permissions, same authorization boundary as every other RPC in this
-- project. A cross-gym p_client_membership_id is invisible to the SELECT
-- below (client_memberships_select_by_gym), so it resolves to "Membership
-- not found." - never a leak, never a different error shape.
--
-- Eligibility now matches canExtendMembership
-- (membership-operations-permissions.ts) exactly - NOT the old
-- extendClientMembershipRecord/isCurrentActiveMembership formula, which
-- had a real gap: `status = 'active'` alone made a membership eligible
-- regardless of its dates, and end_date >= today alone made it eligible
-- regardless of status, so a future or already-lapsed-by-date row could
-- still be "extended" as long as it was (or had ever been marked)
-- status = 'active'. The approved rule is the client-side gate's own
-- three-part AND:
--   - status <> 'cancelled';
--   - start_date <= today (blocks future memberships - even ones marked
--     'active', 'pending_payment' or 'partial', regardless of status);
--   - end_date >= today (blocks lapsed memberships - even ones still
--     persisted as 'active', since "active" is never automatically
--     flipped to "expired" in storage).
-- A pending_payment/partial membership that IS within its period (started,
-- not yet ended, not cancelled) is eligible under this same rule - no
-- special-casing needed, matching canExtendMembership's own behavior,
-- which doesn't distinguish payment status at all.
--
-- "Today" is the app's operating civil date (America/Tijuana), matching
-- getTodayInAppTimeZone() - not UTC, which could disagree with Tijuana for
-- several hours around each UTC midnight.
--
-- Since a lapsed (end_date < today) membership is now blocked outright,
-- the new end_date is simply end_date + p_days - no more "reset to today
-- if already lapsed" branch (that branch existed only to compensate for
-- the old formula allowing lapsed-but-status-active rows through; it's
-- dead code under the new rule, so it's removed rather than kept unused).
-- =========================================================

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
  -- fast-path check (unlike Stage 1's payment RPC) because the
  -- idempotent_operations uniqueness is now scoped by (gym_id,
  -- idempotency_key), so the caller's gym_id is needed to even know which
  -- row to look for. A cache-hit retry still never reuses this row's
  -- status/dates for validation - only its gym_id, before returning the
  -- previously-saved result untouched.
  select cm.start_date, cm.end_date, cm.status, cm.gym_id
  into v_membership
  from public.client_memberships cm
  where cm.id = p_client_membership_id;

  if not found then
    raise exception 'Membership not found.';
  end if;

  -- Fast path: sequential retry (not a concurrent race) with the same key,
  -- scoped to this membership's own gym. Never re-validates membership
  -- state - a retry must return the exact same result as the original
  -- call, not whatever the membership's current state happens to be now.
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

    -- If this SELECT matches zero rows, FOUND is reliably false - unlike a
    -- hand-rolled boolean variable, which a zero-row SELECT INTO would
    -- leave unchanged instead of resetting (a real bug caught in this
    -- exact spot during Stage 2's own cross-gym verification).
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

  -- Same transaction as the idempotent_operations insert above: any error
  -- here (including one deliberately injected for testing) rolls back
  -- that insert too - a plpgsql function body is atomic unless it uses an
  -- explicit sub-block exception handler, which this UPDATE does not.
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

-- =========================================================
-- Retention policy (documented, not implemented)
--
-- idempotent_operations rows only need to live long enough to catch a
-- retry/race for the *same* logical user action - realistically seconds
-- to minutes, not months. No cron job or automatic deletion is added
-- here. Future policy proposal: delete rows older than 30 days via a
-- scheduled job (pg_cron or an external scheduler), since nothing in this
-- table is needed for historical/audit purposes once that window has
-- passed - the authoritative record of what happened lives in
-- client_memberships/payments themselves, not in this ledger.
-- =========================================================
