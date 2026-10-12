-- Applied to project rdqodrcrfakgvgwkmejj on 2026-10-12 (migration name: close_public_read),
-- right after the site that reads through /api/content went to production.
--
-- The game now gets its content through /api/content, which needs a login and
-- never returns who wrote what. The browser (anon and authenticated roles)
-- therefore no longer needs to read these tables directly, so that is closed.
-- The Netlify functions use the service role and are not affected.
revoke select on public.tribes, public.characters, public.scenes, public.media from anon, authenticated;
