-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-14 (migration name: presence_and_council_sessions).
-- A village council meets when all the villagers (the students who wrote a villager
-- for the village) are in the village at the same time. The game tells the server
-- where each student is every few seconds (presence). When everyone is there, any
-- of them can start the council (a council session), and the council can then be
-- written until the villagers leave or half an hour has passed.
create table if not exists public.presence (
  user_id text primary key,
  tribe_id text not null references public.tribes (id) on delete cascade,
  seen_at timestamptz not null default now()
);

create table if not exists public.council_sessions (
  tribe_id text primary key references public.tribes (id) on delete cascade,
  started_at timestamptz not null default now(),
  started_by text
);

-- Row level security on with no policies and no privileges for the browser.
alter table public.presence enable row level security;
alter table public.council_sessions enable row level security;
revoke all on public.presence from anon, authenticated;
revoke all on public.council_sessions from anon, authenticated;
