const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');

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

async function handleGet(supabase, user) {
  const [open, villagesRes, myVillagesRes, myVillagersRes] = await Promise.all([
    submissionsOpen(supabase),
    supabase.from('tribes').select('id, name, status').in('status', ['pending', 'approved']).order('name'),
    supabase
      .from('tribes')
      .select('id, name, status, charter, charter_type, territory, updated_at')
      .eq('submitted_by', user)
      .order('created_at'),
    supabase
      .from('characters')
      .select('id, name, status, charter, tribe_id, updated_at')
      .eq('submitted_by', user)
      .order('created_at'),
  ]);
  const err = villagesRes.error || myVillagesRes.error || myVillagersRes.error;
  if (err) return json(500, { error: err.message });

  return json(200, {
    open,
    villages: villagesRes.data,
    mine: { villages: myVillagesRes.data, villagers: myVillagersRes.data },
  });
}

async function saveVillage(supabase, user, body, charter, name) {
  const map = cleanMap(body.map);
  const fields = {
    name,
    charter,
    charter_type: body.type,
    resource: (charter.main_resource || '').slice(0, 200),
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data: existing, error } = await supabase
      .from('tribes')
      .select('id, status, territory')
      .eq('id', body.id)
      .eq('submitted_by', user)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!existing) return json(404, { error: 'Submission not found' });
    if (existing.status !== 'pending') return json(409, { error: 'This village has already been reviewed by your teacher.' });

    const territory = { ...(existing.territory || {}), ...(map || {}) };
    const { error: upErr } = await supabase.from('tribes').update({ ...fields, territory }).eq('id', existing.id);
    if (upErr) return json(500, { error: upErr.message });
    return json(200, { ok: true, id: existing.id });
  }

  const id = newId('tribe', name);
  const { error: insErr } = await supabase.from('tribes').insert({
    id,
    ...fields,
    territory: { region_name: '', ...(map || {}) },
    culture: '',
    relations: {},
    status: 'pending',
    submitted_by: user,
  });
  if (insErr) return json(500, { error: insErr.message });
  return json(200, { ok: true, id });
}

async function saveVillager(supabase, user, body, charter, name) {
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
    tribe_id: tribe.id,
    role: (charter.role || '').slice(0, 120),
    goal: charter.goal || '',
    description: charter.appearance || '',
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

exports.handler = async (event) => {
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

  if (!TYPES.includes(body.type)) return json(400, { error: 'Unknown form type' });
  const charter = cleanCharter(body.charter);
  if (!charter) return json(400, { error: 'Invalid answers' });
  const name = (charter.name || '').slice(0, MAX_NAME);
  if (!name) return json(400, { error: 'A name is required.' });

  return body.type === 'villager'
    ? saveVillager(supabase, user, body, charter, name)
    : saveVillage(supabase, user, body, charter, name);
};
