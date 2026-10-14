-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-14 (migration name: council_proposals).
-- A change to the council (how the village is ruled, friends and enemies) or taking land
-- is a proposal from the council leader. The villagers vote for 40 minutes, and it passes
-- when three quarters of the villagers say yes. votes: { user id: true | false }.
create table if not exists public.council_proposals (
  id bigint generated always as identity primary key,
  tribe_id text not null,
  kind text not null check (kind in ('council', 'land')),
  payload jsonb not null default '{}'::jsonb,
  proposed_by text not null,
  votes jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'passed', 'rejected', 'expired')),
  note text not null default '',
  created_at timestamptz not null default now(),
  closes_at timestamptz not null,
  resolved_at timestamptz
);
create unique index if not exists council_proposals_one_open on public.council_proposals (tribe_id) where status = 'open';
create index if not exists council_proposals_tribe_idx on public.council_proposals (tribe_id, created_at desc);
alter table public.council_proposals enable row level security;
revoke all on public.council_proposals from anon, authenticated;
