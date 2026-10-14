// A village that wants land another village has taken (land from the home regions cannot be
// taken). The council of the village has voted for the claim (see proposals.js). Then:
//   1. The other village's council leader says yes: the land changes owner. Or no.
//   2. No (or no answer within 24 hours): the two villages meet in a culture battle for 24
//      hours. Every villager answers one set of glossary and maths tasks. At least half of
//      the villagers of each village must take part. The village with the best average score
//      per player wins; a tie goes to the village that defends. The loser keeps its home region.
// Nothing here needs a clock running: everything is settled when somebody looks.

const territory = require('./territory');
const tasks = require('./tasks');
const proposals = require('./proposals');
const world = require('./world');

const RESPOND_MS = 24 * 60 * 60 * 1000;
const BATTLE_MS = 24 * 60 * 60 * 1000;
const SHOW_RESULT_MS = 24 * 60 * 60 * 1000;

const COLUMNS = 'id, claimant, target, cells, proposed_by, status, note, scores, created_at, respond_by, battle_ends, resolved_at';

// The average share of right answers among the players of one village.
function stats(scores) {
  const list = Object.values(scores || {});
  const average = list.length ? list.reduce((sum, s) => sum + s.c / s.t, 0) / list.length : 0;
  return { players: list.length, average };
}

// Who has won a culture battle: 'claimant' or 'target', and why.
function judge(claimantScores, targetScores, claimantPeople, targetPeople) {
  const a = stats(claimantScores);
  const b = stats(targetScores);
  const needA = Math.ceil(claimantPeople / 2);
  const needB = Math.ceil(targetPeople / 2);
  if (a.players < needA) return { winner: 'target', note: 'Too few from the village that wanted the land took part, so nothing changed.' };
  if (b.players < needB) return { winner: 'claimant', note: 'Too few from the village that was defending took part, so it lost.' };
  if (a.average > b.average) return { winner: 'claimant', note: 'The village that wanted the land had the best average score.' };
  return { winner: 'target', note: a.average === b.average ? 'It was a tie, and a tie goes to the village that defends.' : 'The defending village had the best average score.' };
}

// The land changes owner (only the cells that the other village still has taken).
async function transfer(supabase, claim) {
  const state = await world.loadState(supabase);
  const land = await world.loadTerritory(supabase, state);
  const owners = territory.transferCells(land.owners, land.ids, claim.cells, claim.target, claim.claimant);
  await world.saveState(supabase, { owners: territory.encodeOwners(owners) });
}

