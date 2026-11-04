-- Apply after schema.sql. The API uses the service role for this function.
create table if not exists public.location_checkins (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  location_id bigint not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.location_checkins enable row level security;
revoke all on public.location_checkins from anon, authenticated;
grant select, insert on public.location_checkins to service_role;
grant usage, select on sequence public.location_checkins_id_seq to service_role;

create index if not exists location_checkins_user_place_created_idx
  on public.location_checkins (user_id, location_id, created_at desc);

create or replace function public.create_location_checkin(p_user_id bigint, p_location_id bigint)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  last_checkin timestamptz;
  new_id bigint;
  checked_in_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_location_id::text, 0));
  select created_at into last_checkin
  from public.location_checkins
  where user_id = p_user_id and location_id = p_location_id
  order by created_at desc limit 1;

  if last_checkin > now() - interval '24 hours' then
    return jsonb_build_object('status', 'cooldown', 'nextEligibleAt', last_checkin + interval '24 hours');
  end if;

  insert into public.location_checkins (user_id, location_id)
  values (p_user_id, p_location_id)
  returning id, created_at into new_id, checked_in_at;
  return jsonb_build_object('status', 'ok', 'id', new_id, 'checkedInAt', checked_in_at,
    'nextEligibleAt', checked_in_at + interval '24 hours');
end;
$$;

revoke all on function public.create_location_checkin(bigint, bigint) from public, anon, authenticated;
grant execute on function public.create_location_checkin(bigint, bigint) to service_role;
