const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const { translateToEnglish } = require('./_lib/translate');
const presence = require('./_lib/presence');

// The council of a village. Whoever lives there can see it: the student who
// started the village, the students who joined it with the group code, and the
// students who wrote a villager for it. The village has to be approved by the
// teacher first. The residents choose one council leader (one of the villagers);
// only that student can change the council, so two students do not overwrite
// each other. The villages named as allies or enemies are told.

const TEXT_FIELDS = { government: 300, god: 300, laws: 800 };
const MAX_LINKS = 8;

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

// The approved villages the student lives in.
async function residentVillageIds(supabase, user, approvedIds) {
  const [made, joined, wrote] = await Promise.all([
    supabase.from('tribes').select('id').eq('submitted_by', user),
    supabase.from('village_members').select('tribe_id').eq('user_id', user),
    supabase.from('characters').select('tribe_id').eq('submitted_by', user),
  ]);
  const err = made.error || joined.error || wrote.error;
  if (err) throw new Error(err.message);
  const ids = new Set();
  for (const row of made.data) ids.add(row.id);
  for (const row of joined.data) ids.add(row.tribe_id);
  for (const row of wrote.data) ids.add(row.tribe_id);
  return [...ids].filter((id) => approvedIds.has(id));
}

// What a student sends, checked: short texts, and allies and enemies chosen from
// the approved villages (never the village itself, never both at once).
// Returns { value } or { error }.
function cleanCouncil(body, approvedIds, selfId) {
  const value = {};
  for (const [key, max] of Object.entries(TEXT_FIELDS)) {
    const raw = body[key];
    if (raw !== undefined && typeof raw !== 'string') return { error: 'Invalid answers' };
    value[key] = (raw || '').trim().slice(0, max);
  }
  for (const key of ['allies', 'enemies']) {
    const raw = body[key] === undefined ? [] : body[key];
    if (!Array.isArray(raw) || raw.length > MAX_LINKS || raw.some((id) => typeof id !== 'string')) return { error: 'Invalid answers' };
    const unique = [...new Set(raw)];
    if (unique.some((id) => id === selfId || !approvedIds.has(id))) return { error: 'Choose other villages from the list.' };
    value[key] = unique;
  }
  if (value.allies.some((id) => value.enemies.includes(id))) return { error: 'A village cannot be both an ally and an enemy.' };
  return { value };
}

// Messages for the villages named in other councils: "Alfa has made you an ally".
function noticesFor(councils, mine, names) {
  const list = [];
  for (const c of councils) {
    if (mine.includes(c.tribe_id)) continue;
    for (const id of mine) {
      if ((c.allies || []).includes(id)) list.push({ kind: 'ally', from_id: c.tribe_id, from_name: names.get(c.tribe_id), to_id: id, to_name: names.get(id) });
      if ((c.enemies || []).includes(id)) list.push({ kind: 'enemy', from_id: c.tribe_id, from_name: names.get(c.tribe_id), to_id: id, to_name: names.get(id) });
    }
  }
  return list;
}

const COLUMNS = 'tribe_id, government, god, laws, allies, enemies, source_lang, original, leader_character_id';

const handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: approved, error: approvedErr } = await supabase.from('tribes').select('id, name').eq('status', 'approved').order('name');
    if (approvedErr) throw new Error(approvedErr.message);
    const approvedIds = new Set(approved.map((t) => t.id));
    const names = new Map(approved.map((t) => [t.id, t.name]));
    const mine = await residentVillageIds(supabase, user, approvedIds);

    // The villagers of the villages the student lives in: the leader is one of them.
    const loadVillagers = async (ids) => {
      if (!ids.length) return [];
      const { data, error } = await supabase.from('characters').select('id, name, tribe_id, submitted_by').in('tribe_id', ids).eq('status', 'approved');
      if (error) throw new Error(error.message);
      return data;
    };

    if (event.httpMethod === 'GET') {
      const [{ data: rows, error }, { data: allCouncils, error: allErr }, villagers] = await Promise.all([
        mine.length ? supabase.from('councils').select(COLUMNS).in('tribe_id', mine) : { data: [], error: null },
        supabase.from('councils').select('tribe_id, allies, enemies').in('tribe_id', [...approvedIds]),
        loadVillagers(mine),
      ]);
      if (error || allErr) throw new Error((error || allErr).message);
      const byId = new Map(rows.map((r) => [r.tribe_id, r]));
      const councils = mine.map((id) => {
        const row = byId.get(id) || {};
        const people = villagers.filter((v) => v.tribe_id === id);
        const leader = people.find((v) => v.id === row.leader_character_id) || null;
        const { leader_character_id, ...rest } = row;
        return {
          tribe_id: id,
          name: names.get(id),
          government: '',
          god: '',
          laws: '',
          allies: [],
          enemies: [],
          source_lang: 'en',
          original: null,
          ...rest,
          villagers: people.map((v) => ({ id: v.id, name: v.name, mine: v.submitted_by === user })),
          leader: leader ? { id: leader.id, name: leader.name, is_me: leader.submitted_by === user } : null,
          can_edit: !leader || leader.submitted_by === user,
        };
      });
      return json(200, {
        councils,
        villages: approved,
        notices: noticesFor(allCouncils || [], mine, names),
        translation: Boolean((process.env.DEEPL_API_KEY || '').trim()),
      });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    const tribeId = String(body.tribe_id || '');
    if (!mine.includes(tribeId)) return json(404, { error: 'You can only write the council of a village you live in.' });

    // The council meets in the village: it can only be written while all the
    // villagers are there and one of them has started the council.
    if (!(await presence.mayChangeCouncil(supabase, tribeId, user))) {
      return json(403, { error: 'The council can only be changed when all the villagers have gathered in the village and started the council.' });
    }

    const [{ data: existing, error: existingErr }, people] = await Promise.all([
      supabase.from('councils').select(COLUMNS).eq('tribe_id', tribeId),
      loadVillagers([tribeId]),
    ]);
    if (existingErr) throw new Error(existingErr.message);
    const current = existing && existing[0] ? existing[0] : null;
    const currentLeader = current ? people.find((v) => v.id === current.leader_character_id) : null;
    if (currentLeader && currentLeader.submitted_by !== user) {
      return json(403, { error: `Only the council leader (${currentLeader.name}) can change the council.` });
    }

    // The leader after this save: the one chosen, or the same as before, or the
    // student's own villager if there was no leader yet.
    let leaderId = null;
    if (body.leader_character_id !== undefined && body.leader_character_id !== null && body.leader_character_id !== '') {
      const chosen = people.find((v) => v.id === String(body.leader_character_id));
      if (!chosen) return json(400, { error: 'Choose a villager of this village as council leader.' });
      leaderId = chosen.id;
    } else if (currentLeader) {
      leaderId = currentLeader.id;
    } else {
      const own = people.find((v) => v.submitted_by === user);
      if (!own) return json(400, { error: 'Choose a council leader.' });
      leaderId = own.id;
    }

    const { value, error: invalid } = cleanCouncil(body, approvedIds, tribeId);
    if (invalid) return json(400, { error: invalid });

    // Written in Norwegian: the game shows English, the Norwegian original is kept.
    const row = {
      tribe_id: tribeId,
      allies: value.allies,
      enemies: value.enemies,
      leader_character_id: leaderId,
      source_lang: 'en',
      original: null,
      updated_by: user,
      updated_at: new Date().toISOString(),
    };
    const texts = { government: value.government, god: value.god, laws: value.laws };
    if (body.lang === 'no') {
      try {
        Object.assign(row, await translateToEnglish(texts), { source_lang: 'no', original: texts });
      } catch (e) {
        console.error('Translation failed:', e.code || e.message);
        return json(503, { error: 'translation_unavailable' });
      }
    } else {
      Object.assign(row, texts);
    }

    const { data: saved, error: saveErr } = await supabase.from('councils').upsert(row).select(COLUMNS).single();
    if (saveErr) throw new Error(saveErr.message);
    const { leader_character_id, ...rest } = saved;
    return json(200, { ok: true, council: rest });
  } catch (e) {
    console.error('Council failed:', e.message);
    return json(500, { error: 'Something went wrong. Try again.' });
  }
});

exports.handler = handler;
exports.cleanCouncil = cleanCouncil;
exports.noticesFor = noticesFor;
