const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const { translateToEnglish } = require('./_lib/translate');
const presence = require('./_lib/presence');
const { residentVillageIds } = require('./_lib/residents');
const proposals = require('./_lib/proposals');
const landclaims = require('./_lib/landclaims');

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

// What a proposal to change the council says, in short sentences, compared with the
// council as it is now.
function summaryOf(current, row, names, labelOf) {
  const was = current || {};
  const out = [];
  const text = (key, label) => {
    if ((row[key] || '') !== (was[key] || '')) out.push(row[key] ? `${label}: ${row[key]}` : `${label}: removed.`);
  };
  text('government', 'How the village is ruled');
  text('god', 'The god or gods');
  text('laws', 'The laws');
  const diff = (key, added, removed) => {
    const before = was[key] || [];
    const nameList = (ids) => ids.map((id) => names.get(id) || id).join(', ');
    const plus = (row[key] || []).filter((id) => !before.includes(id));
    const minus = before.filter((id) => !(row[key] || []).includes(id));
    if (plus.length) out.push(`${added} ${nameList(plus)}.`);
    if (minus.length) out.push(`${removed} ${nameList(minus)}.`);
  };
  diff('allies', 'New allies:', 'No longer allies:');
  diff('enemies', 'New enemies:', 'No longer enemies:');
  if (row.leader_user && row.leader_user !== was.leader_user) out.push(`New council leader: ${labelOf(row.leader_user)}.`);
  return out.length ? out : ['The council stays as it is.'];
}

const COLUMNS = 'tribe_id, government, god, laws, allies, enemies, source_lang, original, leader_user';

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

    // The people of each village the student lives in, with a name for each: the
    // leader is one of them (whether or not they have written a villager).
    const loadPeople = async (ids) => {
      const out = new Map();
      for (const id of ids) {
        const residents = await presence.loadResidents(supabase, id);
        out.set(id, { users: [...residents.keys()], labels: presence.labelsOf(residents) });
      }
      return out;
    };

    if (event.httpMethod === 'GET') {
      const [{ data: rows, error }, { data: allCouncils, error: allErr }, peopleOf] = await Promise.all([
        mine.length ? supabase.from('councils').select(COLUMNS).in('tribe_id', mine) : { data: [], error: null },
        supabase.from('councils').select('tribe_id, allies, enemies').in('tribe_id', [...approvedIds]),
        loadPeople(mine),
      ]);
      if (error || allErr) throw new Error((error || allErr).message);
      const byId = new Map(rows.map((r) => [r.tribe_id, r]));
      const proposalOf = new Map();
      for (const id of mine) proposalOf.set(id, proposals.view(await proposals.current(supabase, id, peopleOf.get(id).users), peopleOf.get(id).users, user));
      const councils = mine.map((id) => {
        const row = byId.get(id) || {};
        const here = peopleOf.get(id);
        const leaderUser = here.users.includes(row.leader_user) ? row.leader_user : null;
        const { leader_user, ...rest } = row;
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
          proposal: proposalOf.get(id),
          people: here.users.map((u) => ({ pid: presence.pidOf(u), label: here.labels.get(u), mine: u === user })),
          leader: leaderUser ? { pid: presence.pidOf(leaderUser), label: here.labels.get(leaderUser), is_me: leaderUser === user } : null,
          can_edit: !leaderUser || leaderUser === user,
        };
      });
      return json(200, {
        councils,
        villages: approved,
        notices: noticesFor(allCouncils || [], mine, names),
        land_claims: await landclaims.viewFor(supabase, user, mine, names),
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

    // A villager votes on the proposal of the council leader.
    if (body.action === 'vote') {
      const state = await presence.stateFor(supabase, tribeId, user);
      if (!state.resident || !state.me_here) return json(403, { error: 'You can only vote while you are in the village.' });
      const residents = (await loadPeople([tribeId])).get(tribeId).users;
      const result = await proposals.vote(supabase, user, tribeId, body.proposal_id, body.yes, residents);
      if (!result.ok) return json(409, { error: result.error });
      return json(200, { ok: true, proposal: proposals.view(result.proposal, residents, user) });
    }

    // The council meets in the village: it can only be written while all the
    // villagers are there and one of them has started the council.
    if (!(await presence.mayChangeCouncil(supabase, tribeId, user))) {
      return json(403, { error: 'The council can only be changed when all the villagers have gathered in the village and started the council.' });
    }

    const [{ data: existing, error: existingErr }, peopleOf] = await Promise.all([
      supabase.from('councils').select(COLUMNS).eq('tribe_id', tribeId),
      loadPeople([tribeId]),
    ]);
    if (existingErr) throw new Error(existingErr.message);
    const here = peopleOf.get(tribeId);
    const current = existing && existing[0] ? existing[0] : null;
    const currentLeader = current && here.users.includes(current.leader_user) ? current.leader_user : null;
    if (currentLeader && currentLeader !== user) {
      return json(403, { error: `Only the council leader (${here.labels.get(currentLeader)}) can change the council.` });
    }

    // The leader after this save: the one chosen, or the same as before, or the
    // student themselves if there was no leader yet.
    let leaderUser = null;
    if (body.leader_pid !== undefined && body.leader_pid !== null && body.leader_pid !== '') {
      leaderUser = here.users.find((u) => presence.pidOf(u) === String(body.leader_pid)) || null;
      if (!leaderUser) return json(400, { error: 'Choose someone from this village as council leader.' });
    } else {
      leaderUser = currentLeader || user;
    }

    const { value, error: invalid } = cleanCouncil(body, approvedIds, tribeId);
    if (invalid) return json(400, { error: invalid });

    // Written in Norwegian: the game shows English, the Norwegian original is kept.
    const row = {
      tribe_id: tribeId,
      allies: value.allies,
      enemies: value.enemies,
      leader_user: leaderUser,
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

    // Nothing is changed yet: the leader proposes it, and the villagers vote.
    const summary = summaryOf(current, { ...row, leader_user: leaderUser }, names, (u) => here.labels.get(u) || 'a villager');
    const made = await proposals.create(supabase, user, tribeId, 'council', { row, summary }, here.users);
    if (!made.ok) return json(409, { error: made.error });
    return json(200, { ok: true, proposed: true, proposal: proposals.view(made.proposal, here.users, user) });
  } catch (e) {
    console.error('Council failed:', e.message);
    return json(500, { error: 'Something went wrong. Try again.' });
  }
});

exports.handler = handler;
exports.cleanCouncil = cleanCouncil;
exports.noticesFor = noticesFor;
