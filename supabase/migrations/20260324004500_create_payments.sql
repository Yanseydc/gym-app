create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  client_membership_id uuid references public.client_memberships (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'transfer', 'card')),
  payment_date date not null,
  concept text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_client_id_idx on public.payments (client_id);
create index if not exists payments_membership_id_idx on public.payments (client_membership_id);
create index if not exists payments_payment_date_idx on public.payments (payment_date desc);

alter table public.payments enable row level security;

create policy "payments_select_authenticated"
on public.payments
for select
to authenticated
using (true);

create policy "payments_insert_authenticated"
on public.payments
for insert
to authenticated
with check (true);
