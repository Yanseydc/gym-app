-- Persistent workout sessions -- Entrega 1A (backend only, no UI yet).
--
-- Three additive tables replacing the in-memory-only "completed" checkbox
-- in PortalRoutineDayAccordion with real, RLS-protected history:
--   client_routine_sessions          -- one workout attempt
--   client_routine_session_exercises -- snapshot of that day's exercises
--   client_routine_session_sets      -- fixed, pre-created set rows the
--                                        client fills in with real values
--
-- Design decisions locked in for this delivery (see the reviewed design
-- doc this migration implements):
--   - Snapshot everything prescribed at start time (title/day/exercise
--     text); never re-read client_routines/_days/_exercises afterwards.
--     Two triggers below make that a database-level guarantee, not just
--     application discipline.
--   - Sets are FIXED at snapshot time: no add/remove after start. The
--     count per exercise is parsed from the free-text prescribed_sets_text
--     (private.parse_prescribed_set_count below), defaulting to 1 and
--     capped at 20 when it can't be parsed as a leading integer.
--   - "Exercise completed" is NOT a stored boolean -- it is derived by
--     future read code as bool_and(sets.completed) per exercise. Storing
--     it separately would just be a second copy of the same fact that can
--     drift from the sets it's supposed to summarize.
--   - Optimistic concurrency: both client_routine_session_exercises
--     (client_notes) and client_routine_session_sets (weight/reps/
--     completed/notes) carry a `version` integer that a BEFORE UPDATE
--     trigger increments on every write, regardless of who writes it --
--     the RPCs in the companion migration compare `expected_version`
--     against this column and reject/report a conflict instead of
--     silently overwriting a concurrent edit.
--   - Zero direct client writes to any of these three tables (point 29 of
--     the approved design): RLS below grants SELECT only. Every insert
--     and update happens exclusively through the SECURITY DEFINER RPCs in
--     20260804090100_persistent_workout_sessions_rpcs.sql, which is the
--     reason those RPCs need SECURITY DEFINER at all -- there is no
--     policy an INVOKER function could rely on for the client to write
--     through.

-- =========================================================
-- client_routine_sessions
-- =========================================================

create table public.client_routine_sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,

  -- Traceability only -- on delete set null so restructuring/deleting a
  -- routine later can never take workout history down with it. Nothing
  -- reads these to render a session; everything needed to display one is
  -- in the snapshot columns below and in the child tables.
  client_routine_id uuid references public.client_routines (id) on delete set null,
  client_routine_day_id uuid references public.client_routine_days (id) on delete set null,

  -- Snapshot at start time. Immutable after insert (protect_session_snapshot below).
  routine_title text not null,
  day_index integer not null,
  day_title text not null,
  day_notes text,

  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  client_notes text,

  -- Computed once, from persisted sets, at the moment status leaves
  -- in_progress -- and never recomputed afterwards, so a retried
  -- finish/abandon call returns exactly the same numbers every time.
  total_sets_count integer,
  completed_sets_count integer,

  idempotency_key uuid not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'abandoned') = (abandoned_at is not null)),
  check (status <> 'in_progress' or (total_sets_count is null and completed_sets_count is null)),
  check (status = 'in_progress' or (total_sets_count is not null and completed_sets_count is not null))
);

-- At most one in_progress session per client, globally -- the primary
-- guarantee against duplicate/concurrent starts (see start_routine_session
-- in the companion migration).
create unique index client_routine_sessions_one_in_progress_per_client_idx
  on public.client_routine_sessions (client_id)
  where status = 'in_progress';

-- Idempotency scoped per client + key, per the approved design (point 16)
-- -- narrower than the gym-scoped uniqueness used by payments.idempotency_key,
-- since a session always belongs to exactly one client.
create unique index client_routine_sessions_client_idempotency_key_idx
  on public.client_routine_sessions (client_id, idempotency_key);

create index client_routine_sessions_client_id_idx on public.client_routine_sessions (client_id);
create index client_routine_sessions_client_id_status_idx on public.client_routine_sessions (client_id, status);
create index client_routine_sessions_gym_id_idx on public.client_routine_sessions (gym_id);

alter table public.client_routine_sessions enable row level security;

create trigger set_client_routine_sessions_updated_at
before update on public.client_routine_sessions
for each row
execute function public.set_updated_at();

