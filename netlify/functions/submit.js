const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const { translateToEnglish } = require('./_lib/translate');

const TYPES = ['village', 'shadow', 'villager'];
const MAX_KEYS = 60;
const MAX_VALUE = 2000;
const MAX_NAME = 60;

async function requireUser(event) {
  const token = parseCookies(event)[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function slug(s) {
  const out = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return out || 'x';
}

function newId(prefix, name) {
  return `${prefix}_${slug(name)}-${crypto.randomBytes(3).toString('hex')}`;
}

function cleanCharter(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.length > MAX_KEYS) return null;
  const out = {};
  for (const [key, value] of entries) {
    if (!/^[a-z_]{1,40}$/.test(key) || typeof value !== 'string') return null;
    const v = value.trim().slice(0, MAX_VALUE);
    if (v) out[key] = v;
  }
  return out;
}

function cleanMap(map) {
  const x = Number(map?.x);
  const y = Number(map?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { map_x: Math.round(x * 100) / 100, map_y: Math.round(y * 100) / 100 };
}

function studentName(user) {
  const m = /^(?:name|dev):(.+)$/.exec(user);
  return m ? m[1] : null;
}

async function submissionsOpen(supabase) {
  const { data } = await supabase.from('settings').select('value').eq('key', 'submissions_open').maybeSingle();
  return data ? data.value === true : true;
}

// The columns a student gets back for their own villages. submitted_by is
// left out on purpose.
const VILLAGE_COLUMNS = 'id, name, status, charter, charter_original, source_lang, charter_type, territory, updated_at, created_at, join_code';

// Villages the student started, plus the ones they joined with a group code.
async function myVillages(supabase, user) {
  const { data: memberRows, error: memberErr } = await supabase.from('village_members').select('tribe_id').eq('user_id', user);
  if (memberErr) return { data: null, error: memberErr };
  const ids = memberRows.map((r) => r.tribe_id);
  const [owned, joined] = await Promise.all([
    supabase.from('tribes').select(VILLAGE_COLUMNS).eq('submitted_by', user),
    ids.length ? supabase.from('tribes').select(VILLAGE_COLUMNS).in('id', ids) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = owned.error || joined.error;
  if (error) return { data: null, error };
  const byId = new Map();
  for (const v of [...owned.data, ...joined.data]) byId.set(v.id, v);
  const list = [...byId.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return { data: list.map(({ created_at, ...rest }) => rest), error: null };
}

// A village can be edited by whoever started it and by the students who joined
// with its group code.
async function mayEditVillage(supabase, tribe, user) {
  if (tribe.submitted_by === user) return true;
  const { data } = await supabase.from('village_members').select('user_id').eq('tribe_id', tribe.id).eq('user_id', user).maybeSingle();
  return Boolean(data);
}

// No I, O, 0 or 1, so a code read aloud or copied from a screen is not mixed up.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
function newJoinCode() {
  let code = '';
  for (const byte of crypto.randomBytes(CODE_LENGTH)) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

async function handleJoin(supabase, user, rawCode) {
  const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const notFound = async () => {
    // Slows down anyone guessing codes.
    await new Promise((r) => setTimeout(r, 600));
    return json(404, { error: 'No village has that code.' });
  };
  if (code.length !== CODE_LENGTH) return notFound();

  const { data: tribe, error } = await supabase.from('tribes').select('id, name, status, submitted_by').eq('join_code', code).maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!tribe) return notFound();
  if (tribe.status !== 'pending') return json(409, { error: 'This village has already been reviewed by your teacher.' });

  if (tribe.submitted_by !== user) {
    const { error: memberErr } = await supabase
      .from('village_members')
      .upsert({ tribe_id: tribe.id, user_id: user }, { onConflict: 'tribe_id,user_id' });
    if (memberErr) return json(500, { error: memberErr.message });
  }
  return json(200, { ok: true, id: tribe.id, name: tribe.name });
}

// Pictures students add to their village (landmarks and other things). The
// browser shrinks and re-encodes every picture first, which also strips hidden
// data such as the place a photo was taken. The server checks it again.
const BUCKET = 'media';
const MAX_IMAGES_PER_VILLAGE = 8;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// The first bytes of a file say what it really is, whatever the browser claims.
function looksLike(type, buf) {
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === 'image/webp') return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

// A village the student may add pictures to: theirs or their group's, and
// still waiting for the teacher. Anything else answers like it does not exist.
async function villageForPictures(supabase, user, id) {
  const { data: tribe, error } = await supabase.from('tribes').select('id, status, submitted_by').eq('id', String(id || '')).maybeSingle();
  if (error) return { response: json(500, { error: error.message }) };
  if (!tribe || !(await mayEditVillage(supabase, tribe, user))) return { response: json(404, { error: 'Submission not found' }) };
  if (tribe.status !== 'pending') return { response: json(409, { error: 'This village has already been reviewed by your teacher.' }) };
  return { tribe };
}

async function handleAddImage(supabase, user, body) {
  const { tribe, response } = await villageForPictures(supabase, user, body.tribe_id);
  if (response) return response;

  const type = String(body.mime || '');
  if (!IMAGE_TYPES[type]) return json(400, { error: 'Use a JPEG, PNG or WebP picture.' });
  if (typeof body.data !== 'string' || !body.data) return json(400, { error: 'This file is not a picture.' });
  const buf = Buffer.from(body.data, 'base64');
  if (buf.length > MAX_IMAGE_BYTES) return json(413, { error: 'The picture is too big.' });
  if (!buf.length || !looksLike(type, buf)) return json(400, { error: 'This file is not a picture.' });

  const { count, error: countErr } = await supabase.from('media').select('id', { count: 'exact', head: true }).eq('tribe_id', tribe.id).eq('kind', 'image');
  if (countErr) return json(500, { error: countErr.message });
  if (count >= MAX_IMAGES_PER_VILLAGE) {
    return json(409, { error: `This village already has ${MAX_IMAGES_PER_VILLAGE} pictures. Delete one first.` });
  }

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-picture.${IMAGE_TYPES[type]}`;
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: false });
  if (uploadErr) return json(500, { error: uploadErr.message });

  const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, 120) : '';
  const { data: row, error: insertErr } = await supabase
    .from('media')
    .insert({ tribe_id: tribe.id, kind: 'image', title: caption, storage_path: path, mime_type: type })
    .select('id, tribe_id, kind, title, storage_path')
    .single();
  if (insertErr) {
    // No row, so the file would never be found again: take it away.
    await supabase.storage.from(BUCKET).remove([path]);
    return json(500, { error: insertErr.message });
  }
  return json(200, { ok: true, media: row });
}

async function handleDeleteImage(supabase, user, body) {
  const { data: item, error } = await supabase
    .from('media')
    .select('id, tribe_id, kind, storage_path')
    .eq('id', String(body.id || ''))
    .maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!item || !item.tribe_id) return json(404, { error: 'Picture not found' });

  const { response } = await villageForPictures(supabase, user, item.tribe_id);
  if (response) return response;

  const { error: delErr } = await supabase.from('media').delete().eq('id', item.id);
  if (delErr) return json(500, { error: delErr.message });
  if (item.storage_path) await supabase.storage.from(BUCKET).remove([item.storage_path]);
  return json(200, { ok: true });
}

async function handleGet(supabase, user) {
  const [open, villagesRes, myVillagesRes, myVillagersRes] = await Promise.all([
    submissionsOpen(supabase),
    supabase.from('tribes').select('id, name, status').in('status', ['pending', 'approved']).order('name'),
    myVillages(supabase, user),
    supabase
      .from('characters')
      .select('id, name, status, charter, charter_original, source_lang, tribe_id, updated_at')
      .eq('submitted_by', user)
      .order('created_at'),
  ]);
  const err = villagesRes.error || myVillagesRes.error || myVillagersRes.error;
  if (err) return json(500, { error: err.message });

  // The pictures students have added to their villages, for the Pictures part of the form.
  let media = [];
  const villageIds = myVillagesRes.data.map((v) => v.id);
  if (villageIds.length) {
    const { data: mediaRows, error: mediaErr } = await supabase
      .from('media')
      .select('id, tribe_id, kind, title, storage_path')
      .in('tribe_id', villageIds)
      .order('created_at');
    if (mediaErr) return json(500, { error: mediaErr.message });
    media = mediaRows;
  }

  return json(200, {
    me: user,
    open,
    // Norwegian writing needs a translation key on the server.
    translation: Boolean((process.env.DEEPL_API_KEY || '').trim()),
    villages: villagesRes.data,
    mine: { villages: myVillagesRes.data, villagers: myVillagersRes.data, media },
  });
}

async function saveVillage(supabase, user, body, charter, name, extra) {
  const map = cleanMap(body.map);
  const fields = {
    name,
    charter,
    charter_original: extra.original,
    source_lang: extra.lang,
    charter_type: body.type,
    resource: (charter.main_resource || '').slice(0, 200),
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data: existing, error } = await supabase
      .from('tribes')
      .select('id, status, territory, submitted_by')
      .eq('id', body.id)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    // A village that is not yours looks exactly like one that does not exist.
    if (!existing || !(await mayEditVillage(supabase, existing, user))) return json(404, { error: 'Submission not found' });
    if (existing.status !== 'pending') return json(409, { error: 'This village has already been reviewed by your teacher.' });

    const territory = { ...(existing.territory || {}), ...(map || {}) };
    const { error: upErr } = await supabase.from('tribes').update({ ...fields, territory }).eq('id', existing.id);
    if (upErr) return json(500, { error: upErr.message });
    return json(200, { ok: true, id: existing.id });
  }

  const id = newId('tribe', name);
  // The code has to be unique; in the rare case of a clash, try another one.
  let insErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    ({ error: insErr } = await supabase.from('tribes').insert({
      id,
      ...fields,
      territory: { region_name: '', ...(map || {}) },
      culture: '',
      relations: {},
      status: 'pending',
      submitted_by: user,
      join_code: newJoinCode(),
    }));
    if (!insErr || insErr.code !== '23505' || !/join_code/.test(insErr.message || '')) break;
  }
  if (insErr) return json(500, { error: insErr.message });
  const { error: memberErr } = await supabase.from('village_members').insert({ tribe_id: id, user_id: user });
  if (memberErr) console.error('Could not add the creator to the group:', memberErr.message);
  return json(200, { ok: true, id });
}

async function saveVillager(supabase, user, body, charter, name, extra) {
  const tribeId = String(body.tribe_id || '');
  const { data: tribe, error: tribeErr } = await supabase
    .from('tribes')
    .select('id, status')
    .eq('id', tribeId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();
  if (tribeErr) return json(500, { error: tribeErr.message });
  if (!tribe) return json(400, { error: 'Choose your village from the list.' });

  const fields = {
    name,
    charter,
    charter_original: extra.original,
    source_lang: extra.lang,
    tribe_id: tribe.id,
    role: (charter.role || '').slice(0, 120),
    goal: charter.goal || '',
    description: [charter.appearance, charter.personality].filter(Boolean).join('\n\n'),
    strengths: charter.strengths ? [charter.strengths] : [],
    weaknesses: charter.weaknesses ? [charter.weaknesses] : [],
    student_name: studentName(user),
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data: existing, error } = await supabase
      .from('characters')
      .select('id, status')
      .eq('id', body.id)
      .eq('submitted_by', user)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!existing) return json(404, { error: 'Submission not found' });
    if (existing.status !== 'pending') return json(409, { error: 'Your villager has already been reviewed by your teacher.' });

    const { error: upErr } = await supabase.from('characters').update(fields).eq('id', existing.id);
    if (upErr) return json(500, { error: upErr.message });
    return json(200, { ok: true, id: existing.id });
  }

  const id = newId('char', name);
  const { error: insErr } = await supabase
    .from('characters')
    .insert({ id, ...fields, status: 'pending', submitted_by: user });
  if (insErr) return json(500, { error: insErr.message });
  return json(200, { ok: true, id });
}

exports.handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  const supabase = getSupabaseAdmin();

  if (event.httpMethod === 'GET') return handleGet(supabase, user);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  if (!(await submissionsOpen(supabase))) {
    return json(403, { error: 'Submissions are closed right now.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  if (body.action === 'join') return handleJoin(supabase, user, body.code);
  if (body.action === 'add-image') return handleAddImage(supabase, user, body);
  if (body.action === 'delete-image') return handleDeleteImage(supabase, user, body);

  if (!TYPES.includes(body.type)) return json(400, { error: 'Unknown form type' });
  const charter = cleanCharter(body.charter);
  if (!charter) return json(400, { error: 'Invalid answers' });
  const name = (charter.name || '').slice(0, MAX_NAME);
  if (!name) return json(400, { error: 'A name is required.' });

  // A student who wrote in Norwegian gets the answers translated here, once,
  // when they send. The English version is what the game shows; the Norwegian
  // original is kept next to it. If the translation fails nothing is saved,
  // so the student can simply press send again.
  let saved = charter;
  const extra = { lang: 'en', original: null };
  if (body.lang === 'no') {
    try {
      saved = await translateToEnglish(charter);
    } catch (e) {
      console.error('Translation failed:', e.code || e.message);
      return json(503, { error: 'translation_unavailable' });
    }
    extra.lang = 'no';
    extra.original = charter;
  }

  return body.type === 'villager'
    ? saveVillager(supabase, user, body, saved, name, extra)
    : saveVillage(supabase, user, body, saved, name, extra);
});
