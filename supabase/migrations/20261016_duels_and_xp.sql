-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-16 (migration name: duels_and_xp).
-- Glossary battles between two students. A student starts a battle and plays it at
-- once; the battle then waits for someone else, who gets the same questions. The
-- one with the most right answers wins (the quickest if it is equal) and gets XP.
-- The questions are kept here with their answers and are never sent to the browser.
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger text not null,
  opponent text,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  questions jsonb not null,
  a_score integer,
  a_ms integer,
  b_score integer,
  b_ms integer,
  a_started_at timestamptz not null default now(),
  b_started_at timestamptz,
  winner text,
  a_seen boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists duels_challenger_idx on public.duels (challenger);
create index if not exists duels_opponent_idx on public.duels (opponent);

create table if not exists public.xp (
  user_id text primary key,
  xp integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Row level security on with no policies and no privileges for the browser.
alter table public.duels enable row level security;
alter table public.xp enable row level security;
revoke all on public.duels from anon, authenticated;
revoke all on public.xp from anon, authenticated;
