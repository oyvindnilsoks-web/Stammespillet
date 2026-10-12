-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: villager_figure).
-- Which figure a villager has in the game: a frame number from the heroes sheet.
-- null means the game picks one from the villager's id.
alter table public.characters add column if not exists sprite smallint;
comment on column public.characters.sprite is 'Frame in the heroes sheet (Kenney Tiny Dungeon) the student chose for this villager in the game. null = chosen automatically.';
