alter table public.client_user_links
add column if not exists portal_invite_last_sent_at timestamptz null,
add column if not exists portal_invite_send_count_today integer not null default 0,
add column if not exists portal_invite_send_count_date date null;

create index if not exists client_user_links_portal_invite_last_sent_at_idx
on public.client_user_links (portal_invite_last_sent_at);
