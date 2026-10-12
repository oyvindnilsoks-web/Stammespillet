-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: drafts).
-- Unsent Contribute text kept on the server, so a student can continue on
-- another computer. ref_id is "new" or the id of the pending submission.
create table if not exists public.drafts (
  owner_id text not null,
  kind text not null check (kind in ('village', 'villager')),
  ref_id text not null,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, kind, ref_id)
);

-- Row level security on with no policies: only the Netlify functions
-- (service role) can read or write drafts, never the browser.
alter table public.drafts enable row level security;

comment on table public.drafts is 'Unsent Contribute text, one row per student, form and submission. ref_id is "new" or the id of the pending submission being edited. owner_id is the session id (feide:<sub>, name:<name>).';
