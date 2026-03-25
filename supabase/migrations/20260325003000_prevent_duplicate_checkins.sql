create or replace function public.prevent_duplicate_checkins()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.check_ins
    where client_id = new.client_id
      and checked_in_at >= new.checked_in_at - interval '5 minutes'
      and checked_in_at <= new.checked_in_at
  ) then
    raise exception 'check_ins_no_duplicates_within_5_minutes';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_checkins_trigger on public.check_ins;

create trigger prevent_duplicate_checkins_trigger
before insert on public.check_ins
for each row
execute function public.prevent_duplicate_checkins();
