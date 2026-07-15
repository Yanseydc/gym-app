-- 0006 storage
-- The "checkins" bucket and its storage.objects policies existed only as
-- Dashboard-created configuration in the previous project, invisible to
-- any migration. Both are defined here explicitly so a fresh project is
-- fully reproducible from migrations alone.
--
-- Path convention (unchanged from before): objects are stored under
-- "<client_id>/<filename>", where <client_id> is the folder name used by
-- the SELECT policy to resolve which client a photo belongs to.
--
-- Fix applied here: the previous policies only checked
-- has_any_role(admin/staff/coach) with no gym comparison, so staff of any
-- gym could read/write check-in photos of any other gym's clients. Every
-- policy below now resolves the owning gym via clients.gym_id (through
-- client_checkin_photos -> client_checkins -> clients) and requires it to
-- match the actor's own gym (has_gym_role), in addition to (not instead
-- of) the existing self-service branch for the linked client.

insert into storage.buckets (id, name, public)
values ('checkins', 'checkins', false)
on conflict (id) do nothing;

create policy "checkins_select_by_gym_or_own_client"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'checkins'
  and (
    private.has_any_role(array['admin', 'staff', 'coach'])
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
    )
  )
  or (
    array_length(storage.foldername(name), 1) >= 1
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and private.is_linked_client(((storage.foldername(name))[1])::uuid)
  )
);

create policy "checkins_insert_staff_by_gym"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'checkins'
  and exists (
    select 1
    from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
  )
);

create policy "checkins_update_staff_by_gym"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'checkins'
  and exists (
    select 1
    from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
  )
)
with check (
  bucket_id = 'checkins'
  and exists (
    select 1
    from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
  )
);

create policy "checkins_delete_staff_by_gym"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'checkins'
  and exists (
    select 1
    from public.clients c
    where c.id::text = (storage.foldername(name))[1]
      and private.has_gym_role(array['admin', 'staff', 'coach'], c.gym_id)
  )
);
