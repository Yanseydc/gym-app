create or replace function public.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any (allowed_roles)
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.client_user_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id),
  unique (profile_id)
);

create table if not exists public.client_onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  height_cm integer not null check (height_cm > 0),
  goal text not null,
  available_days integer not null check (available_days > 0 and available_days <= 7),
  available_schedule text not null,
  injuries_notes text,
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create table if not exists public.client_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  checkin_date date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg > 0),
  client_notes text,
  coach_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, checkin_date)
);

create table if not exists public.client_checkin_photos (
  id uuid primary key default gen_random_uuid(),
  client_checkin_id uuid not null references public.client_checkins (id) on delete cascade,
  photo_type text not null check (photo_type in ('front', 'side', 'back')),
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (client_checkin_id, photo_type)
);

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  video_url text,
  thumbnail_url text,
  primary_muscle text,
  secondary_muscle text,
  equipment text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions text,
  coach_tips text,
  common_mistakes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_routines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_profile_id uuid references public.profiles (id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.client_routine_days (
  id uuid primary key default gen_random_uuid(),
  client_routine_id uuid not null references public.client_routines (id) on delete cascade,
  day_index integer not null check (day_index > 0),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (client_routine_id, day_index)
);

create table if not exists public.client_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  client_routine_day_id uuid not null references public.client_routine_days (id) on delete cascade,
  exercise_id uuid not null references public.exercise_library (id) on delete restrict,
  sort_order integer not null default 1 check (sort_order > 0),
  sets_text text not null,
  reps_text text not null,
  target_weight_text text,
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (client_routine_day_id, sort_order)
);

create index if not exists client_user_links_client_id_idx
  on public.client_user_links (client_id);

create index if not exists client_user_links_profile_id_idx
  on public.client_user_links (profile_id);

create index if not exists client_onboarding_responses_client_id_idx
  on public.client_onboarding_responses (client_id);

create index if not exists client_checkins_client_id_idx
  on public.client_checkins (client_id);

create index if not exists client_checkins_checkin_date_idx
  on public.client_checkins (checkin_date desc);

create index if not exists client_checkins_client_id_checkin_date_idx
  on public.client_checkins (client_id, checkin_date desc);

create index if not exists client_checkin_photos_client_checkin_id_idx
  on public.client_checkin_photos (client_checkin_id);

create index if not exists client_checkin_photos_photo_type_idx
  on public.client_checkin_photos (photo_type);

create index if not exists exercise_library_name_idx
  on public.exercise_library (name);

create index if not exists exercise_library_is_active_idx
  on public.exercise_library (is_active);

create index if not exists client_routines_client_id_idx
  on public.client_routines (client_id);

create index if not exists client_routines_coach_profile_id_idx
  on public.client_routines (coach_profile_id);

create index if not exists client_routines_status_idx
  on public.client_routines (status);

create index if not exists client_routines_client_id_status_idx
  on public.client_routines (client_id, status);

create unique index if not exists client_routines_one_active_per_client_idx
  on public.client_routines (client_id)
  where status = 'active';

create index if not exists client_routine_days_client_routine_id_idx
  on public.client_routine_days (client_routine_id);

create index if not exists client_routine_days_client_routine_id_day_index_idx
  on public.client_routine_days (client_routine_id, day_index);

create index if not exists client_routine_exercises_client_routine_day_id_idx
  on public.client_routine_exercises (client_routine_day_id);

create index if not exists client_routine_exercises_exercise_id_idx
  on public.client_routine_exercises (exercise_id);

create index if not exists client_routine_exercises_client_routine_day_sort_order_idx
  on public.client_routine_exercises (client_routine_day_id, sort_order);

drop trigger if exists set_client_user_links_updated_at on public.client_user_links;
create trigger set_client_user_links_updated_at
before update on public.client_user_links
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_onboarding_responses_updated_at on public.client_onboarding_responses;
create trigger set_client_onboarding_responses_updated_at
before update on public.client_onboarding_responses
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_checkins_updated_at on public.client_checkins;
create trigger set_client_checkins_updated_at
before update on public.client_checkins
for each row
execute function public.set_updated_at();

drop trigger if exists set_exercise_library_updated_at on public.exercise_library;
create trigger set_exercise_library_updated_at
before update on public.exercise_library
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_routines_updated_at on public.client_routines;
create trigger set_client_routines_updated_at
before update on public.client_routines
for each row
execute function public.set_updated_at();

create or replace function public.is_linked_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_user_links
    where client_id = target_client_id
      and profile_id = auth.uid()
  );
$$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role(array['admin', 'staff', 'coach'])
    or public.is_linked_client(target_client_id);
$$;

alter table public.client_user_links enable row level security;
alter table public.client_onboarding_responses enable row level security;
alter table public.client_checkins enable row level security;
alter table public.client_checkin_photos enable row level security;
alter table public.exercise_library enable row level security;
alter table public.client_routines enable row level security;
alter table public.client_routine_days enable row level security;
alter table public.client_routine_exercises enable row level security;

