const poison = require('./poison');

// The shared world in the database: loading it, moving the poison one step, and
// cleaning around a village. The rules of the poison itself are in poison.js.

const DEFAULTS = { id: 'main', poison: '', step: 0, paused: true, speed_minutes: 10, win_percent: 60, school_hours_only: true, result: '', last_step_at: null, cleansed: {} };
const CLEANSE_COOLDOWN_MS = 10 * 60 * 1000; // one village can be cleaned every ten minutes

async function loadState(supabase) {
  const { data, error } = await supabase.from('world_state').select('*').eq('id', 'main').maybeSingle();
  if (error) throw new Error(error.message);
  return { ...DEFAULTS, ...(data || {}) };
}

async function saveState(supabase, patch) {
  const { error } = await supabase.from('world_state').upsert({ id: 'main', ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// The cells of the evil villages (they spread poison) and the good ones (they keep it away).
async function loadVillageCells(supabase) {
  const { data, error } = await supabase.from('tribes').select('id, charter_type, territory').eq('status', 'approved');
  if (error) throw new Error(error.message);
  const sources = [];
  const wards = [];
  const byId = new Map();
  for (const t of data) {
    const spot = t.territory || {};
    if (!Number.isFinite(spot.map_x) || !Number.isFinite(spot.map_y)) continue;
    const cell = poison.cellOf(spot.map_x, spot.map_y);
    byId.set(t.id, cell);
    (t.charter_type === 'shadow' ? sources : wards).push(cell);
  }
  return { sources, wards, byId };
}

// Moves the poison one step if it is time: not paused, in school hours, and at
// least the chosen number of minutes since the last step. force skips those
// checks (the teacher's "step now"). Returns what happened.
async function advance(supabase, now = new Date(), { force = false } = {}) {
  const state = await loadState(supabase);
  if (!force) {
    if (state.paused) return { skipped: 'paused' };
    if (state.result) return { skipped: 'finished' };
    if (state.school_hours_only && !poison.inSchoolHours(now)) return { skipped: 'outside school hours' };
    // A little less than the interval, so a step that came a few seconds late is not skipped.
    if (state.last_step_at && now - new Date(state.last_step_at) < state.speed_minutes * 60 * 1000 - 30 * 1000) return { skipped: 'too soon' };
  }
  const { sources, wards } = await loadVillageCells(supabase);
  if (!sources.length) return { skipped: 'no evil villages' };

  const grid = poison.stepGrid(poison.decodeGrid(state.poison), { sources, wards });
  const percent = poison.percentPoisoned(grid);
  const result = percent >= state.win_percent ? 'evil' : '';
  await saveState(supabase, {
    poison: poison.encodeGrid(grid),
    step: state.step + 1,
    last_step_at: now.toISOString(),
    result,
    paused: result ? true : state.paused,
    cleansed: state.cleansed,
  });
  return { step: state.step + 1, percent, result };
}

// A solved problem cleans the ground around the villager's village. Each village
// can be cleaned once in ten minutes, so it cannot be used to wipe out the poison.
async function cleanse(supabase, tribeId, now = new Date()) {
  const state = await loadState(supabase);
  const { byId } = await loadVillageCells(supabase);
  const cell = byId.get(tribeId);
  if (!cell) return { ok: false, reason: 'unknown village' };
  const last = state.cleansed && state.cleansed[tribeId];
  if (last && now - new Date(last) < CLEANSE_COOLDOWN_MS) return { ok: false, reason: 'too soon' };
  const grid = poison.cleanseGrid(poison.decodeGrid(state.poison), cell);
  await saveState(supabase, { poison: poison.encodeGrid(grid), cleansed: { ...(state.cleansed || {}), [tribeId]: now.toISOString() } });
  return { ok: true, percent: poison.percentPoisoned(grid) };
}

async function reset(supabase) {
  await saveState(supabase, { poison: '', step: 0, result: '', last_step_at: null, paused: true, cleansed: {} });
}

function summary(state) {
  return {
    step: state.step,
    paused: state.paused,
    speed_minutes: state.speed_minutes,
    win_percent: state.win_percent,
    school_hours_only: state.school_hours_only,
    result: state.result,
    last_step_at: state.last_step_at,
    percent: poison.percentPoisoned(poison.decodeGrid(state.poison)),
  };
}

module.exports = { loadState, saveState, advance, cleanse, reset, summary, DEFAULTS, CLEANSE_COOLDOWN_MS };