async function finish(supabase, claim, winner, note, now) {
  if (winner === 'claimant') await transfer(supabase, claim);
  const { data, error } = await supabase
    .from('land_claims')
    .update({ status: winner === 'claimant' ? 'transferred' : 'kept', note, resolved_at: now.toISOString() })
    .eq('id', claim.id)
    .in('status', ['awaiting', 'battle'])
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Settles what time has decided: a question nobody answered becomes a culture battle, and a
// battle whose 24 hours are over gets its winner.
async function settleAll(supabase, now = new Date()) {
  const { data, error } = await supabase.from('land_claims').select(COLUMNS).in('status', ['awaiting', 'battle']);
  if (error) throw new Error(error.message);
  for (const claim of data) {
    if (claim.status === 'awaiting' && now >= new Date(claim.respond_by)) {
      const battleEnds = new Date(now.getTime() + BATTLE_MS).toISOString();
      const { error: upErr } = await supabase.from('land_claims').update({ status: 'battle', battle_ends: battleEnds }).eq('id', claim.id).eq('status', 'awaiting');
      if (upErr) throw new Error(upErr.message);
    } else if (claim.status === 'battle' && now >= new Date(claim.battle_ends)) {
      const [a, b] = await Promise.all([proposals.residentsOf(supabase, claim.claimant), proposals.residentsOf(supabase, claim.target)]);
      const verdict = judge(claim.scores.claimant, claim.scores.target, a.length, b.length);
      await finish(supabase, claim, verdict.winner, verdict.note, now);
    }
  }
}

// Which village the student plays for in a claim: 'claimant', 'target' or null.
async function sideOf(supabase, user, claim) {
  const [a, b] = await Promise.all([proposals.residentsOf(supabase, claim.claimant), proposals.residentsOf(supabase, claim.target)]);
  if (a.includes(user)) return { side: 'claimant', mine: a, other: b };
  if (b.includes(user)) return { side: 'target', mine: b, other: a };
  return { side: null, mine: a, other: b };
}

// The target village's council leader answers: give the land, or meet in the culture battle.
async function respond(supabase, user, claimId, accept, now = new Date()) {
  await settleAll(supabase, now);
  const { data: claim, error } = await supabase.from('land_claims').select(COLUMNS).eq('id', Number(claimId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim || claim.status !== 'awaiting') return { ok: false, error: 'There is nothing to answer.' };
  const { data: council, error: cErr } = await supabase.from('councils').select('leader_user').eq('tribe_id', claim.target).maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!council || council.leader_user !== user) return { ok: false, error: 'Only the council leader of the village can answer.' };
  if (accept) {
    await finish(supabase, claim, 'claimant', 'The village gave the land.', now);
    return { ok: true, status: 'transferred' };
  }
  const { error: upErr } = await supabase
    .from('land_claims')
    .update({ status: 'battle', battle_ends: new Date(now.getTime() + BATTLE_MS).toISOString() })
    .eq('id', claim.id)
    .eq('status', 'awaiting');
  if (upErr) throw new Error(upErr.message);
  return { ok: true, status: 'battle' };
}

// A villager of one of the two villages gets their tasks for the culture battle, once.
async function startBattle(supabase, user, claimId, now = new Date()) {
  await settleAll(supabase, now);
  const { data: claim, error } = await supabase.from('land_claims').select(COLUMNS).eq('id', Number(claimId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim || claim.status !== 'battle') return { ok: false, error: 'There is no culture battle to take part in.' };
  const who = await sideOf(supabase, user, claim);
  if (!who.side) return { ok: false, error: 'Only the villagers of the two villages can take part.' };
  if ((claim.scores[who.side] || {})[user]) return { ok: false, error: 'You have already taken part.' };
  const quiz = tasks.makeQuiz(await world.loadTaskSettings(supabase), user, now);
  if (!quiz) return { ok: false, error: 'The teacher has switched the tasks off.' };
  return { ok: true, ...quiz };
}

// The answers are checked and the score is kept for the village.
async function submitBattle(supabase, user, claimId, token, answers, now = new Date()) {
  const { data: claim, error } = await supabase.from('land_claims').select(COLUMNS).eq('id', Number(claimId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim || claim.status !== 'battle' || now >= new Date(claim.battle_ends)) return { ok: false, error: 'The culture battle is over.' };
  const who = await sideOf(supabase, user, claim);
  if (!who.side) return { ok: false, error: 'Only the villagers of the two villages can take part.' };
  if ((claim.scores[who.side] || {})[user]) return { ok: false, error: 'You have already taken part.' };
  const graded = tasks.grade(token, user, answers, now);
  if (graded.error) return { ok: false, error: graded.error };
  const scores = { claimant: { ...(claim.scores.claimant || {}) }, target: { ...(claim.scores.target || {}) } };
  scores[who.side][user] = { c: graded.correct, t: graded.total };
  const { error: upErr } = await supabase.from('land_claims').update({ scores }).eq('id', claim.id).eq('status', 'battle');
  if (upErr) throw new Error(upErr.message);
  return { ok: true, correct: graded.correct, total: graded.total };
}

// What the students of the given villages see of the claims that concern them: what is
// open, and what was settled in the last day. The scores themselves are not shown while the
// battle goes on, only how many have taken part.
async function viewFor(supabase, user, tribeIds, names, now = new Date()) {
  if (!tribeIds.length) return [];
  await settleAll(supabase, now);
  const since = new Date(now.getTime() - SHOW_RESULT_MS).toISOString();
  const { data, error } = await supabase
    .from('land_claims')
    .select(COLUMNS)
    .or(`claimant.in.(${tribeIds.join(',')}),target.in.(${tribeIds.join(',')})`)
    .or(`status.in.(awaiting,battle),resolved_at.gte.${since}`)
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  const out = [];
  for (const claim of data) {
    const who = await sideOf(supabase, user, claim);
    const leader = claim.status === 'awaiting' ? await supabase.from('councils').select('leader_user').eq('tribe_id', claim.target).maybeSingle() : null;
    out.push({
      id: claim.id,
      claimant_id: claim.claimant,
      claimant_name: names.get(claim.claimant) || 'A village',
      target_id: claim.target,
      target_name: names.get(claim.target) || 'A village',
      squares: claim.cells.length,
      status: claim.status,
      note: claim.note,
      respond_by: claim.respond_by,
      battle_ends: claim.battle_ends,
      my_side: who.side,
      can_respond: Boolean(leader && leader.data && leader.data.leader_user === user),
      played: Boolean(who.side && (claim.scores[who.side] || {})[user]),
      claimant_players: stats(claim.scores.claimant).players,
      claimant_needed: Math.ceil((who.side === 'claimant' ? who.mine : who.other).length / 2),
      target_players: stats(claim.scores.target).players,
      target_needed: Math.ceil((who.side === 'target' ? who.mine : who.other).length / 2),
    });
  }
  return out;
}

module.exports = { RESPOND_MS, BATTLE_MS, stats, judge, settleAll, respond, startBattle, submitBattle, viewFor };
