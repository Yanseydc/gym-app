-- 0004 coaching tables
-- exercise_library, client_onboarding_responses, client_checkins (+photos),
-- client_routines (+days/exercises), exercise_media, routine_templates
-- (+days/exercises).
--
-- Role model for this whole module (confirmed against current app code:
-- src/lib/auth/permissions.ts grants staff full "coaching" module access,
-- and resend-portal-access.ts / update-portal-access-email.ts explicitly
-- authorize staff writes on client_user_links): admin/staff/coach get CRUD
-- scoped to their own gym, client gets read-only access to their own
-- content via can_access_client()/is_linked_client().
--
-- FUTURE DECISION (not resolved by this migration): coach currently has
-- access to every client of their gym, not just clients assigned to them.
-- If a coach-to-client assignment model is introduced later, can_access_client
-- and has_gym_role usage in this file are the places to tighten.

-- =========================================================
-- exercise_library
-- =========================================================

create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
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

create index exercise_library_name_idx on public.exercise_library (name);
create index exercise_library_is_active_idx on public.exercise_library (is_active);
create index exercise_library_gym_id_idx on public.exercise_library (gym_id);
create index exercise_library_created_by_idx on public.exercise_library (created_by);

alter table public.exercise_library enable row level security;

create trigger set_exercise_library_updated_at
before update on public.exercise_library
for each row
execute function public.set_updated_at();

-- gym_id null means a shared/global exercise visible to every gym.
create policy "exercise_library_select_by_gym_or_shared"
on public.exercise_library
for select
to authenticated
using (
  private.has_any_role(array['super_admin'])
  or gym_id is null
  or private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
  or is_active = true
);

create policy "exercise_library_insert_by_gym"
on public.exercise_library
for insert
to authenticated
with check (
  gym_id is not null and private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
);

create policy "exercise_library_update_by_gym"
on public.exercise_library
for update
to authenticated
using (
  gym_id is not null and private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
)
with check (
  gym_id is not null and private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
);

create policy "exercise_library_delete_by_gym"
on public.exercise_library
for delete
to authenticated
using (
  gym_id is not null and private.has_gym_role(array['admin', 'staff', 'coach'], gym_id)
);

-- =========================================================
-- client_onboarding_responses
-- =========================================================

create table public.client_onboarding_responses (
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

create index client_onboarding_responses_client_id_idx on public.client_onboarding_responses (client_id);

alter table public.client_onboarding_responses enable row level security;

create trigger set_client_onboarding_responses_updated_at
before update on public.client_onboarding_responses
for each row
execute function public.set_updated_at();

create policy "client_onboarding_responses_select_accessible"
on public.client_onboarding_responses
for select
to authenticated
using (private.can_access_client(client_id));

create policy "client_onboarding_responses_insert_accessible"
on public.client_onboarding_responses
for insert
to authenticated
with check (private.can_access_client(client_id));

create policy "client_onboarding_responses_update_accessible"
on public.client_onboarding_responses
for update
to authenticated
using (private.can_access_client(client_id))
with check (private.can_access_client(client_id));

create policy "client_onboarding_responses_delete_staff"
on public.client_onboarding_responses
for delete
to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.id = client_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
  )
);

-- =========================================================
-- client_checkins (coaching progress check-ins, distinct from the
-- front-desk check_ins table in 0002_core_business.sql)
-- =========================================================

create table public.client_checkins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  checkin_date date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg > 0),
  client_notes text,
  coach_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, checkin_date)
);

create index client_checkins_client_id_idx on public.client_checkins (client_id);
create index client_checkins_checkin_date_idx on public.client_checkins (checkin_date desc);
create index client_checkins_client_id_checkin_date_idx
  on public.client_checkins (client_id, checkin_date desc);
create index client_checkins_gym_id_idx on public.client_checkins (gym_id);

alter table public.client_checkins enable row level security;

create trigger set_client_checkins_updated_at
before update on public.client_checkins
for each row
execute function public.set_updated_at();

create or replace function public.client_checkins_derive_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'client_checkins: client_id % not found', new.client_id;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.client_checkins_derive_gym() from public, anon, authenticated;

create trigger client_checkins_derive_gym_trigger
before insert or update on public.client_checkins
for each row
execute function public.client_checkins_derive_gym();

