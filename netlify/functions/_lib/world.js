const poison = require('./poison');
const tasks = require('./tasks');
const { residentVillageIds } = require('./residents');

// The shared world in the database: loading it, moving the poison one step, and
// cleaning around a village. The rules of the poison itself are in poison.js.

const DEFAULTS = { id: 'main', poison: '', step: 0, paused: true, speed_minutes: 10, win_percent: 60, school_hours_only: true, result: '', last_step_at: null, cleansed: {}, shields: {} };
const CLEANSE_COOLDOWN_MS = 10 * 60 * 1000; // one village can be cleaned every ten minutes
const TASK_COOLDOWN_MS = 30 * 1000; // a student gets a reward for a quiz at most every half minute
const MAX_SHIELD = 12;

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
  const good = [];
  const byId = new Map();
  for (const t of data) {
    const spot = t.territory || {};
    if (!Number.isFinite(spot.map_x) || !Number.isFinite(spot.map_y)) continue;
    const cell = poison.cellOf(spot.map_x, spot.map_y);
    byId.set(t.id, cell);
    if (t.charter_type === 'shadow') sources.push(cell);
    else good.push({ id: t.id, ...cell });
  }
  return { sources, good, byId };
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
  const { sources, good } = await loadVillageCells(supabase);
  if (!sources.length) return { skipped: 'no evil villages' };

  // Only a village with shield keeps the poison away. Every step takes one off, so
  // the poison reaches the villages whose students do not solve tasks.
  const shields = state.shields || {};
  const wards = good.filter((v) => (shields[v.id] || 0) > 0);
  const grid = poison.stepGrid(poison.decodeGrid(state.poison), { sources, wards });
  const nextShields = {};
  for (const [id, n] of Object.entries(shields)) if (n > 1) nextShields[id] = n - 1;
  const percent = poison.percentPoisoned(grid);
  const result = percent >= state.win_percent ? 'evil' : '';
  await saveState(supabase, {
    poison: poison.encodeGrid(grid),
    step: state.step + 1,
    last_step_at: now.toISOString(),
    result,
    paused: result ? true : state.paused,
    cleansed: state.cleansed,
    shields: nextShields,
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
  await saveState(supabase, { poison: '', step: 0, result: '', last_step_at: null, paused: true, cleansed: {}, shields: {} });
}

// The tasks the teacher has chosen: which kinds, and the word list.
async function loadTaskSettings(supabase) {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', ['task_kinds', 'task_words']);
  if (error) throw new Error(error.message);
  const by = Object.fromEntries(data.map((r) => [r.key, r.value]));
  const kinds = by.task_kinds && typeof by.task_kinds === 'object' ? by.task_kinds : { vocab: true, math: true };
  const words = Array.isArray(by.task_words) ? by.task_words.filter((w) => w && w.no && w.en) : [];
  return { kinds, words };
}

// A new quiz for a student, or null if the teacher has switched all the tasks off.
async function startTask(supabase, user, now = new Date()) {
  return tasks.makeQuiz(await loadTaskSettings(supabase), user, now);
}

// Checks a quiz. When it is good enough, the poison is cleaned around where the
// student stands (fx and fy are fractions of the map, 0 to 1) and the villages the
// student lives in get shield.
async function submitTask(supabase, user, { token, answers, fx, fy }, now = new Date()) {
  const graded = tasks.grade(token, user, answers, now);
  if (graded.error) return { ok: false, error: graded.error };
  const reward = tasks.reward(graded.correct, graded.total);
  const result = { ok: true, correct: graded.correct, total: graded.total, cleaned: 0, shield: 0, cooling: false };
  if (!reward.radius) return result;

  const state = await loadState(supabase);
  const cleansed = { ...(state.cleansed || {}) };
  const last = cleansed['task:' + user];
  if (last && now - new Date(last) < TASK_COOLDOWN_MS) return { ...result, cooling: true };

  let grid = poison.decodeGrid(state.poison);
  const x = Number(fx);
  const y = Number(fy);
  if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
    grid = poison.cleanseGrid(grid, poison.cellOf(x * 100, y * 100), reward.radius);
    result.cleaned = reward.radius;
  }

  const { data: approved, error } = await supabase.from('tribes').select('id').eq('status', 'approved');
  if (error) throw new Error(error.message);
  const mine = await residentVillageIds(supabase, user, new Set(approved.map((t) => t.id)));
  const shields = { ...(state.shields || {}) };
  for (const id of mine) shields[id] = Math.min(MAX_SHIELD, (shields[id] || 0) + reward.shield);
  result.shield = mine.length ? reward.shield : 0;

  // Forget old cooldowns, so the list does not grow.
  for (const [k, when] of Object.entries(cleansed)) if (k.startsWith('task:') && now - new Date(when) > 60 * 60 * 1000) delete cleansed[k];
  cleansed['task:' + user] = now.toISOString();

  await saveState(supabase, { poison: poison.encodeGrid(grid), shields, cleansed });
  return { ...result, percent: poison.percentPoisoned(grid), shields };
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
    shields: state.shields || {},
    percent: poison.percentPoisoned(poison.decodeGrid(state.poison)),
  };
}

module.exports = { loadState, saveState, advance, cleanse, reset, summary, startTask, submitTask, loadTaskSettings, DEFAULTS, CLEANSE_COOLDOWN_MS, TASK_COOLDOWN_MS, MAX_SHIELD };
