const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const battle = require('./_lib/battle');
const world = require('./_lib/world');
const presence = require('./_lib/presence');

// Glossary battles between students (see _lib/battle.js). It needs a login. The
// questions come without their answers.

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

// A move that failed for a reason the student can read, or one that worked.
const reply = (result) => (result.ok === false ? json(result.status || 400, { ok: false, error: result.error }) : json(200, result));

exports.handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();
    if (event.httpMethod === 'GET') return json(200, await battle.list(supabase, user));
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    switch (body.action) {
      case 'challenge': {
        const { words } = await world.loadTaskSettings(supabase);
        return reply(await battle.challenge(supabase, user, words));
      }
      case 'challenge-player': {
        const target = await presence.resolvePid(supabase, body.pid);
        const { words } = await world.loadTaskSettings(supabase);
        return reply(await battle.challengePlayer(supabase, user, target, words));
      }
      case 'decline':
        return reply(await battle.decline(supabase, user, body.id));
      case 'accept':
        return reply(await battle.accept(supabase, user, body.id));
      case 'submit':
        return reply(await battle.submit(supabase, user, body.id, body.answers));
      case 'cancel':
        return reply(await battle.cancel(supabase, user, body.id));
      case 'quest-done':
        return reply(await battle.questDone(supabase, user, body.id));
      case 'seen':
        return reply(await battle.markSeen(supabase, user));
      default:
        return json(400, { error: 'Unknown action' });
    }
  } catch (e) {
    console.error('Battle failed:', e.message);
    return json(500, { error: 'Something went wrong. Try again.' });
  }
});