-- gym_id is always derived from client_id, never trusted from the caller
-- -- same pattern as client_routines_validate_gym. Only needed on insert:
-- client_id/gym_id become immutable afterwards (see the snapshot-protection
-- trigger below), and the only inserter is start_routine_session (SECURITY
-- DEFINER), which also sets gym_id explicitly itself as a second,
-- independent check (point 10 of the approved design) -- this trigger is
-- the defense-in-depth layer matching every other tenant-scoped table in
-- this schema, not the only thing standing between a bug and a leak.
create or replace function public.client_routine_sessions_derive_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
begin
  select c.gym_id into v_client_gym from public.clients c where c.id = new.client_id;

  if v_client_gym is null then
    raise exception 'client_routine_sessions: client_id % not found', new.client_id;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.client_routine_sessions_derive_gym() from public, anon, authenticated;

create trigger client_routine_sessions_derive_gym_trigger
before insert on public.client_routine_sessions
for each row
execute function public.client_routine_sessions_derive_gym();

-- Snapshot/identity columns are immutable after creation, and a session
-- that has left in_progress is frozen in full -- enforced here so this
-- holds even against a future bug in the RPCs, not just by their own
-- discipline. The only columns any legitimate write ever touches while
-- in_progress are status/completed_at/abandoned_at/client_notes/
-- total_sets_count/completed_sets_count/updated_at, all only once, at the
-- single moment the session leaves in_progress.
--
-- One deliberate exception: client_routine_id/client_routine_day_id are
-- "on delete set null" traceability references. If the source routine/day
-- is deleted later -- entirely plausible for a session that has since
-- become terminal -- Postgres performs that SET NULL as a real UPDATE,
-- which would otherwise be vetoed by this same trigger and abort the
-- DELETE. Both columns may transition to null at any time, terminal or
-- not; they may never be reassigned to a different, non-null value.
create or replace function private.protect_client_routine_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.gym_id is distinct from old.gym_id
     or new.client_id is distinct from old.client_id
     or new.routine_title is distinct from old.routine_title
     or new.day_index is distinct from old.day_index
     or new.day_title is distinct from old.day_title
     or new.day_notes is distinct from old.day_notes
     or new.started_at is distinct from old.started_at
     or new.idempotency_key is distinct from old.idempotency_key
  then
    raise exception 'client_routine_sessions: snapshot and identity columns are immutable after creation';
  end if;

  if new.client_routine_id is distinct from old.client_routine_id and new.client_routine_id is not null then
    raise exception 'client_routine_sessions: client_routine_id can only ever be cleared to null, never reassigned';
  end if;

  if new.client_routine_day_id is distinct from old.client_routine_day_id and new.client_routine_day_id is not null then
    raise exception 'client_routine_sessions: client_routine_day_id can only ever be cleared to null, never reassigned';
  end if;

  if old.status <> 'in_progress'
     and (
       new.status is distinct from old.status
       or new.completed_at is distinct from old.completed_at
       or new.abandoned_at is distinct from old.abandoned_at
       or new.client_notes is distinct from old.client_notes
       or new.total_sets_count is distinct from old.total_sets_count
       or new.completed_sets_count is distinct from old.completed_sets_count
     )
  then
    raise exception 'client_routine_sessions: a terminal session (completed/abandoned) is immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_client_routine_session() from public, anon, authenticated;

create trigger protect_client_routine_sessions_snapshot
before update on public.client_routine_sessions
for each row
execute function private.protect_client_routine_session();

-- Read-only for everyone, including the owning client -- no INSERT/UPDATE/
-- DELETE policy exists for `authenticated` at all (point 29). Every write
-- happens through a SECURITY DEFINER RPC, which bypasses RLS by virtue of
-- running as the function owner, not by virtue of any policy here.
create policy "client_routine_sessions_select_accessible"
on public.client_routine_sessions
for select
to authenticated
using (private.can_access_client(client_id));

-- =========================================================
-- client_routine_session_exercises
-- =========================================================

