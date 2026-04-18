-- NHL Playoff Pool schema
-- Run this in the Supabase SQL editor on a fresh project.
-- Safe to re-run (drops and recreates tables/policies).

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Drop in reverse order ----------
drop view  if exists public.entry_scores cascade;
drop table if exists public.entry_rankings cascade;
drop table if exists public.entries cascade;
drop table if exists public.teams cascade;
drop table if exists public.admins cascade;

-- ---------- Teams ----------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  abbr        text not null unique,
  conference  text not null check (conference in ('East','West')),
  wins        int  not null default 0 check (wins >= 0),
  updated_at  timestamptz not null default now()
);

-- ---------- Entries (one user can have one entry per pool year) ----------
create table public.entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  tiebreaker_goals  int,
  created_at        timestamptz not null default now(),
  unique (user_id)
);

-- ---------- Rankings (each entry ranks every team 1..16) ----------
create table public.entry_rankings (
  id       uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  team_id  uuid not null references public.teams(id)   on delete cascade,
  rank     int  not null check (rank between 1 and 16),
  unique (entry_id, team_id),
  unique (entry_id, rank)
);

-- ---------- Admins ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------- Score view ----------
-- points for a (team in an entry) = rank * team.wins
-- total entry score = sum across all 16 teams
create or replace view public.entry_scores as
select
  e.id         as entry_id,
  e.user_id    as user_id,
  e.name       as entry_name,
  coalesce(sum(er.rank * t.wins), 0)::int as total_points
from public.entries e
left join public.entry_rankings er on er.entry_id = e.id
left join public.teams t           on t.id       = er.team_id
group by e.id, e.user_id, e.name;

-- ---------- RLS ----------
alter table public.teams          enable row level security;
alter table public.entries        enable row level security;
alter table public.entry_rankings enable row level security;
alter table public.admins         enable row level security;

-- Teams: anyone signed-in can read; only admins can write.
create policy "teams_read_all"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams_admin_write"
  on public.teams for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Entries: anyone signed-in can read all entries (for leaderboard).
-- Users can insert/update/delete their own entry.
create policy "entries_read_all"
  on public.entries for select
  to authenticated
  using (true);

create policy "entries_insert_self"
  on public.entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "entries_update_self"
  on public.entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "entries_delete_self_or_admin"
  on public.entries for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Rankings: anyone signed-in can read; users can write rows that belong to their own entry.
create policy "rankings_read_all"
  on public.entry_rankings for select
  to authenticated
  using (true);

create policy "rankings_write_own"
  on public.entry_rankings for all
  to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.id = entry_rankings.entry_id
        and (e.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.entries e
      where e.id = entry_rankings.entry_id
        and (e.user_id = auth.uid() or public.is_admin())
    )
  );

-- Admins table: admins can read; nobody writes via the API (promote via SQL).
create policy "admins_read_all"
  on public.admins for select
  to authenticated
  using (true);

-- ---------- Seed the 16 playoff teams ----------
-- Edit these each spring once the playoff bracket is set.
insert into public.teams (name, abbr, conference) values
  ('Boston Bruins',        'BOS', 'East'),
  ('Buffalo Sabres',       'BUF', 'East'),
  ('Tampa Bay Lightning',  'TBL', 'East'),
  ('Montreal Canadiens',   'MTL', 'East'),
  ('Carolina Hurricanes',  'CAR', 'East'),
  ('Ottawa Senators',      'OTT', 'East'),
  ('Pittsburgh Penguins',  'PIT', 'East'),
  ('Philadelphia Flyers',  'PHI', 'East'),
  ('Colorado Avalanche',   'COL', 'West'),
  ('Los Angeles Kings',    'LAK', 'West'),
  ('Dallas Stars',         'DAL', 'West'),
  ('Minnesota Wild',       'MIN', 'West'),
  ('Vegas Golden Knights', 'VGK', 'West'),
  ('Utah Hockey Club',     'UTA', 'West'),
  ('Edmonton Oilers',      'EDM', 'West'),
  ('Anaheim Ducks',        'ANA', 'West');

-- ---------- How to promote an admin ----------
-- After a user signs up, find their auth user id in Authentication -> Users,
-- then run:
--   insert into public.admins (user_id) values ('<paste-user-uuid>');
