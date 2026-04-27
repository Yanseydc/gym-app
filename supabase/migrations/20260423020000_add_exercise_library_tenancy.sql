alter table public.exercise_library
  add column if not exists gym_id uuid references public.gyms(id),
  add column if not exists created_by uuid references public.profiles(id);

create index if not exists exercise_library_gym_id_idx
  on public.exercise_library (gym_id);

create index if not exists exercise_library_created_by_idx
  on public.exercise_library (created_by);

drop policy if exists "exercise_library_select_by_role" on public.exercise_library;
drop policy if exists "exercise_library_insert_staff" on public.exercise_library;
drop policy if exists "exercise_library_update_staff" on public.exercise_library;
drop policy if exists "exercise_library_delete_staff" on public.exercise_library;

create policy "exercise_library_select_by_gym"
on public.exercise_library
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or exercise_library.gym_id is null
        or exercise_library.gym_id = profiles.gym_id
      )
  )
);

create policy "exercise_library_insert_by_gym"
on public.exercise_library
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (
          profiles.role in ('admin', 'coach')
          and profiles.gym_id is not null
          and exercise_library.gym_id = profiles.gym_id
        )
      )
  )
);

create policy "exercise_library_update_by_gym"
on public.exercise_library
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (
          profiles.role in ('admin', 'coach')
          and profiles.gym_id is not null
          and exercise_library.gym_id = profiles.gym_id
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (
          profiles.role in ('admin', 'coach')
          and profiles.gym_id is not null
          and exercise_library.gym_id = profiles.gym_id
        )
      )
  )
);

create policy "exercise_library_delete_by_gym"
on public.exercise_library
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        profiles.role = 'super_admin'
        or (
          profiles.role in ('admin', 'coach')
          and profiles.gym_id is not null
          and exercise_library.gym_id = profiles.gym_id
        )
      )
  )
);