create table public.client_routine_session_exercises (
  id uuid primary key default gen_random_uuid(),
  client_routine_session_id uuid not null
    references public.client_routine_sessions (id) on delete cascade,

  -- Live reference kept only so a future UI could still link to current
  -- video/instructions if the exercise still exists -- never used for the
  -- displayed name, that is always exercise_name below.
  exercise_id uuid references public.exercise_library (id) on delete set null,
  exercise_name text not null,
  sort_order integer not null,

  -- Snapshot of client_routine_exercises at start time. Immutable after
  -- insert (protect_session_exercise_snapshot below).
  prescribed_sets_text text,
  prescribed_reps_text text,
  prescribed_weight_text text,
  prescribed_rest_seconds integer,
  prescribed_notes text,

  -- The one realized (non-snapshot) field on this table: the client's own
  -- note on this exercise for this session. Optimistic concurrency via
  -- `version`, same mechanism as client_routine_session_sets, because
  -- update_routine_session_exercise_note lets the client edit it (point 5
  -- of the approved design: any editable realized field gets a version).
  client_notes text,
  version integer not null default 1,

  created_at timestamptz not null default now(),

  unique (client_routine_session_id, sort_order)
);

create index client_routine_session_exercises_session_id_idx
  on public.client_routine_session_exercises (client_routine_session_id);

alter table public.client_routine_session_exercises enable row level security;

-- version increments on every write, regardless of who writes it, so the
-- RPC never has to remember to bump it itself -- one source of truth.
create or replace function private.bump_session_exercise_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

revoke all on function private.bump_session_exercise_version() from public, anon, authenticated;

create trigger bump_client_routine_session_exercises_version
before update on public.client_routine_session_exercises
for each row
execute function private.bump_session_exercise_version();

create or replace function private.protect_session_exercise_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session_status text;
begin
  if new.client_routine_session_id is distinct from old.client_routine_session_id
     or new.exercise_name is distinct from old.exercise_name
     or new.sort_order is distinct from old.sort_order
     or new.prescribed_sets_text is distinct from old.prescribed_sets_text
     or new.prescribed_reps_text is distinct from old.prescribed_reps_text
     or new.prescribed_weight_text is distinct from old.prescribed_weight_text
     or new.prescribed_rest_seconds is distinct from old.prescribed_rest_seconds
     or new.prescribed_notes is distinct from old.prescribed_notes
  then
    raise exception 'client_routine_session_exercises: snapshot columns are immutable after creation';
  end if;

  -- Same "on delete set null" exception as client_routine_sessions above:
  -- exercise_id may transition to null if the source exercise_library row
  -- is deleted later, never reassigned to a different exercise.
  if new.exercise_id is distinct from old.exercise_id and new.exercise_id is not null then
    raise exception 'client_routine_session_exercises: exercise_id can only ever be cleared to null, never reassigned';
  end if;

  -- The only realized (non-snapshot) field here is client_notes, edited by
  -- update_routine_session_exercise_note only while the parent session is
  -- in_progress. This closes that same rule at the table level, so it
  -- holds even for a direct write with an elevated role, not only for
  -- calls that go through the RPC.
  if new.client_notes is distinct from old.client_notes then
    select s.status into v_session_status
    from public.client_routine_sessions s
    where s.id = new.client_routine_session_id;

    if v_session_status <> 'in_progress' then
      raise exception 'client_routine_session_exercises: cannot edit a terminal session''s exercise note, regardless of caller privilege';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_session_exercise_snapshot() from public, anon, authenticated;

-- Runs after the version bump so the immutability check sees the same NEW
-- row the caller intended (trigger order follows creation order for
-- triggers on the same event, and both are BEFORE UPDATE row triggers).
create trigger protect_client_routine_session_exercises_snapshot
before update on public.client_routine_session_exercises
for each row
execute function private.protect_session_exercise_snapshot();

create policy "client_routine_session_exercises_select_accessible"
on public.client_routine_session_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.client_routine_sessions s
    where s.id = client_routine_session_id
      and private.can_access_client(s.client_id)
  )
);

-- =========================================================
-- client_routine_session_sets
-- =========================================================
--
-- Fixed at snapshot time: exactly N rows per exercise, N derived from
-- private.parse_prescribed_set_count(prescribed_sets_text). No insert or
-- delete happens after start_routine_session creates them -- only their
-- realized values (weight/reps/completed/notes) are ever updated, via
-- update_routine_session_set.

