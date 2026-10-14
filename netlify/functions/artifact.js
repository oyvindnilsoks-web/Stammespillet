const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const { rankOf, NAMES, THRESHOLDS } = require('./_lib/ladder');
const battle = require('./_lib/battle');

// Artifacts: things the students have drawn on paper and scanned into the game.
// The scan is made in the browser (the paper is taken away, so only the drawing
// is left) and arrives as a small PNG. The teacher approves it and chooses the rank
// on the XP ladder where it unlocks. Everyone who has reached that rank finds it in
// their backpack; for the others it is only a locked place, with no picture sent.

const BUCKET = 'media';
const MAX_BYTES = 700 * 1024;
const MAX_SIDE = 512;
const MAX_NAME = 40;
const MAX_DESCRIPTION = 200;

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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The size of a PNG, read from its header, or null if it is not a PNG.
function pngSize(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const text = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const OWN_COLUMNS = 'id, name, description, status, rank_required, storage_path, created_at';

exports.handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    const supabase = getSupabaseAdmin();

    if (event.httpMethod === 'GET') {
      const [own, approved, stats] = await Promise.all([
        supabase.from('artifacts').select(OWN_COLUMNS).eq('owner', user),
        supabase.from('artifacts').select('id, name, description, storage_path, rank_required').eq('status', 'approved'),
        battle.xpOf(supabase, user),
      ]);
      const err = own.error || approved.error;
      if (err) throw new Error(err.message);
      const rank = rankOf(stats.xp);
      const byRank = (a, b) => a.rank_required - b.rank_required || String(a.name).localeCompare(String(b.name));
      // An artifact the student has not unlocked is only a place in the backpack:
      // nothing about it, not even the picture, is sent.
      const backpack = [...approved.data].sort(byRank).map((a) =>
        a.rank_required <= rank.rank
          ? { id: a.id, name: a.name, description: a.description, storage_path: a.storage_path, rank_required: a.rank_required }
          : { id: a.id, locked: true, rank_required: a.rank_required }
      );
      const mine = [...own.data].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).map(({ created_at, ...rest }) => rest);
      return json(200, { mine, backpack, rank, ladder: { names: NAMES, thresholds: THRESHOLDS } });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    if (body.action === 'add') {
      const name = text(body.name, MAX_NAME);
      if (!name) return json(400, { error: 'Give the artifact a name.' });
      if (typeof body.data !== 'string' || !body.data) return json(400, { error: 'This is not a picture.' });
      const buf = Buffer.from(body.data, 'base64');
      if (buf.length > MAX_BYTES) return json(413, { error: 'The picture is too big.' });
      const size = pngSize(buf);
      if (!size || !size.width || !size.height) return json(400, { error: 'This is not a scanned picture.' });
      if (size.width > MAX_SIDE || size.height > MAX_SIDE) return json(400, { error: 'The picture is too big.' });

      const path = `artifacts/${crypto.randomUUID()}.png`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: 'image/png', upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: row, error: insertErr } = await supabase
        .from('artifacts')
        .insert({ owner: user, name, description: text(body.description, MAX_DESCRIPTION), storage_path: path })
        .select(OWN_COLUMNS)
        .single();
      if (insertErr) {
        // No row, so the file would never be found again: take it away.
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(insertErr.message);
      }
      const { created_at, ...rest } = row;
      return json(200, { ok: true, artifact: rest });
    }

    if (body.action === 'delete') {
      const { data: row, error } = await supabase.from('artifacts').select('id, owner, storage_path').eq('id', String(body.id || '')).maybeSingle();
      if (error) throw new Error(error.message);
      if (!row || row.owner !== user) return json(404, { error: 'No such artifact.' });
      const { error: delErr } = await supabase.from('artifacts').delete().eq('id', row.id);
      if (delErr) throw new Error(delErr.message);
      if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]);
      return json(200, { ok: true });
    }

    return json(400, { error: 'Unknown action' });
  } catch (e) {
    console.error('Artifact failed:', e.message);
    return json(500, { error: 'Something went wrong. Try again.' });
  }
});

exports.pngSize = pngSize;
