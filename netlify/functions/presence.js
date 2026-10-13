const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const presence = require('./_lib/presence');
const battle = require('./_lib/battle');
const chat = require('./_lib/chat');

// Where the student is standing, and the gathering of the villagers of a village
// (see _lib/presence.js). The game sends POST every few seconds while the student
// is inside a village, and asks GET for the state of the gathering.

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

async function approvedVillage(supabase, id) {
  if (typeof id !== 'string' || !id) return false;
  const { data, error } = await supabase.from('tribes').select('id').eq('id', id).eq('status', 'approved').maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

exports.handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();

    // The world map: who else is there, a challenge for this student, and whether
    // a battle result is waiting to be shown.
    const worldReply = async (players) => {
      const senders = await chat.unreadFrom(supabase, user);
      const names = await presence.villagerNames(supabase, senders);
      return {
        players: players || (await presence.worldState(supabase, user)),
        invite: await battle.pendingInvite(supabase, user),
        unseen: await battle.unseenCount(supabase, user),
        talk: senders.map((u) => ({ pid: presence.pidOf(u), name: names.get(u) || 'A student' })),
      };
    };

    // The student a code stands for: found among everyone who has the game open
    // (the talk goes on a little after one of them walks off the map).
    const studentOf = async (pid) => {
      const { data, error } = await supabase.from('online').select('user_id');
      if (error) throw new Error(error.message);
      const hit = data.find((r) => presence.pidOf(r.user_id) === String(pid || ''));
      return hit ? hit.user_id : null;
    };

    if (event.httpMethod === 'GET' && (event.queryStringParameters || {}).world) return json(200, await worldReply());
    if (event.httpMethod === 'GET' && (event.queryStringParameters || {}).chat) {
      const other = await studentOf(event.queryStringParameters.chat);
      if (!other || other === user) return json(404, { error: 'Not here' });
      const names = await presence.villagerNames(supabase, [other]);
      return json(200, { name: names.get(other) || 'A student', ...(await chat.talk(supabase, user, other)) });
    }
    if (event.httpMethod === 'GET' && (event.queryStringParameters || {}).online) return json(200, { players: await presence.onlineList(supabase, user) });

    if (event.httpMethod === 'GET') {
      const tribeId = String((event.queryStringParameters || {}).tribe_id || '');
      if (!(await approvedVillage(supabase, tribeId))) return json(404, { error: 'Unknown village' });
      return json(200, await presence.stateFor(supabase, tribeId, user));
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }
      // The page is open: counts for the Online button in the menu bar.
      if (body.online) {
        await presence.beatOnline(supabase, user);
        const list = await presence.onlineList(supabase, user);
        return json(200, { ok: true, count: list.length });
      }
      if (body.action === 'say') {
        const other = await studentOf(body.pid);
        if (!other) return json(404, { error: 'Not here' });
        const said = await chat.say(supabase, user, other, body.phrase);
        if (!said.ok) return json(400, { error: said.reason });
        return json(200, await chat.talk(supabase, user, other));
      }
      // Inside a village: where the student stands, and who else is in the village.
      if (body.village) {
        if (!(await approvedVillage(supabase, body.village))) return json(404, { error: 'Unknown village' });
        const moved = await presence.beatVillage(supabase, user, body.village, body);
        if (!moved.ok) return json(400, { error: 'Invalid place' });
        return json(200, await worldReply(await presence.villageOthers(supabase, user, body.village)));
      }
      if (body.world) {
        const moved = await presence.beatWorld(supabase, user, body);
        if (!moved.ok) return json(400, { error: 'Invalid place' });
        return json(200, await worldReply());
      }
      if (body.action === 'start-council') {
        if (!(await approvedVillage(supabase, body.tribe_id))) return json(404, { error: 'Unknown village' });
        const result = await presence.startCouncil(supabase, body.tribe_id, user);
        return json(result.ok ? 200 : 409, result);
      }
      if (body.action !== undefined) return json(400, { error: 'Unknown action' });
      // A heartbeat: the village the student is in, or null when they left.
      if (body.tribe_id === null || body.tribe_id === undefined) {
        await presence.beat(supabase, user, null);
        return json(200, { ok: true });
      }
      if (!(await approvedVillage(supabase, body.tribe_id))) return json(404, { error: 'Unknown village' });
      await presence.beat(supabase, user, body.tribe_id);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('Presence failed:', e.message);
    return json(500, { error: 'Something went wrong.' });
  }
});
