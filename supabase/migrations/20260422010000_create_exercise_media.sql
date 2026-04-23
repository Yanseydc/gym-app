create table if not exists public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercise_library (id) on delete cascade,
  url text not null,
  sort_order integer not null default 1 check (sort_order > 0),
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists exercise_media_exercise_id_idx
  on public.exercise_media (exercise_id);

create index if not exists exercise_media_exercise_id_sort_order_idx
  on public.exercise_media (exercise_id, sort_order);

alter table public.exercise_media enable row level security;

create policy "exercise_media_select_by_role"
on public.exercise_media
for select
to authenticated
using (
  exists (
    select 1
    from public.exercise_library
    where id = exercise_id
      and (
        public.has_any_role(array['admin', 'staff', 'coach'])
        or is_active = true
      )
  )
);

create policy "exercise_media_insert_staff"
on public.exercise_media
for insert
to authenticated
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "exercise_media_update_staff"
on public.exercise_media
for update
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
)
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "exercise_media_delete_staff"
on public.exercise_media
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);
