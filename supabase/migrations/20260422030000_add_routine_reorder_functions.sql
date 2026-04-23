create or replace function public.reorder_client_routine_days(
  p_routine_id uuid,
  p_day_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offset integer;
begin
  v_offset := greatest(coalesce(array_length(p_day_ids, 1), 0), 1) + 1000;

  with ordered as (
    select day_id, ordinality::integer as next_index
    from unnest(p_day_ids) with ordinality as t(day_id, ordinality)
  )
  update public.client_routine_days as d
  set day_index = ordered.next_index + v_offset
  from ordered
  where d.id = ordered.day_id
    and d.client_routine_id = p_routine_id;

  with ordered as (
    select day_id, ordinality::integer as next_index
    from unnest(p_day_ids) with ordinality as t(day_id, ordinality)
  )
  update public.client_routine_days as d
  set day_index = ordered.next_index
  from ordered
  where d.id = ordered.day_id
    and d.client_routine_id = p_routine_id;
end;
$$;

create or replace function public.reorder_client_routine_exercises(
  p_routine_day_id uuid,
  p_exercise_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offset integer;
begin
  v_offset := greatest(coalesce(array_length(p_exercise_ids, 1), 0), 1) + 1000;

  with ordered as (
    select exercise_id, ordinality::integer as next_index
    from unnest(p_exercise_ids) with ordinality as t(exercise_id, ordinality)
  )
  update public.client_routine_exercises as e
  set sort_order = ordered.next_index + v_offset
  from ordered
  where e.id = ordered.exercise_id
    and e.client_routine_day_id = p_routine_day_id;

  with ordered as (
    select exercise_id, ordinality::integer as next_index
    from unnest(p_exercise_ids) with ordinality as t(exercise_id, ordinality)
  )
  update public.client_routine_exercises as e
  set sort_order = ordered.next_index
  from ordered
  where e.id = ordered.exercise_id
    and e.client_routine_day_id = p_routine_day_id;
end;
$$;
