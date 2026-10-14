const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const world = require('./_lib/world');
const { residentVillageIds } = require('./_lib/residents');
const landclaims = require('./_lib/landclaims');

// The shared world for the game: where the poison is (to draw on the map), and
// cleaning around a village when a student solves a problem. It needs a login.

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
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();
    if (event.httpMethod === 'GET') {
      const state = await world.loadState(supabase);
      await landclaims.settleAll(supabase);
      const land = await world.loadTerritory(supabase, state);
      return json(200, { poison: state.poison, territory: world.territoryView(land), ...world.summary(state) });
    }
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }
      if (body.action === 'task-start') {
        const quiz = await world.startTask(supabase, user);
        return json(200, quiz ? { ok: true, ...quiz } : { ok: false, reason: 'The teacher has switched the tasks off.' });
      }
      if (body.action === 'task-submit') {
        return json(200, await world.submitTask(supabase, user, body));
      }
      if (body.action === 'claim-preview' || body.action === 'claim') {
        const tribeId = String(body.tribe_id || '');
        const { data: approved, error } = await supabase.from('tribes').select('id').eq('status', 'approved');
        if (error) throw new Error(error.message);
        const mine = await residentVillageIds(supabase, user, new Set(approved.map((t) => t.id)));
        if (!mine.includes(tribeId)) return json(404, { error: 'You can only take land for a village you live in.' });
        if (body.action === 'claim-preview') return json(200, await world.claimPreview(supabase, user, tribeId));
        const result = await world.proposeLand(supabase, user, tribeId, String(body.direction || ''), body.mode === 'contest' ? 'contest' : 'free');
        return json(result.ok ? 200 : 409, result);
      }
      // Land another village has taken: its leader answers, and the culture battle.
      if (['claim-respond', 'battle-start', 'battle-submit'].includes(body.action)) {
        if (body.action === 'claim-respond') return json(200, await landclaims.respond(supabase, user, body.claim_id, Boolean(body.accept)));
        if (body.action === 'battle-start') return json(200, await landclaims.startBattle(supabase, user, body.claim_id));
        return json(200, await landclaims.submitBattle(supabase, user, body.claim_id, body.token, body.answers));
      }
      if (body.action !== 'cleanse') return json(400, { error: 'Unknown action' });
      const result = await world.cleanse(supabase, String(body.tribe_id || ''));
      return json(200, result);
    }
    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('World failed:', e.message);
    return json(500, { error: 'Something went wrong.' });
  }
});
