// Public, RLS-protected config - safe to ship to the browser.
// Content tables (tribes/characters/scenes) are readable by anyone via this
// key; the `progress` table has no client-side policies at all and can only
// be reached through the /api/progress Netlify Function.
export const SUPABASE_URL = 'https://rdqodrcrfakgvgwkmejj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_bxnKfXtR5wYJdpvqOiwFmw_0AY6PS38';
