-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-14 (migration name: world_state).
-- The shared state of the game world. One row. The evil villages spread poison
-- across the map; poison is a grid of 140 x 105 cells (the same grid the game
-- builds from the map picture), stored as base64, one byte per cell (0 = clean,
-- 255 = fully poisoned). The teacher can pause it, change the speed, and reset it.
create table if not exists public.world_state (
  id text primary key default 'main',
  poison text not null default '',
  step integer not null default 0,
  paused boolean not null default true,
  speed_minutes integer not null default 10,
  win_percent integer not null default 60,
  school_hours_only boolean not null default true,
  result text not null default '',
  last_step_at timestamptz,
  cleansed jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row level security on with no policies and no privileges for the browser:
-- only the Netlify functions (service role) read or write the world.
alter table public.world_state enable row level security;
revoke all on public.world_state from anon, authenticated;

insert into public.world_state (id) values ('main') on conflict (id) do nothing;
