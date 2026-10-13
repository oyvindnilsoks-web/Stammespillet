-- XP for solving a villager's problem: once for each student and problem.
create table if not exists public.quest_xp (
  user_id text not null,
  quest_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);
alter table public.quest_xp enable row level security;
revoke all on public.quest_xp from anon, authenticated;
