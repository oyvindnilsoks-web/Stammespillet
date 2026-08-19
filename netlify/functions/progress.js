const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');

async function requireFeideId(event) {
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const feideId = await requireFeideId(event);
  if (!feideId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
  }

  const supabase = getSupabaseAdmin();

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('progress')
      .select('current_scene, chosen_character, flags, visited_tribes, last_saved')
      .eq('feide_id', feideId)
      .maybeSingle();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ progress: data }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const row = {
      feide_id: feideId,
      current_scene: body.current_scene ?? null,
      chosen_character: body.chosen_character ?? null,
      flags: body.flags ?? {},
      visited_tribes: body.visited_tribes ?? [],
      last_saved: new Date().toISOString(),
    };

    const { error } = await supabase.from('progress').upsert(row, { onConflict: 'feide_id' });
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
