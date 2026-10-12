const { getSupabaseAdmin } = require('./supabaseAdmin');
const { validFigure } = require('./figures');

// Drafts are the Contribute text a student has typed but not sent yet. The
// table is only reachable with the service role (RLS on, no policies), and
// every row belongs to one session id (feide:<sub>, name:<name>).

const KINDS = ['village', 'villager'];
const FORM_TYPES = { village: ['village', 'shadow'], villager: ['villager'] };
const MAX_KEYS = 60;
const MAX_VALUE = 2000;
const MAX_DRAFTS_PER_OWNER = 30;
const REF = /^(new|(?:tribe|char)_[a-z0-9-]{1,60})$/;

function isRef(value) {
  return typeof value === 'string' && REF.test(value);
}

// Returns a clean copy of a draft, or null if it is not a valid draft.
// Unlike a real submission nothing is trimmed: a student who has just typed a
// space at the end of a sentence must find it there when the text comes back.
function cleanDraft(kind, raw) {
  if (!KINDS.includes(kind)) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!FORM_TYPES[kind].includes(raw.type)) return null;
  if (!raw.charter || typeof raw.charter !== 'object' || Array.isArray(raw.charter)) return null;

  const entries = Object.entries(raw.charter);
  if (entries.length > MAX_KEYS) return null;
  const charter = {};
  for (const [key, value] of entries) {
    if (!/^[a-z_]{1,40}$/.test(key) || typeof value !== 'string') return null;
    charter[key] = value.slice(0, MAX_VALUE);
  }

  const out = { type: raw.type, charter, lang: raw.lang === 'no' ? 'no' : 'en' };
  if (kind === 'village') {
    const m = raw.map;
    const x = Number(m && m.x);
    const y = Number(m && m.y);
    out.map = m && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100 ? { x, y } : null;
  } else {
    out.tribe_id = typeof raw.tribe_id === 'string' ? raw.tribe_id.slice(0, 100) : '';
    out.sprite = validFigure(raw.sprite);
  }
  return out;
}

async function listDrafts(ownerId) {
  const { data, error } = await getSupabaseAdmin()
    .from('drafts')
    .select('kind, ref_id, content, updated_at')
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return data;
}

// Throws an error with code "too_many" when a student already has
// MAX_DRAFTS_PER_OWNER drafts and this would be a new one.
async function saveDraft(ownerId, kind, refId, content) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: findErr } = await supabase
    .from('drafts')
    .select('ref_id')
    .eq('owner_id', ownerId)
    .eq('kind', kind)
    .eq('ref_id', refId)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (!existing) {
    const { count, error: countErr } = await supabase
      .from('drafts')
      .select('ref_id', { count: 'exact', head: true })
      .eq('owner_id', ownerId);
    if (countErr) throw new Error(countErr.message);
    if (count >= MAX_DRAFTS_PER_OWNER) {
      const err = new Error('Too many drafts');
      err.code = 'too_many';
      throw err;
    }
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('drafts')
    .upsert({ owner_id: ownerId, kind, ref_id: refId, content, updated_at: updatedAt }, { onConflict: 'owner_id,kind,ref_id' });
  if (error) throw new Error(error.message);
  return updatedAt;
}

async function deleteDraft(ownerId, kind, refId) {
  const { error } = await getSupabaseAdmin()
    .from('drafts')
    .delete()
    .eq('owner_id', ownerId)
    .eq('kind', kind)
    .eq('ref_id', refId);
  if (error) throw new Error(error.message);
}

module.exports = { KINDS, MAX_DRAFTS_PER_OWNER, isRef, cleanDraft, listDrafts, saveDraft, deleteDraft };
