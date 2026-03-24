create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_last_name_idx on public.clients (last_name);
create index if not exists clients_first_name_idx on public.clients (first_name);

alter table public.clients enable row level security;

create policy "clients_select_authenticated"
on public.clients
for select
to authenticated
using (true);

create policy "clients_insert_authenticated"
on public.clients
for insert
to authenticated
with check (true);

create policy "clients_update_authenticated"
on public.clients
for update
to authenticated
using (true)
with check (true);
