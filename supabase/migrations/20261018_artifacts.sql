-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-18 (migration name: artifacts).
-- Artifacts the students draw on paper and scan (photograph) into the game. The
-- teacher approves one and sets the rank on the XP ladder (1 to 20) where it
-- unlocks; everyone who reaches that rank finds it in their backpack.
create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  description text not null default '',
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rank_required integer not null default 1 check (rank_required between 1 and 20),
  created_at timestamptz not null default now()
);
create index if not exists artifacts_owner_idx on public.artifacts (owner);

-- Row level security on with no policies and no privileges for the browser.
alter table public.artifacts enable row level security;
revoke all on public.artifacts from anon, authenticated;