create policy "client_user_links_select_staff_or_self"
on public.client_user_links
for select
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
  or profile_id = auth.uid()
);

create policy "client_user_links_insert_staff"
on public.client_user_links
for insert
to authenticated
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_user_links_update_staff"
on public.client_user_links
for update
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
)
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_user_links_delete_staff"
on public.client_user_links
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_onboarding_responses_select_accessible"
on public.client_onboarding_responses
for select
to authenticated
using (
  public.can_access_client(client_id)
);

create policy "client_onboarding_responses_insert_accessible"
on public.client_onboarding_responses
for insert
to authenticated
with check (
  public.can_access_client(client_id)
);

create policy "client_onboarding_responses_update_accessible"
on public.client_onboarding_responses
for update
to authenticated
using (
  public.can_access_client(client_id)
)
with check (
  public.can_access_client(client_id)
);

create policy "client_onboarding_responses_delete_staff"
on public.client_onboarding_responses
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_checkins_select_accessible"
on public.client_checkins
for select
to authenticated
using (
  public.can_access_client(client_id)
);

create policy "client_checkins_insert_accessible"
on public.client_checkins
for insert
to authenticated
with check (
  public.can_access_client(client_id)
);

create policy "client_checkins_update_accessible"
on public.client_checkins
for update
to authenticated
using (
  public.can_access_client(client_id)
)
with check (
  public.can_access_client(client_id)
);

create policy "client_checkins_delete_staff"
on public.client_checkins
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_checkin_photos_select_accessible"
on public.client_checkin_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.client_checkins
    where id = client_checkin_id
      and public.can_access_client(client_id)
  )
);

create policy "client_checkin_photos_insert_accessible"
on public.client_checkin_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.client_checkins
    where id = client_checkin_id
      and public.can_access_client(client_id)
  )
);

create policy "client_checkin_photos_update_accessible"
on public.client_checkin_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.client_checkins
    where id = client_checkin_id
      and public.can_access_client(client_id)
  )
)
with check (
  exists (
    select 1
    from public.client_checkins
    where id = client_checkin_id
      and public.can_access_client(client_id)
  )
);

create policy "client_checkin_photos_delete_staff"
on public.client_checkin_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.client_checkins
    where id = client_checkin_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "exercise_library_select_by_role"
on public.exercise_library
for select
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
  or is_active = true
);

create policy "exercise_library_insert_staff"
on public.exercise_library
for insert
to authenticated
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "exercise_library_update_staff"
on public.exercise_library
for update
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
)
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "exercise_library_delete_staff"
on public.exercise_library
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_routines_select_accessible"
on public.client_routines
for select
to authenticated
using (
  public.can_access_client(client_id)
);

create policy "client_routines_insert_staff"
on public.client_routines
for insert
to authenticated
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_routines_update_staff"
on public.client_routines
for update
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
)
with check (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_routines_delete_staff"
on public.client_routines
for delete
to authenticated
using (
  public.has_any_role(array['admin', 'staff', 'coach'])
);

create policy "client_routine_days_select_accessible"
on public.client_routine_days
for select
to authenticated
using (
  exists (
    select 1
    from public.client_routines
    where id = client_routine_id
      and public.can_access_client(client_id)
  )
);

create policy "client_routine_days_insert_staff"
on public.client_routine_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.client_routines
    where id = client_routine_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "client_routine_days_update_staff"
on public.client_routine_days
for update
to authenticated
using (
  exists (
    select 1
    from public.client_routines
    where id = client_routine_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
)
with check (
  exists (
    select 1
    from public.client_routines
    where id = client_routine_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "client_routine_days_delete_staff"
on public.client_routine_days
for delete
to authenticated
using (
  exists (
    select 1
    from public.client_routines
    where id = client_routine_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "client_routine_exercises_select_accessible"
on public.client_routine_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days
    join public.client_routines
      on public.client_routines.id = public.client_routine_days.client_routine_id
    where public.client_routine_days.id = client_routine_day_id
      and public.can_access_client(public.client_routines.client_id)
  )
);

create policy "client_routine_exercises_insert_staff"
on public.client_routine_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.client_routine_days
    join public.client_routines
      on public.client_routines.id = public.client_routine_days.client_routine_id
    where public.client_routine_days.id = client_routine_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "client_routine_exercises_update_staff"
on public.client_routine_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days
    join public.client_routines
      on public.client_routines.id = public.client_routine_days.client_routine_id
    where public.client_routine_days.id = client_routine_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
)
with check (
  exists (
    select 1
    from public.client_routine_days
    join public.client_routines
      on public.client_routines.id = public.client_routine_days.client_routine_id
    where public.client_routine_days.id = client_routine_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);

create policy "client_routine_exercises_delete_staff"
on public.client_routine_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days
    join public.client_routines
      on public.client_routines.id = public.client_routine_days.client_routine_id
    where public.client_routine_days.id = client_routine_day_id
      and public.has_any_role(array['admin', 'staff', 'coach'])
  )
);
