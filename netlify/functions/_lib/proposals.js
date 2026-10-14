// Proposals in the village council. The council leader proposes a change to the council
// (how the village is ruled, its god and laws, friends and enemies) or taking land. All
// the villagers can vote for 40 minutes, and the proposal passes when three quarters of
// the villagers have said yes. It fails as soon as it can no longer get that many, and
// it runs out when the 40 minutes are over. Nothing is changed before it has passed.

const presence = require('./presence');

const VOTE_MS = 40 * 60 * 1000;
const SHOW_RESULT_MS = 15 * 60 * 1000; // how long a result is shown to the villagers
const SHARE = 0.75;

// The votes counted among the villagers: { yes, no, total, need }.
function tally(votes, residents) {
  const total = residents.length;
  let yes = 0;
  let no = 0;
  for (const user of residents) {
    if (votes[user] === true) yes++;
    else if (votes[user] === false) no++;
  }
  return { yes, no, total, need: Math.ceil(total * SHARE) };
}

// What has been decided so far: 'passed', 'rejected', 'expired', or null if it is still open.
function decide(counts, now, closesAt) {
  if (counts.total >= 1 && counts.yes >= counts.need) return 'passed';
  if (counts.no > counts.total - counts.need) return 'rejected';
  if (now >= new Date(closesAt)) return 'expired';
  return null;
}

const COLUMNS = 'id, tribe_id, kind, payload, proposed_by, votes, status, note, created_at, closes_at, resolved_at';

// Applies what has passed. A change to the council is saved; land is taken (the same
// checks as when it was proposed, in case something has changed in the meantime).
async function apply(supabase, proposal, now) {
  if (proposal.kind === 'council') {
    const { error } = await supabase.from('councils').upsert(proposal.payload.row);
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  // Required here: the world needs this file when it takes land, and the other way round.
  const world = require('./world');
  return world.claimNow(supabase, proposal.proposed_by, proposal.tribe_id, proposal.payload.direction, now);
}

// Closes a proposal if the votes or the time say so. Returns the proposal as it is now.
async function settle(supabase, proposal, residents, now = new Date()) {
  if (proposal.status !== 'open') return proposal;
  const result = decide(tally(proposal.votes || {}, residents), now, proposal.closes_at);
  if (!result) return proposal;
  // Taking the proposal first: only one request gets to apply it.
  const { data: taken, error } = await supabase
    .from('council_proposals')
    .update({ status: result, resolved_at: now.toISOString() })
    .eq('id', proposal.id)
    .eq('status', 'open')
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!taken) return { ...proposal, status: result };
  if (result !== 'passed') return taken;
  let applied;
  try {
    applied = await apply(supabase, taken, now);
  } catch (e) {
    console.error('Could not apply the proposal:', e.message);
    applied = { ok: false, error: 'Something went wrong.' };
  }
  if (applied.ok) return taken;
  const note = applied.error || 'It could not be done.';
  await supabase.from('council_proposals').update({ status: 'rejected', note }).eq('id', taken.id);
  return { ...taken, status: 'rejected', note };
}

// The open proposal of a village, or the last one that was closed a short while ago.
async function current(supabase, tribeId, residents, now = new Date()) {
  const { data, error } = await supabase.from('council_proposals').select(COLUMNS).eq('tribe_id', tribeId).order('id', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  const proposal = data && data[0];
  if (!proposal) return null;
  const settled = await settle(supabase, proposal, residents, now);
  if (settled.status === 'open') return settled;
  return settled.resolved_at && now - new Date(settled.resolved_at) < SHOW_RESULT_MS ? settled : null;
}

// What a student sees of a proposal: the counts, never who voted what.
function view(proposal, residents, user) {
  if (!proposal) return null;
  const counts = tally(proposal.votes || {}, residents);
  const mine = (proposal.votes || {})[user];
  return {
    id: proposal.id,
    kind: proposal.kind,
    summary: proposal.payload.summary || [],
    status: proposal.status,
    note: proposal.note || '',
    closes_at: proposal.closes_at,
    yes: counts.yes,
    no: counts.no,
    need: counts.need,
    total: counts.total,
    my_vote: mine === true ? true : mine === false ? false : null,
  };
}

// The leader proposes something. The leader's own vote is a yes. Only one proposal can
// be open in a village.
async function create(supabase, user, tribeId, kind, payload, residents, now = new Date()) {
  const { data: open, error: openErr } = await supabase.from('council_proposals').select(COLUMNS).eq('tribe_id', tribeId).eq('status', 'open').maybeSingle();
  if (openErr) throw new Error(openErr.message);
  if (open) {
    const settled = await settle(supabase, open, residents, now);
    if (settled.status === 'open') return { ok: false, error: 'The villagers are already voting on a proposal. Wait until it is decided.' };
  }
  const { data, error } = await supabase
    .from('council_proposals')
    .insert({ tribe_id: tribeId, kind, payload, proposed_by: user, votes: { [user]: true }, closes_at: new Date(now.getTime() + VOTE_MS).toISOString() })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'The villagers are already voting on a proposal. Wait until it is decided.' };
    throw new Error(error.message);
  }
  // With few villagers the leader's yes can be enough.
  const settled = await settle(supabase, data, residents, now);
  return { ok: true, proposal: settled };
}

// A villager who is in the village votes yes or no. They can change their mind until it is decided.
async function vote(supabase, user, tribeId, proposalId, yes, residents, now = new Date()) {
  const { data: proposal, error } = await supabase.from('council_proposals').select(COLUMNS).eq('id', Number(proposalId)).eq('tribe_id', tribeId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!proposal) return { ok: false, error: 'There is no such proposal.' };
  if (proposal.status !== 'open') return { ok: false, error: 'The voting is over.' };
  if (now >= new Date(proposal.closes_at)) return { ok: true, proposal: await settle(supabase, proposal, residents, now) };
  const votes = { ...(proposal.votes || {}), [user]: Boolean(yes) };
  const { data: updated, error: upErr } = await supabase.from('council_proposals').update({ votes }).eq('id', proposal.id).eq('status', 'open').select(COLUMNS).maybeSingle();
  if (upErr) throw new Error(upErr.message);
  if (!updated) return { ok: false, error: 'The voting is over.' };
  return { ok: true, proposal: await settle(supabase, updated, residents, now) };
}

// The villagers of a village: their user ids.
async function residentsOf(supabase, tribeId) {
  return [...(await presence.loadResidents(supabase, tribeId)).keys()];
}

module.exports = { VOTE_MS, SHARE, tally, decide, settle, current, view, create, vote, residentsOf };
