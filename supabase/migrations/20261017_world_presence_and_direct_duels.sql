-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-17 (migration name: world_presence_and_direct_duels).
-- Students on the world map can see each other and challenge each other to a word
-- battle. The game tells the server where the student stands on the map every few
-- seconds (presence, with no village), and a battle can be aimed at one student.
alter table public.presence alter column tribe_id drop not null;
alter table public.presence add column if not exists fx double precision;
alter table public.presence add column if not exists fy double precision;
alter table public.presence add column if not exists look smallint;
alter table public.duels add column if not exists direct boolean not null default false;
