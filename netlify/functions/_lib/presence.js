// Who is in which village right now, and whether the villagers of a village have
// gathered so that the village council can meet. The game sends a heartbeat every
// few seconds; a heartbeat older than 30 seconds means the student has left.
//
// The people of a village are all the students who belong to it: the student who
// started the village, the students who joined it with the group code, and the
// students who wrote a villager for it (the teacher has approved). The council can
// start when all of them are in the village at the same time, and there are at least
// two. It is open for half an hour, and only while at least two of them are still there.

const crypto = require('crypto');
const { validFigure } = require('./figures');

const FRESH_MS = 30 * 1000;
const WORLD_FRESH_MS = 10 * 1000; // someone on the map who has not been heard from for ten seconds has gone
const SESSION_MS = 40 * 60 * 1000; // as long as the villagers can vote on a proposal

// tribeId null: the student left the villages.
async function beat(supabase, user, tribeId, now = new Date()) {
  if (!tribeId) {
    const { error } = await supabase.from('presence').delete().eq('user_id', user);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('presence').upsert({ user_id: user, tribe_id: tribeId, seen_at: now.toISOString() });
  if (error) throw new Error(error.message);
}

// Everyone who belongs to a village, as a map from user id to the names of their
// villagers (empty for someone who only belongs to the group that made it). The ones
// who wrote a villager come first.
async function loadResidents(supabase, tribeId) {
  const { data: villagers, error } = await supabase.from('characters').select('id, name, submitted_by').eq('tribe_id', tribeId).eq('status', 'approved');
  if (error) throw new Error(error.message);
  const people = new Map();
  for (const v of villagers) {
    if (!v.submitted_by) continue;
    people.set(v.submitted_by, [...(people.get(v.submitted_by) || []), v.name]);
  }
  const [owner, members] = await Promise.all([
    supabase.from('tribes').select('submitted_by').eq('id', tribeId).maybeSingle(),
    supabase.from('village_members').select('user_id').eq('tribe_id', tribeId),
  ]);
  const groupErr = owner.error || members.error;
  if (groupErr) throw new Error(groupErr.message);
  for (const u of [owner.data && owner.data.submitted_by, ...(members.data || []).map((m) => m.user_id)].filter(Boolean)) {
    if (!people.has(u)) people.set(u, []);
  }
  return people;
}

// What to call each of them to the others: the name of their villager, never their
// own name; "Group member 1", "Group member 2" for those without a villager.
function labelsOf(people) {
  let n = 0;
  return new Map([...people].map(([user, names]) => [user, names.length ? names.join(' / ') : `Group member ${++n}`]));
}

// The state of the gathering in one village, as one of its villagers sees it.
// Only the villagers get more than { resident: false }.
async function stateFor(supabase, tribeId, user, now = new Date()) {
  const namesByUser = await loadResidents(supabase, tribeId);
  const labels = labelsOf(namesByUser);
  const residents = [...namesByUser.keys()];
  if (!residents.includes(user)) return { resident: false };

  const { data: rows, error: rowsErr } = await supabase.from('presence').select('user_id, tribe_id, seen_at').in('user_id', residents);
  if (rowsErr) throw new Error(rowsErr.message);
  const fresh = (row) => row.tribe_id === tribeId && now - new Date(row.seen_at) < FRESH_MS;
  const hereIds = new Set(rows.filter(fresh).map((r) => r.user_id));
  const label = (id) => labels.get(id);

  const { data: session, error: sessionErr } = await supabase.from('council_sessions').select('tribe_id, started_at').eq('tribe_id', tribeId).maybeSingle();
  if (sessionErr) throw new Error(sessionErr.message);

  const ready = residents.length >= 2 && hereIds.size === residents.length;
  const sessionActive = Boolean(session) && now - new Date(session.started_at) < SESSION_MS && hereIds.size >= 2;
  return {
    resident: true,
    total: residents.length,
    here: residents.filter((id) => hereIds.has(id)).map(label),
    missing: residents.filter((id) => !hereIds.has(id)).map(label),
    me_here: hereIds.has(user),
    ready,
    session_active: sessionActive,
  };
}

// Any villager can start the council once everybody is there.
async function startCouncil(supabase, tribeId, user, now = new Date()) {
  const state = await stateFor(supabase, tribeId, user, now);
  if (!state.resident) return { ok: false, reason: 'not a villager here' };
  if (state.session_active) return { ok: true, state };
  if (!state.ready) return { ok: false, reason: 'not everyone is here', state };
  const { error } = await supabase.from('council_sessions').upsert({ tribe_id: tribeId, started_at: now.toISOString(), started_by: user });
  if (error) throw new Error(error.message);
  return { ok: true, state: { ...state, session_active: true } };
}

// May this student change the council of the village now?
async function mayChangeCouncil(supabase, tribeId, user, now = new Date()) {
  const state = await stateFor(supabase, tribeId, user, now);
  return Boolean(state.resident && state.me_here && state.session_active);
}

// ---- who is online ----

const ONLINE_FRESH_MS = 45 * 1000; // the page sends a heartbeat every 30 seconds

// The student has the game open.
async function beatOnline(supabase, user, now = new Date()) {
  const { error } = await supabase.from('online').upsert({ user_id: user, seen_at: now.toISOString() });
  if (error) throw new Error(error.message);
}

// Everyone who has the game open: the name of their villager (never their own name),
// where they are, and whether it is the student asking. Where is 'on the map', 'in <village>'
// or 'in the menu' (reading, writing, drawing).
async function onlineList(supabase, user, now = new Date()) {
  const { data: rows, error } = await supabase.from('online').select('user_id, seen_at');
  if (error) throw new Error(error.message);
  const here = rows.filter((r) => now - new Date(r.seen_at) < ONLINE_FRESH_MS);
  if (!here.length) return [];
  const ids = here.map((r) => r.user_id);
  const [people, spots, tribes] = await Promise.all([
    supabase.from('characters').select('name, submitted_by').in('submitted_by', ids).eq('status', 'approved'),
    supabase.from('presence').select('user_id, tribe_id, fx, fy, seen_at').in('user_id', ids),
    supabase.from('tribes').select('id, name').eq('status', 'approved'),
  ]);
  const err = people.error || spots.error || tribes.error;
  if (err) throw new Error(err.message);
  const firstName = new Map();
  for (const c of people.data) if (!firstName.has(c.submitted_by)) firstName.set(c.submitted_by, c.name);
  const villageName = new Map(tribes.data.map((t) => [t.id, t.name]));
  const spotOf = new Map(spots.data.map((s) => [s.user_id, s]));

  const where = (id) => {
    const s = spotOf.get(id);
    if (s && s.tribe_id && now - new Date(s.seen_at) < FRESH_MS) return `in ${villageName.get(s.tribe_id) || 'a village'}`;
    if (s && !s.tribe_id && s.fx !== null && now - new Date(s.seen_at) < WORLD_FRESH_MS) return 'on the map';
    return 'in the menu';
  };
  return here
    .map((r) => ({ name: firstName.get(r.user_id) || 'A student', where: where(r.user_id), me: r.user_id === user }))
    .sort((a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name));
}

// ---- the world map: who is there, and where ----

// A short code for a student that can be given to other students, so they can be
// challenged without anyone learning who the student is.
function pidOf(user) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET env var is missing or too short');
  return crypto.createHmac('sha256', secret).update('pid:' + user).digest('hex').slice(0, 16);
}

