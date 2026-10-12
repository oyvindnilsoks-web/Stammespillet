const tasks = require('./tasks');

// Glossary battles. A student starts a battle and plays it at once. It waits for
// someone else, who gets the same questions. The one with the most right answers
// wins; if it is equal the quickest wins, and if that is about equal too it is a
// draw. The winner gets XP. The questions and answers stay on the server.

const QUESTIONS = 8;
const XP_WIN = 30;
const XP_PERFECT = 10; // extra for all questions right
const XP_DRAW = 15;
const XP_LOSS = 10;
const DRAW_MS = 1000; // a difference smaller than this in time is a draw
const MAX_MS = 5 * 60 * 1000; // a player is given at most this long
const OPEN_MS = 24 * 60 * 60 * 1000; // a waiting battle lasts a day
const TAKE_OVER_MS = 10 * 60 * 1000; // someone who accepted but never finished loses the place
const MAX_OPEN = 3; // waiting battles one student can have
const MAX_PER_DAY = 10; // battles a student can take part in each day

// Who wins: 'a', 'b' or 'draw'. a and b are { score, ms }.
function decide(a, b) {
  if (a.score !== b.score) return a.score > b.score ? 'a' : 'b';
  if (Math.abs(a.ms - b.ms) < DRAW_MS) return 'draw';
  return a.ms < b.ms ? 'a' : 'b';
}

const startOfDay = (now) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

// The name of a student in a battle: their villager, never their real name.
async function namesOf(supabase, users) {
  const unique = [...new Set(users.filter(Boolean))];
  const names = new Map();
  if (!unique.length) return names;
  const { data, error } = await supabase.from('characters').select('name, submitted_by').in('submitted_by', unique).eq('status', 'approved');
  if (error) throw new Error(error.message);
  for (const row of data) if (!names.has(row.submitted_by)) names.set(row.submitted_by, row.name);
  return names;
}

async function xpOf(supabase, user) {
  const { data, error } = await supabase.from('xp').select('xp, wins, losses, draws').eq('user_id', user).maybeSingle();
  if (error) throw new Error(error.message);
  return data || { xp: 0, wins: 0, losses: 0, draws: 0 };
}

async function addXp(supabase, user, gain, result) {
  const row = await xpOf(supabase, user);
  const next = {
    user_id: user,
    xp: row.xp + gain,
    wins: row.wins + (result === 'win' ? 1 : 0),
    losses: row.losses + (result === 'loss' ? 1 : 0),
    draws: row.draws + (result === 'draw' ? 1 : 0),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('xp').upsert(next);
  if (error) throw new Error(error.message);
  return next;
}

async function myDuels(supabase, user) {
  const [a, b] = await Promise.all([supabase.from('duels').select('*').eq('challenger', user), supabase.from('duels').select('*').eq('opponent', user)]);
  const err = a.error || b.error;
  if (err) throw new Error(err.message);
  const byId = new Map();
  for (const d of [...a.data, ...b.data]) byId.set(d.id, d);
  return [...byId.values()];
}

// What the battle window shows: your XP, the battles waiting for someone to take
// them, your own waiting battles, and how your last battles went.
async function list(supabase, user, now = new Date()) {
  const mine = await myDuels(supabase, user);
  const { data: waiting, error } = await supabase.from('duels').select('*').eq('status', 'open');
  if (error) throw new Error(error.message);

  const free = (d) =>
    d.challenger !== user &&
    d.a_score !== null &&
    now - new Date(d.created_at) < OPEN_MS &&
    (!d.opponent || (d.b_score === null && now - new Date(d.b_started_at) > TAKE_OVER_MS));
  const open = waiting.filter(free).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).slice(0, 20);
  const done = mine.filter((d) => d.status === 'done').sort((x, y) => String(y.finished_at).localeCompare(String(x.finished_at))).slice(0, 5);
  const names = await namesOf(supabase, [...open.map((d) => d.challenger), ...done.flatMap((d) => [d.challenger, d.opponent])]);

  const view = (d) => {
    const iAmA = d.challenger === user;
    const result = d.winner === 'draw' ? 'draw' : d.winner === user ? 'win' : 'loss';
    return {
      id: d.id,
      vs: names.get(iAmA ? d.opponent : d.challenger) || 'A student',
      result,
      score: iAmA ? d.a_score : d.b_score,
      vs_score: iAmA ? d.b_score : d.a_score,
      unseen: iAmA && !d.a_seen,
    };
  };
  return {
    stats: await xpOf(supabase, user),
    questions: QUESTIONS,
    open: open.map((d) => ({ id: d.id, from: names.get(d.challenger) || 'A student' })),
    waiting: mine.filter((d) => d.status === 'open' && d.challenger === user && d.a_score !== null && now - new Date(d.created_at) < OPEN_MS).map((d) => ({ id: d.id, score: d.a_score })),
    recent: done.map(view),
    unseen: done.filter((d) => d.challenger === user && !d.a_seen).map(view),
  };
}

async function limits(supabase, user, now) {
  const mine = await myDuels(supabase, user);
  const today = startOfDay(now);
  const openOwn = mine.filter((d) => d.challenger === user && d.status === 'open' && now - new Date(d.created_at) < OPEN_MS).length;
  const todayCount = mine.filter((d) => new Date(d.created_at) >= today && d.status !== 'cancelled').length;
  return { openOwn, todayCount };
}

