-- Land on the map. owners: one byte per cell of the 140 x 105 grid (0 = nobody, n =
-- the n-th village in owner_ids), without the home regions, which are worked out from
-- where the villages stand. anchors: where each village stood when its land was last
-- settled; a village that moves on the map gets only its home region back.
-- territory_claims is the log of who took land and when: a village may take land once
-- every 24 hours.
alter table public.world_state add column if not exists owners text not null default '';
alter table public.world_state add column if not exists owner_ids jsonb not null default '[]'::jsonb;
alter table public.world_state add column if not exists anchors jsonb not null default '{}'::jsonb;

create table if not exists public.territory_claims (
  id bigint generated always as identity primary key,
  tribe_id text not null,
  user_id text not null,
  cx int not null,
  cy int not null,
  radius int not null,
  cells int not null,
  created_at timestamptz not null default now()
);
create index if not exists territory_claims_tribe_idx on public.territory_claims (tribe_id, created_at desc);
alter table public.territory_claims enable row level security;
revoke all on public.territory_claims from anon, authenticated;
