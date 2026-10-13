-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-20 (migration name: council_leader_user).
-- The council leader is a student, not a villager: anyone who belongs to the village
-- can be the one who presses save, also in a village made by a group where nobody has
-- written a villager yet. leader_character_id from an earlier version is no longer used.
alter table public.councils add column if not exists leader_user text;
