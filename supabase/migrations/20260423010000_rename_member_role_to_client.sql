update public.profiles
set role = 'client'
where role = 'member';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('super_admin', 'admin', 'staff', 'coach', 'client'));

alter table public.profiles
alter column role set default 'client';
