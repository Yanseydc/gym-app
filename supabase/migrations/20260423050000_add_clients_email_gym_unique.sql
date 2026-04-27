-- Prevent duplicate client emails within the same gym.
-- Before applying this index in an environment with existing data, run the
-- duplicate detection query below and resolve any returned rows manually.

select
  lower(trim(email)) as email_normalized,
  gym_id,
  count(*)
from public.clients
where email is not null
  and trim(email) <> ''
group by lower(trim(email)), gym_id
having count(*) > 1;

-- Enforce case-insensitive, trimmed email uniqueness per gym.
-- Null and empty emails are ignored.

create unique index if not exists clients_email_gym_unique
on public.clients (lower(trim(email)), gym_id)
where email is not null and trim(email) <> '';
