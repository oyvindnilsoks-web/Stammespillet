-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-14 (migration name: lexicon_entries).
-- The texts in the Clan Lexicon that are written for the whole class to read: a short
-- entry for each village, a longer biography for each villager, and the chapters of the
-- history of the world. They are written from what the students wrote on Contribute and
-- renewed every week. source_updated_at is the updated_at of the village or villager
-- the text was written from, so a later change shows that the text has to be renewed.
create table if not exists public.lexicon_entries (
  id text primary key,
  kind text not null check (kind in ('village', 'bio', 'history')),
  ref_id text,
  title text not null default '',
  body text not null default '',
  position int not null default 0,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists lexicon_entries_kind_idx on public.lexicon_entries (kind, position);
alter table public.lexicon_entries enable row level security;
revoke all on public.lexicon_entries from anon, authenticated;

-- The old lore is removed: the story scenes, and the old culture text.
delete from public.scenes;
update public.tribes set culture = '' where coalesce(culture, '') <> '';
