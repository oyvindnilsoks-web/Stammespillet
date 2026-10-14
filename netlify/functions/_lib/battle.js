const tasks = require('./tasks');
const { isBot, botName } = require('./testbot');
const { rankOf } = require('./ladder');

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
const INVITE_MS = 2 * 60 * 1000; // a student challenged on the map has two minutes to answer

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
  for (const u of unique) if (isBot(u)) names.set(u, botName(u));
  return names;
}

async function xpOf(supabase, user) {
  const { data, error } = await supabase.from('xp').select('xp, wins, losses, draws').eq('user_id', user).maybeSingle();
  if (error) throw new Error(error.message);
  return data || { xp: 0, wins: 0, losses: 0, draws: 0 };
}

// The XP with the place on the ladder.
const withRank = (stats) => ({ ...stats, rank: rankOf(stats.xp) });

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

// XP for solving the problem of a villager, once for each student and problem. The
// problem is the id of an approved villager that somebody else wrote.
const XP_QUEST = 75;
async function questDone(supabase, user, questId) {
  if (typeof questId !== 'string' || !questId) return { ok: false, error: 'Unknown problem.' };
  const { data: villager, error } = await supabase.from('characters').select('id, submitted_by').eq('id', questId).eq('status', 'approved').maybeSingle();
  if (error) throw new Error(error.message);
  if (!villager || villager.submitted_by === user) return { ok: false, error: 'Unknown problem.' };
  const { data: added, error: addErr } = await supabase.from('quest_xp').upsert({ user_id: user, quest_id: questId }, { onConflict: 'user_id,quest_id', ignoreDuplicates: true }).select();
  if (addErr) throw new Error(addErr.message);
  if (!added || !added.length) return { ok: true, xp: 0, stats: withRank(await xpOf(supabase, user)) };
  const next = await addXp(supabase, user, XP_QUEST, null);
  return { ok: true, xp: XP_QUEST, stats: withRank(next) };
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
    !d.direct &&
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
    stats: withRank(await xpOf(supabase, user)),
    questions: QUESTIONS,
    open: open.map((d) => ({ id: d.id, from: names.get(d.challenger) || 'A student' })),
    waiting: mine.filter((d) => !d.direct && d.status === 'open' && d.challenger === user && d.a_score !== null && now - new Date(d.created_at) < OPEN_MS).map((d) => ({ id: d.id, score: d.a_score })),
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

// A student on the map challenges another student, who is on the map too. Both
// get the same questions, at the same time. target is the other student's user id.
async function challengePlayer(supabase, user, target, words, now = new Date()) {
  if (!target || target === user) return { ok: false, status: 404, error: 'That student has left the map.' };
  const { openOwn, todayCount } = await limits(supabase, user, now);
  if (openOwn >= MAX_OPEN) return { ok: false, status: 429, error: `You already have ${MAX_OPEN} battles waiting. Wait for someone to take them.` };
  if (todayCount >= MAX_PER_DAY) return { ok: false, status: 429, error: 'That is enough battles for today. Come back tomorrow.' };
  const mine = await myDuels(supabase, user);
  if (mine.some((d) => d.direct && d.challenger === user && d.opponent === target && d.status === 'open' && !d.b_started_at && now - new Date(d.created_at) < INVITE_MS)) {
    return { ok: false, status: 409, error: 'You have already challenged them. Wait for their answer.' };
  }
  const set = tasks.vocabSet(words, QUESTIONS);
  if (set.length < QUESTIONS) return { ok: false, status: 409, error: 'There are not enough words for a battle.' };
  const { data, error } = await supabase
    .from('duels')
    .insert({ challenger: user, opponent: target, direct: true, questions: set, a_started_at: now.toISOString(), created_at: now.toISOString(), ...(isBot(target) ? { b_started_at: now.toISOString() } : {}) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { ok: true, id: data.id, questions: set.map((q) => ({ prompt: q.prompt })) };
}

// The challenge a student has been given on the map, if there is one waiting.
async function pendingInvite(supabase, user, now = new Date()) {
  const { data, error } = await supabase.from('duels').select('*').eq('opponent', user);
  if (error) throw new Error(error.message);
  const waiting = data
    .filter((d) => d.direct && d.status === 'open' && !d.b_started_at && now - new Date(d.created_at) < INVITE_MS)
    .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
  if (!waiting) return null;
  const names = await namesOf(supabase, [waiting.challenger]);
  return { id: waiting.id, from: names.get(waiting.challenger) || 'A student' };
}

// Says no to a challenge from the map.
async function decline(supabase, user, id) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || !d.direct || d.opponent !== user || d.status !== 'open' || d.b_started_at) return { ok: false, status: 404, error: 'No such challenge.' };
  const { error: upErr } = await supabase.from('duels').update({ status: 'cancelled' }).eq('id', d.id);
  if (upErr) throw new Error(upErr.message);
  return { ok: true };
}

// How many results of battles the student started have not been shown to them yet.
async function unseenCount(supabase, user) {
  const { data, error } = await supabase.from('duels').select('id, status, a_seen').eq('challenger', user);
  if (error) throw new Error(error.message);
  return data.filter((d) => d.status === 'done' && !d.a_seen).length;
}

// Takes a waiting battle: the same questions as the one who started it.
async function accept(supabase, user, id, now = new Date()) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || d.status !== 'open' || (d.a_score === null && !d.direct) || now - new Date(d.created_at) >= OPEN_MS) return { ok: false, status: 404, error: 'This battle is not there any more.' };
  if (d.challenger === user) return { ok: false, status: 409, error: 'You cannot take your own battle.' };
  if (d.direct) {
    if (d.opponent !== user) return { ok: false, status: 403, error: 'This challenge is for someone else.' };
    if (!d.b_started_at && now - new Date(d.created_at) >= INVITE_MS) return { ok: false, status: 404, error: 'The challenge has run out.' };
  }
  const taken = !d.direct && d.opponent && !(d.b_score === null && now - new Date(d.b_started_at) > TAKE_OVER_MS);
  if (taken && d.opponent !== user) return { ok: false, status: 409, error: 'Someone else took this battle.' };
  if (d.opponent !== user) {
    const { todayCount } = await limits(supabase, user, now);
    if (todayCount >= MAX_PER_DAY) return { ok: false, status: 429, error: 'That is enough battles for today. Come back tomorrow.' };
  }
  if (!d.b_started_at || d.opponent !== user || !d.direct) {
    const { error: upErr } = await supabase.from('duels').update({ opponent: user, b_started_at: now.toISOString() }).eq('id', d.id);
    if (upErr) throw new Error(upErr.message);
  }
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

  // The teacher's test student has already played: three right out of five, in twenty seconds.
  if (isA && isBot(d.opponent) && d.b_score === null) {
    d.b_score = Math.min(3, d.questions.length);
    d.b_ms = 20000;
  }

  const score = d.questions.filter((q, i) => tasks.isCorrect(answers[i], q.answer)).length;
  const ms = Math.min(MAX_MS, Math.max(0, now - new Date(isA ? d.a_started_at : d.b_started_at)));

  // Whoever hands in second finishes the battle. (In a battle taken from the list
  // the starter has always played first; on the map both play at the same time.)
  const aScore = isA ? score : d.a_score;
  const aMs = isA ? ms : d.a_ms;
  const bScore = isA ? d.b_score : score;
  const bMs = isA ? d.b_ms : ms;
  if (aScore === null || bScore === null) {
    const own = isA ? { a_score: score, a_ms: ms } : { b_score: score, b_ms: ms };
    const { error: upErr } = await supabase.from('duels').update(own).eq('id', d.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, finished: false, score, total: d.questions.length };
  }

  const verdict = decide({ score: aScore, ms: aMs }, { score: bScore, ms: bMs });
  const winner = verdict === 'draw' ? 'draw' : verdict === 'a' ? d.challenger : d.opponent;
  const { error: upErr } = await supabase
    .from('duels')
    .update({ a_score: aScore, a_ms: aMs, b_score: bScore, b_ms: bMs, status: 'done', winner, finished_at: now.toISOString() })
    .eq('id', d.id);
  if (upErr) throw new Error(upErr.message);

  const gain = (who, result, total) => (result === 'win' ? XP_WIN + (total === d.questions.length ? XP_PERFECT : 0) : result === 'draw' ? XP_DRAW : XP_LOSS);
  const resultFor = (u) => (winner === 'draw' ? 'draw' : winner === u ? 'win' : 'loss');
  const other = isA ? d.opponent : d.challenger;
  const otherScore = isA ? bScore : aScore;
  const myResult = resultFor(user);
  const otherResult = resultFor(other);
  const myGain = gain(user, myResult, score);
  const otherGain = gain(other, otherResult, otherScore);
  await addXp(supabase, other, otherGain, otherResult);
  const mine = await addXp(supabase, user, myGain, myResult);
  const names = await namesOf(supabase, [other]);
  return { ok: true, finished: true, score, total: d.questions.length, vs: names.get(other) || 'A student', vs_score: otherScore, result: myResult, xp: myGain, stats: withRank({ xp: mine.xp, wins: mine.wins, losses: mine.losses, draws: mine.draws }) };
}

async function cancel(supabase, user, id, now = new Date()) {
  const { data: d, error } = await supabase.from('duels').select('*').eq('id', String(id || '')).maybeSingle();
  if (error) throw new Error(error.message);
  if (!d || d.challenger !== user || d.status !== 'open') return { ok: false, status: 404, error: 'No such battle.' };
  if (d.b_started_at && d.b_score === null && now - new Date(d.b_started_at) < TAKE_OVER_MS) return { ok: false, status: 409, error: 'Someone is playing this battle right now.' };
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

module.exports = { questDone, XP_QUEST, decide, list, challenge, challengePlayer, pendingInvite, decline, unseenCount, accept, submit, cancel, markSeen, xpOf, INVITE_MS, QUESTIONS, XP_WIN, XP_PERFECT, XP_DRAW, XP_LOSS, MAX_OPEN, MAX_PER_DAY, TAKE_OVER_MS, OPEN_MS };
