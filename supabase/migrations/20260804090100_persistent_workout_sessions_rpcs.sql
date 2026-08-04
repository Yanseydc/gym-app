-- Persistent workout sessions -- RPCs (Entrega 1A).
--
-- All five functions are SECURITY DEFINER on purpose: the companion
-- schema migration (20260804090000) grants `authenticated` SELECT only on
-- all three session tables -- there is no INSERT/UPDATE policy an INVOKER
-- function could rely on. Each function is therefore its own complete
-- authorization boundary: it derives the caller's client_id from
-- client_user_links by auth.uid() (never accepts client_id as a
-- parameter), re-validates ownership and gym membership explicitly, and
-- only then performs the write.
--
-- Every column reference below is qualified with a table alias, and every
-- local variable is prefixed v_ -- specifically to avoid the exact bug
-- class fixed in 20260803120000_fix_activate_client_routine_ambiguous_column.sql,
-- where a bare column name collided with a RETURNS TABLE OUT parameter of
-- the same name. None of the OUT parameter names below (session_id,
-- status, completed_at, abandoned_at, completed_sets_count,
-- total_sets_count, set_id, version, weight, reps, completed, notes,
-- client_notes, conflict, resumed, requested_day_matches,
-- session_exercise_id) are ever referenced unqualified anywhere in these
-- bodies -- the two exceptions that are syntactically always safe
-- regardless (the left-hand side of an UPDATE ... SET clause, which SQL
-- grammar always resolves to a table column, and INTO assignment targets,
-- which are never evaluated as expressions) are used deliberately and
-- documented inline.
--
-- Lock ordering: every function that can run concurrently with
-- finish_routine_session/abandon_routine_session on the same session --
-- that is, update_routine_session_set and update_routine_session_exercise_note
-- -- locks the client_routine_sessions row FIRST (`for update`), and only
-- afterwards touches the child set/exercise row (whose lock is acquired
-- implicitly by the row-targeted UPDATE statement itself; no separate
-- SELECT ... FOR UPDATE is needed for it). finish_routine_session and
-- abandon_routine_session already only ever lock the session row. This
-- uniform "session first" order is not just deadlock avoidance (no two of
-- these functions ever request locks in opposite order, so no cycle is
-- possible) -- it is what makes the race itself safe: whichever call
-- acquires the session lock first fully commits (or aborts) before the
-- other proceeds, so a concurrent update_set/update_note can never commit
-- a write after the session has already gone terminal, and
-- finish/abandon's own plain (non-locking) read of the child rows to
-- compute completed_sets_count/total_sets_count is always the final,
-- settled state -- not a snapshot a straggling write could still land
-- after. An earlier version of this migration locked the set/exercise row
-- first instead, which allowed a concurrent update_routine_session_set to
-- commit after a concurrent finish_routine_session had already completed
-- the session: both could read status = 'in_progress' before either
-- committed, since neither ever tried to acquire the other's lock. Fixed
-- by reordering the locks (session, then child row), not by adding a
-- status re-check after the fact -- the concurrency test suite added
-- alongside this fix (client-routine-sessions.integration.test.ts) drives
-- real overlapping transactions to verify it, not just sequential calls.

-- =========================================================
-- start_routine_session
-- =========================================================

