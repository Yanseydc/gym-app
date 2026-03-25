create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists check_ins_client_id_idx on public.check_ins (client_id);
create index if not exists check_ins_checked_in_at_idx on public.check_ins (checked_in_at desc);

alter table public.check_ins enable row level security;

create policy "check_ins_select_authenticated"
on public.check_ins
for select
to authenticated
using (true);

create policy "check_ins_insert_authenticated"
on public.check_ins
for insert
to authenticated
with check (true);
