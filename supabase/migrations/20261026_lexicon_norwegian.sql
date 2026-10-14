-- The Norwegian version of the Clan Lexicon texts: translated with DeepL the first time a
-- student asks for it, and again when the English text has been renewed.
alter table public.lexicon_entries add column if not exists title_no text;
alter table public.lexicon_entries add column if not exists body_no text;
alter table public.lexicon_entries add column if not exists no_updated_at timestamptz;