create or replace function public.start_routine_session(
  p_client_routine_day_id uuid,
  p_idempotency_key uuid
)
returns table (
  session_id uuid,
  resumed boolean,
  requested_day_matches boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_gym_id uuid;
  v_existing_id uuid;
  v_existing_day_id uuid;
  v_existing_key uuid;
  v_routine_id uuid;
  v_routine_title text;
  v_day_index integer;
  v_day_title text;
  v_day_notes text;
  v_new_session_id uuid;
  v_constraint_name text;
begin
  if p_idempotency_key is null then
    raise exception 'start_routine_session: p_idempotency_key is required';
  end if;

  if p_client_routine_day_id is null then
    raise exception 'start_routine_session: p_client_routine_day_id is required';
  end if;

  select cul.client_id into v_client_id
  from public.client_user_links cul
  where cul.profile_id = auth.uid();

  if v_client_id is null then
    raise exception 'start_routine_session: no linked client for the current user';
  end if;

  select c.gym_id into v_gym_id from public.clients c where c.id = v_client_id;

  if v_gym_id is null then
    raise exception 'start_routine_session: client % not found', v_client_id;
  end if;

  -- Fast path: this client already has an in_progress session. Never
  -- create a second one, regardless of which day or key was requested.
  select crs.id, crs.client_routine_day_id, crs.idempotency_key
  into v_existing_id, v_existing_day_id, v_existing_key
  from public.client_routine_sessions crs
  where crs.client_id = v_client_id
    and crs.status = 'in_progress'
  for update;

  if v_existing_id is not null then
    if v_existing_key = p_idempotency_key and v_existing_day_id <> p_client_routine_day_id then
      raise exception 'start_routine_session: idempotency_key already used for a different day';
    end if;

    session_id := v_existing_id;
    resumed := true;
    requested_day_matches := (v_existing_day_id = p_client_routine_day_id);
    return next;
    return;
  end if;

  -- No existing session: the requested day must belong to this client's
  -- currently active routine.
  select cr.id, cr.title, crd.day_index, crd.title, crd.notes
  into v_routine_id, v_routine_title, v_day_index, v_day_title, v_day_notes
  from public.client_routine_days crd
  join public.client_routines cr on cr.id = crd.client_routine_id
  where crd.id = p_client_routine_day_id
    and cr.client_id = v_client_id
    and cr.status = 'active';

  if v_routine_id is null then
    raise exception 'start_routine_session: routine day not found or not active for this client';
  end if;

  begin
    insert into public.client_routine_sessions (
      client_id, client_routine_id, client_routine_day_id,
      routine_title, day_index, day_title, day_notes,
      idempotency_key
    ) values (
      v_client_id, v_routine_id, p_client_routine_day_id,
      v_routine_title, v_day_index, v_day_title, v_day_notes,
      p_idempotency_key
    )
    returning id into v_new_session_id;

  exception when unique_violation then
    -- Only resolve this as a lost race if the violated constraint is
    -- actually the one-in-progress-per-client index. Any other
    -- unique_violation (e.g. a genuine idempotency_key reuse against a
    -- terminal session) must propagate as a real error.
    get stacked diagnostics v_constraint_name = constraint_name;

    if v_constraint_name <> 'client_routine_sessions_one_in_progress_per_client_idx' then
      raise;
    end if;

    select crs.id, crs.client_routine_day_id, crs.idempotency_key
    into v_existing_id, v_existing_day_id, v_existing_key
    from public.client_routine_sessions crs
    where crs.client_id = v_client_id
      and crs.status = 'in_progress';

    if v_existing_id is null then
      raise exception 'start_routine_session: idempotency conflict could not be resolved';
    end if;

    if v_existing_key = p_idempotency_key and v_existing_day_id <> p_client_routine_day_id then
      raise exception 'start_routine_session: idempotency_key already used for a different day';
    end if;

    session_id := v_existing_id;
    resumed := true;
    requested_day_matches := (v_existing_day_id = p_client_routine_day_id);
    return next;
    return;
  end;

  -- Snapshot the day's exercises, in order.
  insert into public.client_routine_session_exercises (
    client_routine_session_id, exercise_id, exercise_name, sort_order,
    prescribed_sets_text, prescribed_reps_text, prescribed_weight_text,
    prescribed_rest_seconds, prescribed_notes
  )
  select
    v_new_session_id, cre.exercise_id, el.name, cre.sort_order,
    cre.sets_text, cre.reps_text, cre.target_weight_text,
    cre.rest_seconds, cre.notes
  from public.client_routine_exercises cre
  join public.exercise_library el on el.id = cre.exercise_id
  where cre.client_routine_day_id = p_client_routine_day_id
  order by cre.sort_order;

  -- Snapshot a fixed set of empty, unregistered set rows per exercise --
  -- the count comes from parsing prescribed_sets_text (see
  -- private.parse_prescribed_set_count in the schema migration). No more
  -- rows are ever added or removed after this insert (point 8 of the
  -- approved design).
  insert into public.client_routine_session_sets (
    client_routine_session_exercise_id, set_index
  )
  select
    crse.id, gs.set_index
  from public.client_routine_session_exercises crse
  cross join lateral generate_series(1, private.parse_prescribed_set_count(crse.prescribed_sets_text)) as gs(set_index)
  where crse.client_routine_session_id = v_new_session_id;

  session_id := v_new_session_id;
  resumed := false;
  requested_day_matches := true;
  return next;
end;
$$;

revoke all on function public.start_routine_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_routine_session(uuid, uuid) from anon;
grant execute on function public.start_routine_session(uuid, uuid) to authenticated;

-- =========================================================
-- update_routine_session_set
-- =========================================================

create or replace function public.update_routine_session_set(
  p_set_id uuid,
  p_expected_version integer,
  p_weight numeric,
  p_reps integer,
  p_completed boolean,
  p_notes text
)
returns table (
  set_id uuid,
  version integer,
  weight numeric,
  reps integer,
  completed boolean,
  notes text,
  conflict boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_own_gym_id uuid;
  v_session_id uuid;
  v_owner_client_id uuid;
  v_owner_gym_id uuid;
  v_session_status text;
  v_updated_id uuid;
begin
  if p_set_id is null or p_expected_version is null then
    raise exception 'update_routine_session_set: p_set_id and p_expected_version are required';
  end if;

  select cul.client_id into v_client_id
  from public.client_user_links cul
  where cul.profile_id = auth.uid();

  if v_client_id is null then
    raise exception 'update_routine_session_set: no linked client for the current user';
  end if;

  select c.gym_id into v_own_gym_id from public.clients c where c.id = v_client_id;

  -- Routing only, no lock yet: which session does this set belong to.
  select rse.client_routine_session_id into v_session_id
  from public.client_routine_session_sets rss
  join public.client_routine_session_exercises rse on rse.id = rss.client_routine_session_exercise_id
  where rss.id = p_set_id;

  if v_session_id is null then
    raise exception 'update_routine_session_set: set not found';
  end if;

  -- Lock order: session first (see the header comment of this file). This
  -- is what actually serializes against a concurrent finish_routine_session/
  -- abandon_routine_session on the same session, not just a deadlock
  -- precaution -- whichever call gets here first fully commits or aborts
  -- before the other proceeds past this point.
  select s.client_id, s.gym_id, s.status
  into v_owner_client_id, v_owner_gym_id, v_session_status
  from public.client_routine_sessions s
  where s.id = v_session_id
  for update;

  if v_owner_client_id <> v_client_id then
    raise exception 'update_routine_session_set: not authorized to update this set';
  end if;

  -- Defense in depth: a client belongs to exactly one gym, so this can
  -- only fail if data is already inconsistent -- but it is checked
  -- explicitly rather than assumed, per the approved design.
  if v_owner_gym_id is null or v_owner_gym_id <> v_own_gym_id then
    raise exception 'update_routine_session_set: gym mismatch';
  end if;

  if v_session_status <> 'in_progress' then
    raise exception 'update_routine_session_set: session is not in progress';
  end if;

  -- Second: the set row itself. Its lock is acquired implicitly by this
  -- UPDATE statement -- no separate SELECT ... FOR UPDATE is needed for it.
  update public.client_routine_session_sets rss
  set weight = p_weight,
      reps = p_reps,
      completed = p_completed,
      notes = p_notes
  where rss.id = p_set_id
    and rss.version = p_expected_version
  returning rss.id, rss.version, rss.weight, rss.reps, rss.completed, rss.notes
  into v_updated_id, version, weight, reps, completed, notes;

  if v_updated_id is null then
    -- Someone else's write already advanced the version between our lock
    -- above and this update. Not an error -- a safe, distinguishable
    -- conflict, reporting the value that actually won.
    select rss.id, rss.version, rss.weight, rss.reps, rss.completed, rss.notes
    into set_id, version, weight, reps, completed, notes
    from public.client_routine_session_sets rss
    where rss.id = p_set_id;

    conflict := true;
    return next;
    return;
  end if;

  set_id := v_updated_id;
  conflict := false;
  return next;
end;
$$;

revoke all on function public.update_routine_session_set(uuid, integer, numeric, integer, boolean, text) from public, anon, authenticated;
revoke all on function public.update_routine_session_set(uuid, integer, numeric, integer, boolean, text) from anon;
grant execute on function public.update_routine_session_set(uuid, integer, numeric, integer, boolean, text) to authenticated;

-- =========================================================
-- update_routine_session_exercise_note
-- =========================================================

create or replace function public.update_routine_session_exercise_note(
  p_session_exercise_id uuid,
  p_expected_version integer,
  p_client_notes text
)
returns table (
  session_exercise_id uuid,
  version integer,
  client_notes text,
  conflict boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_own_gym_id uuid;
  v_session_id uuid;
  v_owner_client_id uuid;
  v_owner_gym_id uuid;
  v_session_status text;
  v_updated_id uuid;
begin
  if p_session_exercise_id is null or p_expected_version is null then
    raise exception 'update_routine_session_exercise_note: p_session_exercise_id and p_expected_version are required';
  end if;

  select cul.client_id into v_client_id
  from public.client_user_links cul
  where cul.profile_id = auth.uid();

  if v_client_id is null then
    raise exception 'update_routine_session_exercise_note: no linked client for the current user';
  end if;

  select c.gym_id into v_own_gym_id from public.clients c where c.id = v_client_id;

  -- Routing only, no lock yet.
  select rse.client_routine_session_id into v_session_id
  from public.client_routine_session_exercises rse
  where rse.id = p_session_exercise_id;

  if v_session_id is null then
    raise exception 'update_routine_session_exercise_note: session exercise not found';
  end if;

  -- Lock order: session first (see the header comment of this file) --
  -- serializes against a concurrent finish_routine_session/
  -- abandon_routine_session on the same session.
  select s.client_id, s.gym_id, s.status
  into v_owner_client_id, v_owner_gym_id, v_session_status
  from public.client_routine_sessions s
  where s.id = v_session_id
  for update;

  if v_owner_client_id <> v_client_id then
    raise exception 'update_routine_session_exercise_note: not authorized to update this exercise note';
  end if;

  if v_owner_gym_id is null or v_owner_gym_id <> v_own_gym_id then
    raise exception 'update_routine_session_exercise_note: gym mismatch';
  end if;

  if v_session_status <> 'in_progress' then
    raise exception 'update_routine_session_exercise_note: session is not in progress';
  end if;

  -- Second: the exercise row itself, lock acquired implicitly by this
  -- UPDATE statement.
  update public.client_routine_session_exercises rse
  set client_notes = p_client_notes
  where rse.id = p_session_exercise_id
    and rse.version = p_expected_version
  returning rse.id, rse.version, rse.client_notes
  into v_updated_id, version, client_notes;

  if v_updated_id is null then
    select rse.id, rse.version, rse.client_notes
    into session_exercise_id, version, client_notes
    from public.client_routine_session_exercises rse
    where rse.id = p_session_exercise_id;

    conflict := true;
    return next;
    return;
  end if;

  session_exercise_id := v_updated_id;
  conflict := false;
  return next;
end;
$$;

revoke all on function public.update_routine_session_exercise_note(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.update_routine_session_exercise_note(uuid, integer, text) from anon;
grant execute on function public.update_routine_session_exercise_note(uuid, integer, text) to authenticated;

-- =========================================================
-- finish_routine_session
-- =========================================================

create or replace function public.finish_routine_session(
  p_session_id uuid,
  p_client_notes text
)
returns table (
  session_id uuid,
  status text,
  completed_at timestamptz,
  completed_sets_count integer,
  total_sets_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_status text;
  v_total integer;
  v_completed integer;
begin
  select cul.client_id into v_client_id
  from public.client_user_links cul
  where cul.profile_id = auth.uid();

  if v_client_id is null then
    raise exception 'finish_routine_session: no linked client for the current user';
  end if;

  select crs.status into v_status
  from public.client_routine_sessions crs
  where crs.id = p_session_id
    and crs.client_id = v_client_id
  for update;

  if v_status is null then
    raise exception 'finish_routine_session: session not found';
  end if;

  if v_status = 'abandoned' then
    raise exception 'finish_routine_session: session was discarded and cannot be finished';
  end if;

  if v_status = 'completed' then
    -- Idempotent retry: pure read, no write at all -- a terminal session
    -- never changes again (also enforced by the snapshot-protection
    -- trigger), so this always returns exactly what was already persisted.
    select crs.id, crs.status, crs.completed_at, crs.completed_sets_count, crs.total_sets_count
    into session_id, status, completed_at, completed_sets_count, total_sets_count
    from public.client_routine_sessions crs
    where crs.id = p_session_id;

    return next;
    return;
  end if;

  -- Progress is computed from persisted sets, not from any client-supplied
  -- number, and only once -- at the exact moment status leaves in_progress.
  select count(*), count(*) filter (where rss.completed)
  into v_total, v_completed
  from public.client_routine_session_sets rss
  join public.client_routine_session_exercises rse on rse.id = rss.client_routine_session_exercise_id
  where rse.client_routine_session_id = p_session_id;

  update public.client_routine_sessions crs
  set status = 'completed',
      completed_at = timezone('utc', now()),
      client_notes = nullif(trim(coalesce(p_client_notes, '')), ''),
      total_sets_count = v_total,
      completed_sets_count = v_completed
  where crs.id = p_session_id
  returning crs.id, crs.status, crs.completed_at, crs.completed_sets_count, crs.total_sets_count
  into session_id, status, completed_at, completed_sets_count, total_sets_count;

  return next;
end;
$$;

revoke all on function public.finish_routine_session(uuid, text) from public, anon, authenticated;
revoke all on function public.finish_routine_session(uuid, text) from anon;
grant execute on function public.finish_routine_session(uuid, text) to authenticated;

-- =========================================================
-- abandon_routine_session
--
-- Confirmation is the UI's responsibility, not this function's -- calling
-- it is the point of no return for the transition itself, exactly like
-- finish_routine_session. Never deletes anything; only changes status.
-- =========================================================

create or replace function public.abandon_routine_session(
  p_session_id uuid
)
returns table (
  session_id uuid,
  status text,
  abandoned_at timestamptz,
  completed_sets_count integer,
  total_sets_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_status text;
  v_total integer;
  v_completed integer;
begin
  select cul.client_id into v_client_id
  from public.client_user_links cul
  where cul.profile_id = auth.uid();

  if v_client_id is null then
    raise exception 'abandon_routine_session: no linked client for the current user';
  end if;

  select crs.status into v_status
  from public.client_routine_sessions crs
  where crs.id = p_session_id
    and crs.client_id = v_client_id
  for update;

  if v_status is null then
    raise exception 'abandon_routine_session: session not found';
  end if;

  if v_status = 'completed' then
    raise exception 'abandon_routine_session: session was already finished and cannot be discarded';
  end if;

  if v_status = 'abandoned' then
    select crs.id, crs.status, crs.abandoned_at, crs.completed_sets_count, crs.total_sets_count
    into session_id, status, abandoned_at, completed_sets_count, total_sets_count
    from public.client_routine_sessions crs
    where crs.id = p_session_id;

    return next;
    return;
  end if;

  select count(*), count(*) filter (where rss.completed)
  into v_total, v_completed
  from public.client_routine_session_sets rss
  join public.client_routine_session_exercises rse on rse.id = rss.client_routine_session_exercise_id
  where rse.client_routine_session_id = p_session_id;

  update public.client_routine_sessions crs
  set status = 'abandoned',
      abandoned_at = timezone('utc', now()),
      total_sets_count = v_total,
      completed_sets_count = v_completed
  where crs.id = p_session_id
  returning crs.id, crs.status, crs.abandoned_at, crs.completed_sets_count, crs.total_sets_count
  into session_id, status, abandoned_at, completed_sets_count, total_sets_count;

  return next;
end;
$$;

revoke all on function public.abandon_routine_session(uuid) from public, anon, authenticated;
revoke all on function public.abandon_routine_session(uuid) from anon;
grant execute on function public.abandon_routine_session(uuid) to authenticated;
