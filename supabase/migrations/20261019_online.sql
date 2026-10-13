-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-19 (migration name: online).
-- Who has the game open right now, for the "Online" button in the menu bar. The page
-- sends a heartbeat every 30 seconds while a student is logged in.
create table if not exists public.online (
  user_id text primary key,
  seen_at timestamptz not null default now()
);

-- Row level security on with no policies and no privileges for the browser.
alter table public.online enable row level security;
revoke all on public.online from anon, authenticated;