// Starts a battle: the questions are made and the student gets them at once.
async function challenge(supabase, user, words, now = new Date()) {
  const { openOwn, todayCount } = await limits(supabase, user, now);
  if (openOwn >= MAX_OPEN) return { ok: false, status: 429, error: `You already have ${MAX_OPEN} battles waiting. Wait for someone to take them.` };
  if (todayCount >= MAX_PER_DAY) return { ok: false, status: 429, error: 'That is enough battles for today. Come back tomorrow.' };
  const set = tasks.vocabSet(words, QUESTIONS);
  if (set.length < QUESTIONS) return { ok: false, status: 409, error: 'There are not enough words for a battle.' };
  const { data, error } = await supabase
    .from('duels')
    .insert({ challenger: user, questions: set, a_started_at: now.toISOString(), created_at: now.toISOString() })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { ok: true, id: data.id, questions: set.map((q) => ({ prompt: q.prompt })) };
}

// Takes a waiting battle: the same questions as the one who started it.
async function accept(supabase, user, id, now = new Date()) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || d.status !== 'open' || d.a_score === null || now - new Date(d.created_at) >= OPEN_MS) return { ok: false, status: 404, error: 'This battle is not there any more.' };
  if (d.challenger === user) return { ok: false, status: 409, error: 'You cannot take your own battle.' };
  const taken = d.opponent && !(d.b_score === null && now - new Date(d.b_started_at) > TAKE_OVER_MS);
  if (taken && d.opponent !== user) return { ok: false, status: 409, error: 'Someone else took this battle.' };
  if (d.opponent !== user) {
    const { todayCount } = await limits(supabase, user, now);
    if (todayCount >= MAX_PER_DAY) return { ok: false, status: 429, error: 'That is enough battles for today. Come back tomorrow.' };
  }
  const { error: upErr } = await supabase.from('duels').update({ opponent: user, b_started_at: now.toISOString() }).eq('id', d.id);
  if (upErr) throw new Error(upErr.message);
  return { ok: true, id: d.id, questions: d.questions.map((q) => ({ prompt: q.prompt })) };
}

// Hands in the answers. The challenger's go is kept until someone takes the
// battle; when the second player hands in, the winner is found and gets XP.
async function submit(supabase, user, id, answers, now = new Date()) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || d.status !== 'open') return { ok: false, status: 404, error: 'This battle is not there any more.' };
  const isA = d.challenger === user;
  const isB = d.opponent === user;
  if (!isA && !isB) return { ok: false, status: 403, error: 'This is not your battle.' };
  if ((isA && d.a_score !== null) || (isB && d.b_score !== null)) return { ok: false, status: 409, error: 'You have already handed in this battle.' };
  if (!Array.isArray(answers) || answers.length !== d.questions.length) return { ok: false, status: 400, error: 'Answer every question.' };

  const score = d.questions.filter((q, i) => tasks.isCorrect(answers[i], q.answer)).length;
  const ms = Math.min(MAX_MS, Math.max(0, now - new Date(isA ? d.a_started_at : d.b_started_at)));

  if (isA) {
    const { error: upErr } = await supabase.from('duels').update({ a_score: score, a_ms: ms }).eq('id', d.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, finished: false, score, total: d.questions.length };
  }

  const verdict = decide({ score: d.a_score, ms: d.a_ms }, { score, ms });
  const winner = verdict === 'draw' ? 'draw' : verdict === 'a' ? d.challenger : user;
  const { error: upErr } = await supabase
    .from('duels')
    .update({ b_score: score, b_ms: ms, status: 'done', winner, finished_at: now.toISOString() })
    .eq('id', d.id);
  if (upErr) throw new Error(upErr.message);

  const gain = (who, result, total) => (result === 'win' ? XP_WIN + (total === d.questions.length ? XP_PERFECT : 0) : result === 'draw' ? XP_DRAW : XP_LOSS);
  const resultFor = (u) => (winner === 'draw' ? 'draw' : winner === u ? 'win' : 'loss');
  const aResult = resultFor(d.challenger);
  const bResult = resultFor(user);
  const aGain = gain(d.challenger, aResult, d.a_score);
  const bGain = gain(user, bResult, score);
  await addXp(supabase, d.challenger, aGain, aResult);
  const mine = await addXp(supabase, user, bGain, bResult);
  const names = await namesOf(supabase, [d.challenger]);
  return { ok: true, finished: true, score, total: d.questions.length, vs: names.get(d.challenger) || 'A student', vs_score: d.a_score, result: bResult, xp: bGain, stats: { xp: mine.xp, wins: mine.wins, losses: mine.losses, draws: mine.draws } };
}

async function cancel(supabase, user, id) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || d.challenger !== user || d.status !== 'open') return { ok: false, status: 404, error: 'No such battle.' };
  if (d.opponent && d.b_score === null) return { ok: false, status: 409, error: 'Someone is playing this battle right now.' };
  const { error: upErr } = await supabase.from('duels').update({ status: 'cancelled' }).eq('id', d.id);
  if (upErr) throw new Error(upErr.message);
  return { ok: true };
}

// The result of the battles you started has been shown to you.
async function markSeen(supabase, user) {
  const { data, error } = await supabase.from('duels').select('id, a_seen, status').eq('challenger', user).eq('status', 'done');
  if (error) throw new Error(error.message);
  for (const d of data.filter((x) => !x.a_seen)) {
    const { error: upErr } = await supabase.from('duels').update({ a_seen: true }).eq('id', d.id);
    if (upErr) throw new Error(upErr.message);
  }
  return { ok: true };
}

module.exports = { decide, list, challenge, accept, submit, cancel, markSeen, xpOf, QUESTIONS, XP_WIN, XP_PERFECT, XP_DRAW, XP_LOSS, MAX_OPEN, MAX_PER_DAY, TAKE_OVER_MS, OPEN_MS };
