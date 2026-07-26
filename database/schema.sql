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

create unique index if not exists idx_users_nickname_unique_ci
  on public.users (lower(nickname))
  where length(trim(nickname)) > 0;

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

-- 7) User-contributed location photos
create table if not exists public.location_photos (
  id bigint generated always as identity primary key,
  location_id bigint not null references public.places(id) on delete cascade,
  user_id bigint references public.users(id) on delete set null,
  image_url text not null,
  caption text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_location_photos_location_id_created_at
  on public.location_photos (location_id, created_at desc);

-- 8) User-contributed location reviews
create table if not exists public.location_reviews (
  id bigint generated always as identity primary key,
  location_id bigint not null references public.places(id) on delete cascade,
  user_id bigint references public.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_location_reviews_location_id_created_at
  on public.location_reviews (location_id, created_at desc);

-- 9) Structured review details and user-submitted location reports
alter table if exists public.location_reviews
  add column if not exists payment_status text,
  add column if not exists wallet text;

alter table if exists public.location_reviews
  alter column rating drop not null;

-- Existing star-only reviews predate payment status; retain them as Lightning reviews.
update public.location_reviews
set payment_status = 'lightning'
where payment_status is null;

-- Legacy 1-5 stars do not have the same meaning as the new optional 0-3 benefit rating.
update public.location_reviews
set rating = null;

alter table if exists public.location_reviews
  alter column payment_status set not null;

alter table if exists public.location_reviews
  drop constraint if exists location_reviews_rating_check,
  add constraint location_reviews_rating_check check (rating is null or rating between 0 and 3);

create table if not exists public.location_reports (
  id bigint generated always as identity primary key,
  location_id bigint not null references public.places(id) on delete cascade,
  user_id bigint references public.users(id) on delete set null,
  reasons text[] not null check (cardinality(reasons) > 0),
  text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_location_reports_location_id_created_at
  on public.location_reports (location_id, created_at desc);
