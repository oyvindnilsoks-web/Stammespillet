const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');

// Everything the game, the clan lexicon and the gallery show. It needs a login
// and returns only what the teacher has approved. What the browser gets leaves
// out who wrote it (submitted_by, the group code and the names typed under
// "group members"), so none of that can be read by anyone, not even a student
// who looks at the network traffic.

const TRIBE_COLUMNS =
  'id, name, territory, resource, culture, relations, image, population, status, charter, charter_type, source_lang, charter_original, created_at, updated_at';
const CHARACTER_COLUMNS =
  'id, name, tribe_id, role, strengths, weaknesses, goal, description, image, sprite, student_name, status, charter, source_lang, charter_original, created_at, updated_at';

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }, body: JSON.stringify(body) };
}

// The names of the group members are typed by the students themselves, so
// they are kept out of what other people can read.
function withoutNames(charter) {
  if (!charter || typeof charter !== 'object') return charter;
  const { group_members, ...rest } = charter;
  return rest;
}

function publicRow(row) {
  return { ...row, charter: withoutNames(row.charter), charter_original: withoutNames(row.charter_original) };
}

// The villages the student wrote or is a group member of: the game needs them
// to know who the player's village is at war with.
async function ownVillageIds(supabase, user) {
  const [made, joined] = await Promise.all([
    supabase.from('tribes').select('id').eq('submitted_by', user).eq('status', 'approved'),
    supabase.from('village_members').select('tribe_id').eq('user_id', user),
  ]);
  const ids = new Set((made.data || []).map((t) => t.id));
  for (const row of joined.data || []) ids.add(row.tribe_id);
  return [...ids];
}

// The villagers the student wrote: in the game they are the figure the student
// plays, so they do not stand in the villages as characters to talk to.
async function ownVillagerIds(supabase, user) {
  const { data } = await supabase.from('characters').select('id').eq('submitted_by', user).eq('status', 'approved');
  return (data || []).map((c) => c.id);
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

exports.handler = withSessionRenewal(async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();
    const [tribes, characters, scenes, lexicon] = await Promise.all([
      supabase.from('tribes').select(TRIBE_COLUMNS).eq('status', 'approved').order('name'),
      supabase.from('characters').select(CHARACTER_COLUMNS).eq('status', 'approved').order('name'),
      supabase.from('scenes').select('*'),
      supabase.from('lexicon_entries').select('id, kind, ref_id, title, body, position, updated_at').order('position'),
    ]);
    const err = tribes.error || characters.error || scenes.error || lexicon.error;
    if (err) throw new Error(err.message);

    // Media is only shown for approved villages and villagers.
    const tribeIds = tribes.data.map((t) => t.id);
    const characterIds = characters.data.map((c) => c.id);
    const [tribeMedia, characterMedia] = await Promise.all([
      tribeIds.length ? supabase.from('media').select('*').in('tribe_id', tribeIds) : { data: [], error: null },
      characterIds.length ? supabase.from('media').select('*').in('character_id', characterIds) : { data: [], error: null },
    ]);
    const mediaErr = tribeMedia.error || characterMedia.error;
    if (mediaErr) throw new Error(mediaErr.message);
    const media = [...tribeMedia.data, ...characterMedia.data].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || String(a.created_at).localeCompare(String(b.created_at))
    );

    const approvedIds = new Set(tribeIds);
    const councilRows = tribeIds.length ? await supabase.from('councils').select('tribe_id, government, god, laws, allies, enemies').in('tribe_id', tribeIds) : { data: [], error: null };
    if (councilRows.error) throw new Error(councilRows.error.message);
    const mine = (await ownVillageIds(supabase, user)).filter((id) => approvedIds.has(id));

    const approvedCharacters = new Set(characters.data.map((c) => c.id));
    const mineCharacters = (await ownVillagerIds(supabase, user)).filter((id) => approvedCharacters.has(id));

    return json(200, {
      mine,
      mine_characters: mineCharacters,
      councils: councilRows.data,
      tribes: tribes.data.map(publicRow),
      characters: characters.data.map(publicRow),
      scenes: scenes.data,
      lexicon: lexicon.data,
      media,
    });
  } catch (e) {
    console.error('Could not load the content:', e.message);
    return json(500, { error: 'Could not load the content' });
  }
});
