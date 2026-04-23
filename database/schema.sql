-- Sprint 1 migration schema for existing BTCMap-style DB
-- Safe to run repeatedly.

-- 1) App users table (new)
create table if not exists public.users (
  id bigint generated always as identity primary key,
  telegram_id text not null unique,
  nickname text not null,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

-- 2) Extend existing places table for app-owned submissions / moderation
alter table if exists public.places
  add column if not exists created_by_user_id bigint,
  add column if not exists is_approved boolean not null default false,
  add column if not exists image_url text,
  add column if not exists imported_source text;

-- 3) FK ownership link
alter table if exists public.places
  drop constraint if exists places_created_by_user_id_fkey;

alter table if exists public.places
  add constraint places_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.users(id) on delete set null;

-- 4) Helpful defaults for lifecycle timestamps
alter table if exists public.places
  alter column created_at set default now(),
  alter column updated_at set default now();

-- 5) Indexes for API query paths
create index if not exists idx_places_is_approved_created_at
  on public.places (is_approved, created_at desc);

create index if not exists idx_places_created_by_user_id
  on public.places (created_by_user_id);

create index if not exists idx_places_lat_lon
  on public.places (lat, lon);

-- 6) Optional backfill policy for existing imported BTCMap rows
--    Mark legacy imported/verified data as approved.
update public.places
set is_approved = true
where is_approved = false
  and (
    verified_at is not null
    or btcmap_id is not null
    or bitcoin is true
  );