create table public.client_routine_session_sets (
  id uuid primary key default gen_random_uuid(),
  client_routine_session_exercise_id uuid not null
    references public.client_routine_session_exercises (id) on delete cascade,

  set_index integer not null check (set_index > 0),

  -- Realized values. Null/false until the client registers them -- a
  -- freshly snapshotted set has not been done yet.
  weight numeric(6, 2) check (weight is null or weight >= 0),
  reps integer check (reps is null or reps >= 0),
  completed boolean not null default false,
  notes text,

  version integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (client_routine_session_exercise_id, set_index)
);

create index client_routine_session_sets_exercise_id_idx
  on public.client_routine_session_sets (client_routine_session_exercise_id);

alter table public.client_routine_session_sets enable row level security;

create or replace function private.bump_session_set_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.bump_session_set_version() from public, anon, authenticated;

create trigger bump_client_routine_session_sets_version
before update on public.client_routine_session_sets
for each row
execute function private.bump_session_set_version();

-- update_routine_session_set only ever writes here while the parent
-- session is in_progress -- this closes that same rule at the table
-- level, so it holds even for a direct write with an elevated role. Runs
-- after the version bump (alphabetical trigger order: bump < protect),
-- so a rejection here rolls back the version increment too.
create or replace function private.protect_terminal_session_set()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session_status text;
begin
  select s.status into v_session_status
  from public.client_routine_sessions s
  join public.client_routine_session_exercises rse on rse.client_routine_session_id = s.id
  where rse.id = new.client_routine_session_exercise_id;

  if v_session_status <> 'in_progress' then
    raise exception 'client_routine_session_sets: cannot edit a set belonging to a terminal session, regardless of caller privilege';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_terminal_session_set() from public, anon, authenticated;

create trigger protect_terminal_client_routine_session_sets
before update on public.client_routine_session_sets
for each row
execute function private.protect_terminal_session_set();

create policy "client_routine_session_sets_select_accessible"
on public.client_routine_session_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.client_routine_session_exercises e
    join public.client_routine_sessions s on s.id = e.client_routine_session_id
    where e.id = client_routine_session_exercise_id
      and private.can_access_client(s.client_id)
  )
);

-- =========================================================
-- private.parse_prescribed_set_count
--
-- Prescribed sets are free text (client_routine_exercises.sets_text, e.g.
-- "4x10", "3-4", "AMRAP") -- there is no structured set count anywhere in
-- the prescription model. Since V1 fixes the number of session_sets rows
-- at snapshot time (no add/remove after start), that count has to come
-- from somewhere: this parses the leading integer off sets_text and uses
-- it as the row count --
--   "4x10"  -> 4
--   "3-4"   -> 3   (the first integer, not a range average or the max)
--   "AMRAP" -> 1   (no leading integer at all: default, not zero)
--   "0"     -> 1   (a prescribed value of zero sets is nonsensical;
--                    clamped up to the same default as "no integer found",
--                    not preserved as zero rows)
--   "-5"    -> 1   ("-" never matches \d, so this behaves exactly like
--                    "AMRAP": no leading integer, default to 1)
--   "25"    -> 20  (clamped down -- a malformed or pathological value can
--                    never explode into an unreasonable number of rows)
--
-- The initial capture is cast to `numeric`, not directly to `integer`: a
-- pathological value with many digits (e.g. "99999999999999x10") would
-- overflow `integer`'s range and raise before the clamp below ever ran --
-- `numeric` has no such practical limit, so the clamp always gets a
-- chance to run first, and only the final, already-clamped (1-20) value
-- is ever cast down to `integer`, which can never overflow.
--
-- Whatever this returns is *only* ever used to decide how many empty
-- session_sets rows to create at snapshot time -- the original
-- prescribed_sets_text is always copied verbatim onto
-- client_routine_session_exercises and is what any future UI displays;
-- this heuristic count is never shown as if it were the literal
-- prescription.
-- =========================================================

create or replace function private.parse_prescribed_set_count(p_sets_text text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(
    greatest(
      coalesce((regexp_match(coalesce(p_sets_text, ''), '^\s*(\d+)'))[1]::numeric, 1),
      1
    ),
    20
  )::integer;
$$;

revoke all on function private.parse_prescribed_set_count(text) from public, anon, authenticated;

-- Hosted Supabase grants anon table-level access by default that the local
-- Docker stack does not -- repeated for every table this migration
-- creates, matching every prior migration in this schema.
revoke all on table
  public.client_routine_sessions, public.client_routine_session_exercises,
  public.client_routine_session_sets
from anon;
