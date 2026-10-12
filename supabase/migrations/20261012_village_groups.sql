-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: village_groups).
-- A group of students can write one village together. The student who creates
-- it gets a short code; the others enter it to join. Members can edit the
-- village until the teacher has reviewed it.
alter table public.tribes add column if not exists join_code text;
create unique index if not exists tribes_join_code_key on public.tribes (join_code) where join_code is not null;

create table if not exists public.village_members (
  tribe_id text not null references public.tribes (id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (tribe_id, user_id)
);

-- Row level security on with no policies: only the Netlify functions
-- (service role) can read or write group membership.
alter table public.village_members enable row level security;

comment on column public.tribes.join_code is 'Short code a group member enters to join and edit this village while it is pending.';
comment on table public.village_members is 'Students who may edit a pending village together with its creator. user_id is the session id (feide:<sub>, name:<name>).';
