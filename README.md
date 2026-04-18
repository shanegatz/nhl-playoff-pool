# NHL Playoff Pool

A lightweight Next.js app for running an NHL playoff pool. Each participant ranks all 16 playoff teams (top team = 16, bottom = 1). As the playoffs progress, an admin updates team wins and the leaderboard recomputes automatically: `points_per_team = rank × wins`, summed across a participant's 16 picks.

## Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres + Auth) — one vendor, email + password sign-in
- Tailwind CSS
- Vercel for hosting

No NextAuth, no Prisma, no extra services.

## Local setup

### 1. Create a Supabase project

1. Go to https://supabase.com, create a free project.
2. In **Project Settings → API**, copy the Project URL and the `anon` public key.
3. (Optional) In **Authentication → Providers → Email**, decide whether to require email confirmation. For a small private pool you can turn "Confirm email" off to skip the confirmation step.

### 2. Run the schema

1. Open **SQL Editor** in Supabase.
2. Paste the contents of `supabase/schema.sql` and run it.
3. This creates `teams`, `entries`, `entry_rankings`, `admins`, the `entry_scores` view, Row Level Security policies, and seeds 16 placeholder teams. Edit the seed each spring once the bracket is set.

### 3. Install and run

```bash
cp .env.local.example .env.local
# paste NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Promote yourself to admin

Sign up through the app, then back in Supabase SQL Editor run:

```sql
insert into public.admins (user_id)
values ('<your auth user uuid>');
```

You can find your uuid in **Authentication → Users**. Now the `Admin` link will appear in the header and you can edit team wins.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Import Project** → select the repo.
3. Add the environment variables from `.env.local` to the Vercel project (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Back in Supabase, **Authentication → URL Configuration**, add your Vercel URL to both the Site URL and the list of allowed redirect URLs (`https://your-app.vercel.app/auth/callback`).
5. Deploy.

## How scoring works

- Each entry has exactly 16 rows in `entry_rankings`, one per team, with ranks 1..16 unique per entry (enforced by DB constraints).
- The `entry_scores` view computes `sum(rank × team.wins)` per entry.
- Whenever an admin updates a team's wins, every entry's score recomputes on the next page load. No cron or sync job required.

## Updating the bracket each year

Edit the seed block at the bottom of `supabase/schema.sql` to reflect that year's 16 qualifiers, or just run updates in SQL Editor:

```sql
truncate public.entry_rankings, public.entries restart identity cascade;
truncate public.teams restart identity cascade;
insert into public.teams (name, abbr, conference) values
  ('Team A', 'ABC', 'East'),
  ...;
```

## Adding automatic score sync later

The schema is already factored so only `teams.wins` needs to change. When you're ready, add a Vercel Cron Job that hits a new route (e.g. `/api/sync-wins`) which uses the `SUPABASE_SERVICE_ROLE_KEY` to update `teams.wins` from the NHL public API. The rest of the app will just work.

## File map

```
src/
  app/
    layout.tsx            root layout + header
    page.tsx              leaderboard + team wins
    login/page.tsx        email + password sign in
    signup/page.tsx       email + password sign up
    auth/
      callback/route.ts   handles email confirmation redirect
      signout/route.ts    POST to sign out
    entry/
      new/page.tsx        create entry
      [id]/page.tsx       view entry detail
      [id]/edit/page.tsx  edit your own entry
    admin/page.tsx        admin-only team wins editor
  components/
    Header.tsx            nav, shows Admin link if you are one
    RankingForm.tsx       16-team rank picker, validates uniqueness
    TeamWinsEditor.tsx    +/-/save buttons per team
  lib/
    supabase/client.ts    browser Supabase client
    supabase/server.ts    server Supabase client (cookies)
  middleware.ts           refreshes the auth cookie on every request
supabase/
  schema.sql              run once in Supabase SQL Editor
```
