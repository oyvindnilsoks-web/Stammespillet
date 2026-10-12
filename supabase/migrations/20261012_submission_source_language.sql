-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: submission_source_language).
-- A student can write in Norwegian. charter then holds the English translation
-- (what the game and the lexicon show) and charter_original the Norwegian text.
alter table public.tribes
  add column if not exists source_lang text not null default 'en' check (source_lang in ('en', 'no')),
  add column if not exists charter_original jsonb;

alter table public.characters
  add column if not exists source_lang text not null default 'en' check (source_lang in ('en', 'no')),
  add column if not exists charter_original jsonb;

comment on column public.tribes.charter_original is 'The student''s own answers when they were written in Norwegian (source_lang = no). charter holds the English translation.';
comment on column public.characters.charter_original is 'The student''s own answers when they were written in Norwegian (source_lang = no). charter holds the English translation.';
