-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-14 (migration name: land_claims).
-- A village that wants land another village has taken. The other village's council leader
-- says yes (the land changes owner) or no, and then the two villages meet in a culture
-- battle for 24 hours: the villagers answer glossary and maths tasks. A village that does not
-- answer within 24 hours has said no. scores: { claimant: { user: {c, t} }, target: { ... } }.
create table if not exists public.land_claims (
  id bigint generated always as identity primary key,
  claimant text not null,
  target text not null,
  cells jsonb not null default '[]'::jsonb,
  proposed_by text not null,
  status text not null default 'awaiting' check (status in ('awaiting', 'battle', 'transferred', 'kept')),
  note text not null default '',
  scores jsonb not null default '{"claimant": {}, "target": {}}'::jsonb,
  created_at timestamptz not null default now(),
  respond_by timestamptz not null,
  battle_ends timestamptz,
  resolved_at timestamptz
);
create index if not exists land_claims_open_idx on public.land_claims (status);
create index if not exists land_claims_tribes_idx on public.land_claims (claimant, target, created_at desc);
alter table public.land_claims enable row level security;
revoke all on public.land_claims from anon, authenticated;
