-- Entrega A0 #2: exercise_library / exercise_media cross-gym read gap --
-- revised after a second adversarial pass to also apply minimum privilege
-- to INACTIVE global (gym_id is null) exercises.
--
-- Original gap: both SELECT policies below carried a trailing
-- `or ... is_active = true` clause with no gym check attached to it, so ANY
-- authenticated user could read ANY OTHER gym's active custom exercises and
-- media through PostgREST/RLS directly -- the app only ever avoided
-- surfacing this because exercise-service.ts's listExercises/getExerciseById
-- happen to add their own `.or('gym_id.is.null,gym_id.eq.<scope.gymId>')`
-- filter on top, which is app-level convention, not a security boundary.
-- That part of the fix (own-gym exercises visible only to that gym, plus a
-- role-agnostic own-gym check so the 'client' role -- never covered by
-- has_gym_role -- still works) is unchanged from the first version of this
-- migration.
--
-- Second pass: an inactive GLOBAL exercise was visible to every
-- authenticated user regardless of role, including 'client'. Audited who
-- actually needs that:
--   * admin/staff/coach (any gym) -- exercise-service.ts's listExercises
--     and getExerciseById intentionally show every global exercise, active
--     or not, so gym staff can browse/manage/reactivate deactivated system
--     exercises on the exercises catalog page
--     (/dashboard/coaching/exercises). This is the only screen that reads
--     inactive global rows at all.
--   * the client portal (portal-routine-exercise-card.tsx, via
--     getRoutineForPage -> getRoutineById) never browses the catalog -- it
--     only ever resolves the specific exercises referenced by that
--     client's own assigned routine(s). A client has no legitimate need to
--     see the full inactive global catalog.
-- Minimum-privilege fix: an inactive global exercise is now visible to
-- admin/staff/coach unconditionally (any gym -- global data isn't
-- gym-scoped), and to a client only if it is actually referenced by one of
-- their own assigned routines (via the new
-- private.is_exercise_referenced_by_caller_routine helper) -- so a
-- routine already assigned to a client that references an exercise the
-- gym later deactivates keeps rendering correctly (name, media, etc.),
-- without granting blanket visibility into the rest of the deactivated
-- catalog. See routines-a0-rls-adversarial.integration.test.ts for the
-- real JWT/REST proof of both halves of this.
--
-- Uses ALTER POLICY (not drop+create) to keep this migration a minimal,
-- additive diff against the original policy definitions in
-- 20260715090300_coaching_tables.sql, the same way the ambiguous-column fix
-- in 20260803120000 replaced only the one function it needed to.

create or replace function private.is_exercise_referenced_by_caller_routine(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_routine_exercises cre
    join public.client_routine_days crd on crd.id = cre.client_routine_day_id
    join public.client_routines cr on cr.id = crd.client_routine_id
    join public.client_user_links cul on cul.client_id = cr.client_id
    where cre.exercise_id = target_exercise_id
      and cul.profile_id = auth.uid()
  );
$$;

revoke all on function private.is_exercise_referenced_by_caller_routine(uuid) from public, anon, authenticated;
revoke all on function private.is_exercise_referenced_by_caller_routine(uuid) from anon;
grant execute on function private.is_exercise_referenced_by_caller_routine(uuid) to authenticated;

alter policy "exercise_library_select_by_gym_or_shared"
on public.exercise_library
using (
  private.has_any_role(array['super_admin'])
  or gym_id = (select p.gym_id from public.profiles p where p.id = auth.uid())
  or (
    gym_id is null
    and (
      is_active = true
      or private.has_any_role(array['admin', 'staff', 'coach'])
      or private.is_exercise_referenced_by_caller_routine(id)
    )
  )
);

alter policy "exercise_media_select_by_visibility"
on public.exercise_media
using (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and (
        private.has_any_role(array['super_admin'])
        or el.gym_id = (select p.gym_id from public.profiles p where p.id = auth.uid())
        or (
          el.gym_id is null
          and (
            el.is_active = true
            or private.has_any_role(array['admin', 'staff', 'coach'])
            or private.is_exercise_referenced_by_caller_routine(el.id)
          )
        )
      )
  )
);
