create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  source_routine_id uuid references public.client_routines (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_template_days (
  id uuid primary key default gen_random_uuid(),
  routine_template_id uuid not null references public.routine_templates (id) on delete cascade,
  day_index integer not null check (day_index > 0),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (routine_template_id, day_index)
);

create table if not exists public.routine_template_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_template_day_id uuid not null references public.routine_template_days (id) on delete cascade,
  exercise_id uuid not null references public.exercise_library (id) on delete restrict,
  sort_order integer not null default 1 check (sort_order > 0),
  sets_text text not null,
  reps_text text not null,
  target_weight_text text,
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (routine_template_day_id, sort_order)
);

create index if not exists routine_templates_title_idx
  on public.routine_templates (title);

create index if not exists routine_templates_created_by_profile_id_idx
  on public.routine_templates (created_by_profile_id);

create index if not exists routine_templates_source_routine_id_idx
  on public.routine_templates (source_routine_id);

create index if not exists routine_templates_updated_at_idx
  on public.routine_templates (updated_at desc);

create index if not exists routine_template_days_routine_template_id_idx
  on public.routine_template_days (routine_template_id);

create index if not exists routine_template_days_routine_template_id_day_index_idx
  on public.routine_template_days (routine_template_id, day_index);

create index if not exists routine_template_exercises_routine_template_day_id_idx
  on public.routine_template_exercises (routine_template_day_id);

create index if not exists routine_template_exercises_exercise_id_idx
  on public.routine_template_exercises (exercise_id);

create index if not exists routine_template_exercises_routine_template_day_sort_order_idx
  on public.routine_template_exercises (routine_template_day_id, sort_order);

drop trigger if exists set_routine_templates_updated_at on public.routine_templates;
create trigger set_routine_templates_updated_at
before update on public.routine_templates
for each row
execute function public.set_updated_at();

alter table public.routine_templates enable row level security;
alter table public.routine_template_days enable row level security;
alter table public.routine_template_exercises enable row level security;

create policy "routine_templates_select_staff"
on public.routine_templates
for select
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "routine_templates_insert_staff"
on public.routine_templates
for insert
to authenticated
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "routine_templates_update_staff"
on public.routine_templates
for update
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
)
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "routine_templates_delete_staff"
on public.routine_templates
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "routine_template_days_select_staff"
on public.routine_template_days
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_templates
    where id = routine_template_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_days_insert_staff"
on public.routine_template_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routine_templates
    where id = routine_template_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_days_update_staff"
on public.routine_template_days
for update
to authenticated
using (
  exists (
    select 1
    from public.routine_templates
    where id = routine_template_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
)
with check (
  exists (
    select 1
    from public.routine_templates
    where id = routine_template_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_days_delete_staff"
on public.routine_template_days
for delete
to authenticated
using (
  exists (
    select 1
    from public.routine_templates
    where id = routine_template_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_exercises_select_staff"
on public.routine_template_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days
    join public.routine_templates
      on public.routine_templates.id = public.routine_template_days.routine_template_id
    where public.routine_template_days.id = routine_template_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_exercises_insert_staff"
on public.routine_template_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routine_template_days
    join public.routine_templates
      on public.routine_templates.id = public.routine_template_days.routine_template_id
    where public.routine_template_days.id = routine_template_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_exercises_update_staff"
on public.routine_template_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days
    join public.routine_templates
      on public.routine_templates.id = public.routine_template_days.routine_template_id
    where public.routine_template_days.id = routine_template_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
)
with check (
  exists (
    select 1
    from public.routine_template_days
    join public.routine_templates
      on public.routine_templates.id = public.routine_template_days.routine_template_id
    where public.routine_template_days.id = routine_template_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "routine_template_exercises_delete_staff"
on public.routine_template_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from public.routine_template_days
    join public.routine_templates
      on public.routine_templates.id = public.routine_template_days.routine_template_id
    where public.routine_template_days.id = routine_template_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);
