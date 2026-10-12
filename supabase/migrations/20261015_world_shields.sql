-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-15 (migration name: world_shields).
-- A village keeps the poison away only while it has shield. Students fill the shield
-- of their villages by solving tasks (vocabulary and maths); every poison step takes
-- one off. So the poison spreads towards the villages that do not solve tasks.
alter table public.world_state add column if not exists shields jsonb not null default '{}'::jsonb;
