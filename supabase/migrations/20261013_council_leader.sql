-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-13 (migration name: council_leader).
-- A council has one leader, who presses "save" for the others. The leader is a
-- villager of the village: the student who wrote that villager is the leader.
alter table public.councils add column if not exists leader_character_id text references public.characters (id) on delete set null;
comment on column public.councils.leader_character_id is 'The villager whose student is the council leader: only that student can change the council.';
