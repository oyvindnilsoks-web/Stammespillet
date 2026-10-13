-- Students on the map talk to each other with ready-made sentences. Only the id of a
-- sentence is stored (never free text), and old messages are removed as new ones come.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  from_user text not null,
  to_user text not null,
  phrase text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_to_idx on public.chat_messages (to_user, seen);
create index if not exists chat_messages_pair_idx on public.chat_messages (from_user, to_user, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
