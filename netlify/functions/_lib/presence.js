// Who is in which village right now, and whether the villagers of a village have
// gathered so that the village council can meet. The game sends a heartbeat every
// few seconds; a heartbeat older than 30 seconds means the student has left.
//
// "The villagers" of a village are the students who wrote a villager for it (and
// the teacher has approved). The council can start when all of them are in the
// village at the same time, and there are at least two. It is open for half an
// hour, and only while at least two of them are still there.

const FRESH_MS = 30 * 1000;
const SESSION_MS = 30 * 60 * 1000;

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

// The state of the gathering in one village, as one of its villagers sees it.
// Only the villagers get more than { resident: false }.
async function stateFor(supabase, tribeId, user, now = new Date()) {
  const { data: villagers, error } = await supabase.from('characters').select('id, name, submitted_by').eq('tribe_id', tribeId).eq('status', 'approved');
  if (error) throw new Error(error.message);
  const namesByUser = new Map();
  for (const v of villagers) {
    if (!v.submitted_by) continue;
    namesByUser.set(v.submitted_by, [...(namesByUser.get(v.submitted_by) || []), v.name]);
  }
  const residents = [...namesByUser.keys()];
  if (!residents.includes(user)) return { resident: false };

  const { data: rows, error: rowsErr } = await supabase.from('presence').select('user_id, tribe_id, seen_at').in('user_id', residents);
  if (rowsErr) throw new Error(rowsErr.message);
  const fresh = (row) => row.tribe_id === tribeId && now - new Date(row.seen_at) < FRESH_MS;
  const hereIds = new Set(rows.filter(fresh).map((r) => r.user_id));
  const label = (id) => namesByUser.get(id).join(' / ');

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

module.exports = { beat, stateFor, startCouncil, mayChangeCouncil, FRESH_MS, SESSION_MS };
