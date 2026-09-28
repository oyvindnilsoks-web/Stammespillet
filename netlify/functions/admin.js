const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { ADMIN_COOKIE, isAdminToken } = require('./_lib/session');
const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');

const BUCKET = 'media';
const STATUSES = ['pending', 'approved', 'rejected', 'archived'];
const MEDIA_KINDS = ['shield', 'drawing', 'song', 'image', 'other'];
const RELATIONS = ['allied', 'rival', 'neutral'];
const STORAGE_PATH = /^\d{4}\/[0-9a-f-]{36}-[\w.-]{1,80}$/;

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function lines(v) {
  return str(v, 4000)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(v) {
  const n = Number(v);
  return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n;
}

async function loadAll(supabase) {
  const [villages, villagers, media, settings] = await Promise.all([
    supabase.from('tribes').select('*').order('created_at'),
    supabase.from('characters').select('*').order('created_at'),
    supabase.from('media').select('*').order('sort_order').order('created_at'),
    supabase.from('settings').select('key, value'),
  ]);
  const err = villages.error || villagers.error || media.error || settings.error;
  if (err) return json(500, { error: err.message });
  return json(200, {
    villages: villages.data,
    villagers: villagers.data,
    media: media.data,
    settings: Object.fromEntries(settings.data.map((s) => [s.key, s.value])),
  });
}

async function saveVillage(supabase, { id, fields = {} }) {
  const { data: existing, error } = await supabase.from('tribes').select('territory').eq('id', id).maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!existing) return json(404, { error: 'Village not found' });

  const relations = {};
  for (const [otherId, rel] of Object.entries(fields.relations || {})) {
    if (RELATIONS.includes(rel) && otherId !== id) relations[otherId] = rel;
  }
  const mapX = num(fields.map_x);
  const mapY = num(fields.map_y);

  const { error: upErr } = await supabase
    .from('tribes')
    .update({
      name: str(fields.name, 60) || 'Unnamed village',
      resource: str(fields.resource, 300),
      culture: str(fields.culture, 2000),
      population: num(fields.population),
      charter_type: fields.charter_type === 'shadow' ? 'shadow' : 'village',
      image: str(fields.image, 500) || null,
      relations,
      territory: {
        ...(existing.territory || {}),
        region_name: str(fields.region_name, 80),
        map_x: mapX,
        map_y: mapY,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (upErr) return json(500, { error: upErr.message });
  return json(200, { ok: true });
}

async function saveVillager(supabase, { id, fields = {} }) {
  const { error } = await supabase
    .from('characters')
    .update({
      name: str(fields.name, 60) || 'Unnamed villager',
      role: str(fields.role, 120),
      tribe_id: str(fields.tribe_id, 100),
      goal: str(fields.goal, 2000),
      description: str(fields.description, 2000),
      strengths: lines(fields.strengths),
      weaknesses: lines(fields.weaknesses),
      student_name: str(fields.student_name, 80) || null,
      image: str(fields.image, 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}

async function setStatus(supabase, { table, id, status }) {
  if (!['tribes', 'characters'].includes(table) || !STATUSES.includes(status)) {
    return json(400, { error: 'Invalid status change' });
  }
  const { error } = await supabase.from(table).update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}

async function removeStorage(supabase, rows) {
  const paths = rows.map((r) => r.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

async function deleteRow(supabase, { table, id }) {
  if (!['tribes', 'characters'].includes(table)) return json(400, { error: 'Invalid table' });

  if (table === 'tribes') {
    const { count, error } = await supabase
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('tribe_id', id);
    if (error) return json(500, { error: error.message });
    if (count > 0) {
      return json(409, { error: `This village still has ${count} villager(s). Move or delete them first - or archive the village instead.` });
    }
  }

  const column = table === 'tribes' ? 'tribe_id' : 'character_id';
  const { data: media } = await supabase.from('media').select('storage_path').eq(column, id);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    return json(409, { error: 'Could not delete - it is still in use in the game. Archive it instead.' });
  }
  await removeStorage(supabase, media || []);
  return json(200, { ok: true });
}

async function uploadUrl(supabase, { filename }) {
  const safe = String(filename || 'file').replace(/[^\w.-]+/g, '_').slice(-80) || 'file';
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return json(500, { error: error.message });
  return json(200, { path: data.path, token: data.token });
}

async function addMedia(supabase, body) {
  const tribeId = body.tribe_id ? String(body.tribe_id) : null;
  const characterId = body.character_id ? String(body.character_id) : null;
  if (!!tribeId === !!characterId) return json(400, { error: 'Media must belong to one village or one villager' });
  if (!MEDIA_KINDS.includes(body.kind)) return json(400, { error: 'Unknown media type' });
  const storagePath = body.storage_path ? String(body.storage_path) : null;
  if (storagePath && !STORAGE_PATH.test(storagePath)) return json(400, { error: 'Invalid file path' });
  const text = str(body.body, 8000);
  if (!storagePath && !text) return json(400, { error: 'Add a file or some text' });

  const { data, error } = await supabase
    .from('media')
    .insert({
      tribe_id: tribeId,
      character_id: characterId,
      kind: body.kind,
      title: str(body.title, 120),
      body: text,
      storage_path: storagePath,
      mime_type: str(body.mime_type, 100) || null,
    })
    .select()
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, media: data });
}

async function deleteMedia(supabase, { id }) {
  const { data: row, error } = await supabase.from('media').select('id, storage_path').eq('id', id).maybeSingle();
  if (error) return json(500, { error: error.message });
  if (!row) return json(404, { error: 'Not found' });
  const { error: delErr } = await supabase.from('media').delete().eq('id', id);
  if (delErr) return json(500, { error: delErr.message });
  await removeStorage(supabase, [row]);
  return json(200, { ok: true });
}

async function setSetting(supabase, { key, value }) {
  if (key !== 'submissions_open' || typeof value !== 'boolean') return json(400, { error: 'Invalid setting' });
  const { error } = await supabase.from('settings').upsert({ key, value });
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}

const ACTIONS = {
  'save-village': saveVillage,
  'save-villager': saveVillager,
  'set-status': setStatus,
  delete: deleteRow,
  'upload-url': uploadUrl,
  'add-media': addMedia,
  'delete-media': deleteMedia,
  'set-setting': setSetting,
};

exports.handler = async (event) => {
  if (!(await isAdminToken(parseCookies(event)[ADMIN_COOKIE]))) {
    return json(401, { error: 'Not logged in as admin' });
  }

  const supabase = getSupabaseAdmin();
  if (event.httpMethod === 'GET') return loadAll(supabase);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const action = ACTIONS[body.action];
  if (!action) return json(400, { error: 'Unknown action' });
  return action(supabase, body);
};