create policy "client_checkins_select_accessible"
on public.client_checkins
for select
to authenticated
using (private.can_access_client(client_id));

create policy "client_checkins_insert_accessible"
on public.client_checkins
for insert
to authenticated
with check (private.can_access_client(client_id));

create policy "client_checkins_update_accessible"
on public.client_checkins
for update
to authenticated
using (private.can_access_client(client_id))
with check (private.can_access_client(client_id));

create policy "client_checkins_delete_by_gym"
on public.client_checkins
for delete
to authenticated
using (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

-- =========================================================
-- client_checkin_photos
-- =========================================================

create table public.client_checkin_photos (
  id uuid primary key default gen_random_uuid(),
  client_checkin_id uuid not null references public.client_checkins (id) on delete cascade,
  photo_type text not null check (photo_type in ('front', 'side', 'back')),
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (client_checkin_id, photo_type)
);

create index client_checkin_photos_client_checkin_id_idx
  on public.client_checkin_photos (client_checkin_id);
create index client_checkin_photos_photo_type_idx on public.client_checkin_photos (photo_type);

alter table public.client_checkin_photos enable row level security;

create policy "client_checkin_photos_select_accessible"
on public.client_checkin_photos
for select
to authenticated
using (
  exists (
    select 1 from public.client_checkins cc
    where cc.id = client_checkin_id
      and private.can_access_client(cc.client_id)
  )
);

create policy "client_checkin_photos_insert_accessible"
on public.client_checkin_photos
for insert
to authenticated
with check (
  exists (
    select 1 from public.client_checkins cc
    where cc.id = client_checkin_id
      and private.can_access_client(cc.client_id)
  )
);

create policy "client_checkin_photos_update_accessible"
on public.client_checkin_photos
for update
to authenticated
using (
  exists (
    select 1 from public.client_checkins cc
    where cc.id = client_checkin_id
      and private.can_access_client(cc.client_id)
  )
)
with check (
  exists (
    select 1 from public.client_checkins cc
    where cc.id = client_checkin_id
      and private.can_access_client(cc.client_id)
  )
);

create policy "client_checkin_photos_delete_by_gym"
on public.client_checkin_photos
for delete
to authenticated
using (
  exists (
    select 1 from public.client_checkins cc
    where cc.id = client_checkin_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cc.gym_id)
  )
);

-- =========================================================
-- client_routines / client_routine_days / client_routine_exercises
-- =========================================================

