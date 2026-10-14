const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const { translateToNorwegian } = require('./_lib/translate');

// The texts of the Clan Lexicon in Norwegian. They are translated with DeepL the first
// time somebody asks, saved, and translated again only when the English text has been
// renewed. Names of villages and villagers are not translated.

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }, body: JSON.stringify(body) };
}

async function requireUser(event) {
  const token = parseCookies(event)[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

exports.handler = withSessionRenewal(async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase.from('lexicon_entries').select('id, kind, title, body, title_no, body_no, no_updated_at, updated_at').order('position');
    if (error) throw new Error(error.message);

    // What has to be translated: nothing yet, or the English was renewed after the last translation.
    // A few at a time, so one request stays short; the page asks again until nothing is left.
    const allStale = rows.filter((r) => !r.body_no || !r.no_updated_at || new Date(r.no_updated_at) < new Date(r.updated_at));
    const stale = allStale.slice(0, 6);
    if (stale.length) {
      // The chapter titles are translated; the names (villages, villagers) are kept.
      const titled = stale.filter((r) => r.kind === 'history');
      const texts = [...stale.map((r) => r.body), ...titled.map((r) => r.title)];
      const done = await translateToNorwegian(texts);
      const now = new Date().toISOString();
      const bodies = done.slice(0, stale.length);
      const titles = new Map(titled.map((r, i) => [r.id, done[stale.length + i]]));
      for (let i = 0; i < stale.length; i++) {
        const r = stale[i];
        r.body_no = bodies[i];
        r.title_no = r.kind === 'history' ? titles.get(r.id) : r.title;
        r.no_updated_at = now;
        const { error: upErr } = await supabase.from('lexicon_entries').update({ body_no: r.body_no, title_no: r.title_no, no_updated_at: now }).eq('id', r.id);
        if (upErr) throw new Error(upErr.message);
      }
    }
    return json(200, { pending: allStale.length - stale.length, entries: rows.map((r) => ({ id: r.id, title: r.title_no || r.title, body: r.body_no })) });
  } catch (e) {
    console.error('Lexicon translation failed:', e.code || e.message);
    return json(503, { error: 'translation_unavailable' });
  }
});
