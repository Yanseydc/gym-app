alter table public.client_memberships
  drop constraint if exists client_memberships_status_check;

alter table public.client_memberships
  add constraint client_memberships_status_check
  check (status in ('active', 'expired', 'cancelled', 'pending_payment'));

alter table public.client_memberships
  alter column status set default 'pending_payment';
