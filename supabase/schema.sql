-- ============================================================
-- FindArrangements.com — Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- One row per user. Linked to Supabase's built-in auth.users table.
-- ------------------------------------------------------------
create type user_role as enum ('sugar_baby', 'sugar_daddy', 'sugar_mommy');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role user_role not null,
  birthdate date not null,
  gender text,
  bio text,
  city text,
  region text,
  country text,
  is_verified_adult boolean default false,   -- true once they pass the 18+ checkbox/DOB check
  is_banned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Enforce 18+ at the database level, not just the UI
  constraint must_be_adult check (birthdate <= (current_date - interval '18 years'))
);

-- ------------------------------------------------------------
-- 2. PHOTOS
-- Each profile can have multiple photos; one marked as primary.
-- ------------------------------------------------------------
create table photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,        -- path in Supabase Storage bucket
  is_primary boolean default false,
  moderation_status text default 'pending', -- pending | approved | rejected
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. LIKES
-- A one-directional "like" from one profile to another.
-- ------------------------------------------------------------
create table likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null references profiles(id) on delete cascade,
  liked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (liker_id, liked_id)
);

-- ------------------------------------------------------------
-- 4. MATCHES
-- Created automatically when two profiles like each other.
-- ------------------------------------------------------------
create table matches (
  id uuid primary key default gen_random_uuid(),
  profile_one_id uuid not null references profiles(id) on delete cascade,
  profile_two_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (profile_one_id, profile_two_id)
);

-- ------------------------------------------------------------
-- 5. MESSAGES
-- Chat messages tied to a match.
-- ------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 6. BLOCKS
-- Lets a user hide another user completely.
-- ------------------------------------------------------------
create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

-- ------------------------------------------------------------
-- 7. REPORTS
-- Lets a user flag another user/profile for review.
-- ------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text default 'open', -- open | reviewed | dismissed
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is CRITICAL — without it, anyone with your public API key
-- could read/write any row in these tables via Supabase's API.
-- ============================================================

alter table profiles enable row level security;
alter table photos enable row level security;
alter table likes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;

-- PROFILES: anyone logged in can view non-banned profiles;
-- users can only edit their own.
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated' and is_banned = false);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- PHOTOS: viewable by anyone authenticated (if approved); only owner can insert/delete.
create policy "Approved photos are viewable by authenticated users"
  on photos for select
  using (auth.role() = 'authenticated' and moderation_status = 'approved');

create policy "Users can view their own photos regardless of status"
  on photos for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own photos"
  on photos for insert
  with check (auth.uid() = profile_id);

create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = profile_id);

-- LIKES: users can see likes involving them; can only create likes as themselves.
create policy "Users can view likes involving them"
  on likes for select
  using (auth.uid() = liker_id or auth.uid() = liked_id);

create policy "Users can create their own likes"
  on likes for insert
  with check (auth.uid() = liker_id);

create policy "Users can delete their own likes"
  on likes for delete
  using (auth.uid() = liker_id);

-- MATCHES: viewable only by the two people in it.
create policy "Users can view their own matches"
  on matches for select
  using (auth.uid() = profile_one_id or auth.uid() = profile_two_id);

-- MESSAGES: viewable/insertable only by participants in the related match.
create policy "Users can view messages in their matches"
  on messages for select
  using (
    exists (
      select 1 from matches m
      where m.id = messages.match_id
      and (m.profile_one_id = auth.uid() or m.profile_two_id = auth.uid())
    )
  );

create policy "Users can send messages in their matches"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from matches m
      where m.id = messages.match_id
      and (m.profile_one_id = auth.uid() or m.profile_two_id = auth.uid())
    )
  );

-- BLOCKS: users manage their own block list.
create policy "Users can view their own blocks"
  on blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can create their own blocks"
  on blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can remove their own blocks"
  on blocks for delete
  using (auth.uid() = blocker_id);

-- REPORTS: users can create reports and view ones they filed.
create policy "Users can view their own reports"
  on reports for select
  using (auth.uid() = reporter_id);

create policy "Users can file reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

-- ============================================================
-- FUNCTION + TRIGGER: auto-create a match when likes are mutual
-- ============================================================
create or replace function check_mutual_like()
returns trigger as $$
begin
  if exists (
    select 1 from likes
    where liker_id = new.liked_id
    and liked_id = new.liker_id
  ) then
    insert into matches (profile_one_id, profile_two_id)
    values (
      least(new.liker_id, new.liked_id),
      greatest(new.liker_id, new.liked_id)
    )
    on conflict (profile_one_id, profile_two_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_like_created
  after insert on likes
  for each row
  execute function check_mutual_like();
