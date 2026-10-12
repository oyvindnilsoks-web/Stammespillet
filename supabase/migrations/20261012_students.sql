-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: students).
-- One row per Feide user who has logged in. user_id is feide:<sub>.
create table if not exists public.students (
  user_id text primary key,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_login timestamptz
);

-- Row level security on with no policies: the browser (anon key) can neither
-- read nor write this table. Only the Netlify functions (service role) can.
alter table public.students enable row level security;

comment on table public.students is 'One row per Feide user who has logged in. user_id is feide:<sub>. is_admin lets a teacher open /admin.html with Feide instead of the password.';