const fraction = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1 ? Number(v) : null);

// The student stands inside a village here (fx and fy are fractions of the village).
async function beatVillage(supabase, user, tribeId, { fx, fy, look }, now = new Date()) {
  const x = fraction(fx);
  const y = fraction(fy);
  if (x === null || y === null) return { ok: false };
  const { error } = await supabase.from('presence').upsert({ user_id: user, tribe_id: tribeId, fx: x, fy: y, look: validFigure(look), seen_at: now.toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// The other students inside the same village right now: code, the name of their villager,
// figure and place.
async function villageOthers(supabase, user, tribeId, now = new Date()) {
  const { data: rows, error } = await supabase.from('presence').select('user_id, tribe_id, fx, fy, look, seen_at').eq('tribe_id', tribeId);
  if (error) throw new Error(error.message);
  const others = rows.filter((r) => r.user_id !== user && r.fx !== null && r.fy !== null && now - new Date(r.seen_at) < WORLD_FRESH_MS);
  if (!others.length) return [];
  const { data: people, error: namesErr } = await supabase.from('characters').select('name, sprite, submitted_by').in('submitted_by', others.map((r) => r.user_id)).eq('status', 'approved');
  if (namesErr) throw new Error(namesErr.message);
  const first = new Map();
  for (const c of people) if (!first.has(c.submitted_by)) first.set(c.submitted_by, c);
  return others.map((r) => ({
    pid: pidOf(r.user_id),
    name: (first.get(r.user_id) || {}).name || 'A student',
    look: r.look === null || r.look === undefined ? validFigure((first.get(r.user_id) || {}).sprite) : r.look,
    fx: r.fx,
    fy: r.fy,
  }));
}

// The student stands on the world map here. look is the figure (0-59) or null.
async function beatWorld(supabase, user, { fx, fy, look }, now = new Date()) {
  const x = fraction(fx);
  const y = fraction(fy);
  if (x === null || y === null) return { ok: false };
  const { error } = await supabase
    .from('presence')
    .upsert({ user_id: user, tribe_id: null, fx: x, fy: y, look: validFigure(look), seen_at: now.toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// The other students on the world map right now: their code, the name of their
// villager (never their own name), figure and place.
async function worldState(supabase, user, now = new Date()) {
  const { data: rows, error } = await supabase.from('presence').select('user_id, tribe_id, fx, fy, look, seen_at');
  if (error) throw new Error(error.message);
  const others = rows.filter((r) => r.user_id !== user && !r.tribe_id && r.fx !== null && r.fy !== null && now - new Date(r.seen_at) < WORLD_FRESH_MS);
  if (!others.length) return [];
  const { data: people, error: namesErr } = await supabase.from('characters').select('name, sprite, submitted_by').in('submitted_by', others.map((r) => r.user_id)).eq('status', 'approved');
  if (namesErr) throw new Error(namesErr.message);
  const first = new Map();
  for (const c of people) if (!first.has(c.submitted_by)) first.set(c.submitted_by, c);
  return others.map((r) => ({
    pid: pidOf(r.user_id),
    name: (first.get(r.user_id) || {}).name || 'A student',
    look: r.look === null || r.look === undefined ? validFigure((first.get(r.user_id) || {}).sprite) : r.look,
    fx: r.fx,
    fy: r.fy,
  }));
}

// The student a code stands for, if they are on the map right now.
async function resolvePid(supabase, pid, now = new Date()) {
  const { data: rows, error } = await supabase.from('presence').select('user_id, tribe_id, seen_at');
  if (error) throw new Error(error.message);
  const hit = rows.find((r) => now - new Date(r.seen_at) < WORLD_FRESH_MS && pidOf(r.user_id) === String(pid || ''));
  return hit ? hit.user_id : null;
}

// What the others call a student: the name of their villager, never their own name.
async function villagerNames(supabase, users) {
  if (!users.length) return new Map();
  const { data, error } = await supabase.from('characters').select('name, submitted_by').in('submitted_by', users).eq('status', 'approved');
  if (error) throw new Error(error.message);
  const names = new Map();
  for (const c of data) if (!names.has(c.submitted_by)) names.set(c.submitted_by, c.name);
  return names;
}

module.exports = { beatVillage, villageOthers, villagerNames, loadResidents, labelsOf, beat, stateFor, startCouncil, mayChangeCouncil, beatWorld, worldState, resolvePid, pidOf, beatOnline, onlineList, ONLINE_FRESH_MS, FRESH_MS, SESSION_MS, WORLD_FRESH_MS };