create table public.client_routines (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete restrict,
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

create index client_routines_client_id_idx on public.client_routines (client_id);
create index client_routines_coach_profile_id_idx on public.client_routines (coach_profile_id);
create index client_routines_status_idx on public.client_routines (status);
create index client_routines_client_id_status_idx on public.client_routines (client_id, status);
create index client_routines_gym_id_idx on public.client_routines (gym_id);
create unique index client_routines_one_active_per_client_idx
  on public.client_routines (client_id)
  where status = 'active';

alter table public.client_routines enable row level security;

create trigger set_client_routines_updated_at
before update on public.client_routines
for each row
execute function public.set_updated_at();

-- gym_id is always derived from client_id. If coach_profile_id is set and
-- belongs to a different gym than the client (and is not super_admin), that
-- is a genuine inconsistency -- raise, do not silently pick a side.
create or replace function public.client_routines_validate_gym()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_gym uuid;
  v_coach_gym uuid;
  v_coach_role text;
begin
  select gym_id into v_client_gym from public.clients where id = new.client_id;
  if v_client_gym is null then
    raise exception 'client_routines: client_id % not found', new.client_id;
  end if;

  if new.coach_profile_id is not null then
    select gym_id, role into v_coach_gym, v_coach_role
    from public.profiles
    where id = new.coach_profile_id;

    if v_coach_role is null then
      raise exception 'client_routines: coach_profile_id % not found', new.coach_profile_id;
    end if;

    if v_coach_role <> 'super_admin' and v_coach_gym <> v_client_gym then
      raise exception
        'client_routines: coach and client belong to different gyms (coach_gym=%, client_gym=%)',
        v_coach_gym, v_client_gym;
    end if;
  end if;

  new.gym_id := v_client_gym;
  return new;
end;
$$;

revoke all on function public.client_routines_validate_gym() from public, anon, authenticated;

create trigger client_routines_validate_gym_trigger
before insert or update on public.client_routines
for each row
execute function public.client_routines_validate_gym();

create policy "client_routines_select_accessible"
on public.client_routines
for select
to authenticated
using (private.can_access_client(client_id));

create policy "client_routines_insert_by_gym"
on public.client_routines
for insert
to authenticated
with check (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

create policy "client_routines_update_by_gym"
on public.client_routines
for update
to authenticated
using (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id))
with check (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

create policy "client_routines_delete_by_gym"
on public.client_routines
for delete
to authenticated
using (private.has_gym_role(array['admin', 'staff', 'coach'], gym_id));

create table public.client_routine_days (
  id uuid primary key default gen_random_uuid(),
  client_routine_id uuid not null references public.client_routines (id) on delete cascade,
  day_index integer not null check (day_index > 0),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (client_routine_id, day_index)
);

create index client_routine_days_client_routine_id_idx
  on public.client_routine_days (client_routine_id);
create index client_routine_days_client_routine_id_day_index_idx
  on public.client_routine_days (client_routine_id, day_index);

alter table public.client_routine_days enable row level security;

create policy "client_routine_days_select_accessible"
on public.client_routine_days
for select
to authenticated
using (
  exists (
    select 1 from public.client_routines cr
    where cr.id = client_routine_id
      and private.can_access_client(cr.client_id)
  )
);

create policy "client_routine_days_insert_by_gym"
on public.client_routine_days
for insert
to authenticated
with check (
  exists (
    select 1 from public.client_routines cr
    where cr.id = client_routine_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

create policy "client_routine_days_update_by_gym"
on public.client_routine_days
for update
to authenticated
using (
  exists (
    select 1 from public.client_routines cr
    where cr.id = client_routine_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
)
with check (
  exists (
    select 1 from public.client_routines cr
    where cr.id = client_routine_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

create policy "client_routine_days_delete_by_gym"
on public.client_routine_days
for delete
to authenticated
using (
  exists (
    select 1 from public.client_routines cr
    where cr.id = client_routine_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

create table public.client_routine_exercises (
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

create index client_routine_exercises_client_routine_day_id_idx
  on public.client_routine_exercises (client_routine_day_id);
create index client_routine_exercises_exercise_id_idx
  on public.client_routine_exercises (exercise_id);
create index client_routine_exercises_client_routine_day_sort_order_idx
  on public.client_routine_exercises (client_routine_day_id, sort_order);

alter table public.client_routine_exercises enable row level security;

create policy "client_routine_exercises_select_accessible"
on public.client_routine_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days crd
    join public.client_routines cr on cr.id = crd.client_routine_id
    where crd.id = client_routine_day_id
      and private.can_access_client(cr.client_id)
  )
);

create policy "client_routine_exercises_insert_by_gym"
on public.client_routine_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from public.client_routine_days crd
    join public.client_routines cr on cr.id = crd.client_routine_id
    where crd.id = client_routine_day_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

create policy "client_routine_exercises_update_by_gym"
on public.client_routine_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days crd
    join public.client_routines cr on cr.id = crd.client_routine_id
    where crd.id = client_routine_day_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
)
with check (
  exists (
    select 1
    from public.client_routine_days crd
    join public.client_routines cr on cr.id = crd.client_routine_id
    where crd.id = client_routine_day_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

create policy "client_routine_exercises_delete_by_gym"
on public.client_routine_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from public.client_routine_days crd
    join public.client_routines cr on cr.id = crd.client_routine_id
    where crd.id = client_routine_day_id
      and private.has_gym_role(array['admin', 'staff', 'coach'], cr.gym_id)
  )
);

-- =========================================================
-- exercise_media
-- =========================================================

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercise_library (id) on delete cascade,
  url text not null,
  sort_order integer not null default 1 check (sort_order > 0),
  alt_text text,
  created_at timestamptz not null default now()
);

create index exercise_media_exercise_id_idx on public.exercise_media (exercise_id);
create index exercise_media_exercise_id_sort_order_idx
  on public.exercise_media (exercise_id, sort_order);

alter table public.exercise_media enable row level security;

create policy "exercise_media_select_by_visibility"
on public.exercise_media
for select
to authenticated
using (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and (
        el.gym_id is null
        or private.has_gym_role(array['admin', 'staff', 'coach'], el.gym_id)
        or el.is_active = true
      )
  )
);

create policy "exercise_media_insert_by_gym"
on public.exercise_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and el.gym_id is not null
      and private.has_gym_role(array['admin', 'staff', 'coach'], el.gym_id)
  )
);

create policy "exercise_media_update_by_gym"
on public.exercise_media
for update
to authenticated
using (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and el.gym_id is not null
      and private.has_gym_role(array['admin', 'staff', 'coach'], el.gym_id)
  )
)
with check (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and el.gym_id is not null
      and private.has_gym_role(array['admin', 'staff', 'coach'], el.gym_id)
  )
);

create policy "exercise_media_delete_by_gym"
on public.exercise_media
for delete
to authenticated
using (
  exists (
    select 1 from public.exercise_library el
    where el.id = exercise_id
      and el.gym_id is not null
      and private.has_gym_role(array['admin', 'staff', 'coach'], el.gym_id)
  )
);

-- =========================================================
-- routine_templates / routine_template_days / routine_template_exercises
-- Templates are staff tooling, not tied to a specific client, and are kept
-- role-scoped only (no gym_id) matching current behavior -- revisit if
-- templates ever need to be gym-private.
-- =========================================================

create table public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  source_routine_id uuid references public.client_routines (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routine_templates_title_idx on public.routine_templates (title);
create index routine_templates_created_by_profile_id_idx
  on public.routine_templates (created_by_profile_id);
create index routine_templates_source_routine_id_idx
  on public.routine_templates (source_routine_id);
create index routine_templates_updated_at_idx on public.routine_templates (updated_at desc);

alter table public.routine_templates enable row level security;

create trigger set_routine_templates_updated_at
before update on public.routine_templates
for each row
execute function public.set_updated_at();

create policy "routine_templates_select_staff"
on public.routine_templates
for select
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_templates_insert_staff"
on public.routine_templates
for insert
to authenticated
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_templates_update_staff"
on public.routine_templates
for update
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']))
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_templates_delete_staff"
on public.routine_templates
for delete
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

create table public.routine_template_days (
  id uuid primary key default gen_random_uuid(),
  routine_template_id uuid not null references public.routine_templates (id) on delete cascade,
  day_index integer not null check (day_index > 0),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (routine_template_id, day_index)
);

create index routine_template_days_routine_template_id_idx
  on public.routine_template_days (routine_template_id);
create index routine_template_days_routine_template_id_day_index_idx
  on public.routine_template_days (routine_template_id, day_index);

alter table public.routine_template_days enable row level security;

create policy "routine_template_days_select_staff"
on public.routine_template_days
for select
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_days_insert_staff"
on public.routine_template_days
for insert
to authenticated
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_days_update_staff"
on public.routine_template_days
for update
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']))
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_days_delete_staff"
on public.routine_template_days
for delete
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

create table public.routine_template_exercises (
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

create index routine_template_exercises_routine_template_day_id_idx
  on public.routine_template_exercises (routine_template_day_id);
create index routine_template_exercises_exercise_id_idx
  on public.routine_template_exercises (exercise_id);
create index routine_template_exercises_routine_template_day_sort_order_idx
  on public.routine_template_exercises (routine_template_day_id, sort_order);

alter table public.routine_template_exercises enable row level security;

create policy "routine_template_exercises_select_staff"
on public.routine_template_exercises
for select
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_exercises_insert_staff"
on public.routine_template_exercises
for insert
to authenticated
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_exercises_update_staff"
on public.routine_template_exercises
for update
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']))
with check (private.has_any_role(array['admin', 'staff', 'coach']));

create policy "routine_template_exercises_delete_staff"
on public.routine_template_exercises
for delete
to authenticated
using (private.has_any_role(array['admin', 'staff', 'coach']));

-- See the matching note in 0001_foundation.sql: hosted Supabase projects
-- grant anon table-level access by default that the local Docker stack
-- does not, so this is repeated for every table this migration creates.
revoke all on table
  public.exercise_library, public.client_onboarding_responses,
  public.client_checkins, public.client_checkin_photos,
  public.client_routines, public.client_routine_days,
  public.client_routine_exercises, public.exercise_media,
  public.routine_templates, public.routine_template_days,
  public.routine_template_exercises
from anon;
