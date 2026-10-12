-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: close_private_tables).
--
-- These tables are only used by the Netlify functions (service role). Row level
-- security already hides their rows from the browser; this also removes the
-- table privileges, so the browser cannot even query them.
revoke all on public.students, public.drafts, public.village_members, public.progress, public.settings from anon, authenticated;
