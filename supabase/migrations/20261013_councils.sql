-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-13 (migration name: councils).
-- The council of a village: how it is ruled, its god, its laws, and which villages
-- it is allied with or at war with. Written together by the students who live in
-- the village (started it, joined its group, or wrote a villager for it).
create table if not exists public.councils (
  tribe_id text primary key references public.tribes (id) on delete cascade,
  government text not null default '',
  god text not null default '',
  laws text not null default '',
  allies text[] not null default '{}',
  enemies text[] not null default '{}',
  source_lang text not null default 'en',
  original jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Row level security on with no policies, and no privileges for the browser:
-- only the Netlify functions (service role) read or write councils.
alter table public.councils enable row level security;
revoke all on public.councils from anon, authenticated;

comment on table public.councils is 'Government, god, laws, allies and enemies of a village. allies and enemies hold tribe ids. original keeps the Norwegian text when it was written in Norwegian.';
