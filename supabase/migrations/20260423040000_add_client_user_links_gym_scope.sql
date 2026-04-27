-- Add gym scope to portal client links without modifying existing link data.
-- Existing rows keep gym_id null until backfilled manually or by application updates.

alter table public.client_user_links
add column if not exists gym_id uuid null references public.gyms (id);

create index if not exists client_user_links_gym_id_idx
on public.client_user_links (gym_id);

alter table public.client_user_links enable row level security;

drop policy if exists "client_user_links_select_staff_or_self" on public.client_user_links;
drop policy if exists "client_user_links_insert_staff" on public.client_user_links;
drop policy if exists "client_user_links_update_staff" on public.client_user_links;
drop policy if exists "client_user_links_delete_staff" on public.client_user_links;

create policy "client_user_links_select_by_gym_or_self"
on public.client_user_links
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role in ('admin', 'staff', 'coach')
          and (
            public.client_user_links.gym_id = p.gym_id
            or exists (
              select 1
              from public.clients c
              where c.id = public.client_user_links.client_id
                and c.gym_id = p.gym_id
            )
          )
        )
      )
  )
);

create policy "client_user_links_insert_by_gym"
on public.client_user_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role in ('admin', 'staff', 'coach')
          and public.client_user_links.gym_id = p.gym_id
        )
      )
  )
);

create policy "client_user_links_update_by_gym"
on public.client_user_links
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role in ('admin', 'staff', 'coach')
          and public.client_user_links.gym_id = p.gym_id
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role in ('admin', 'staff', 'coach')
          and public.client_user_links.gym_id = p.gym_id
        )
      )
  )
);

create policy "client_user_links_delete_by_gym"
on public.client_user_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or (
          p.role in ('admin', 'staff', 'coach')
          and public.client_user_links.gym_id = p.gym_id
        )
      )
  )
);
