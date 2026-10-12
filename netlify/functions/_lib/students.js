const { getSupabaseAdmin } = require('./supabaseAdmin');

// The students table is only reachable with the service role (RLS on, no
// policies), so every read and write of it goes through these helpers.

// Called on every Feide login. display_name is only written when Feide gave
// us one, so a failed userinfo call never wipes a name we already have.
// is_admin is never touched here; it is set by hand in the database.
async function upsertStudent(userId, displayName) {
  const row = { user_id: userId, last_login: new Date().toISOString() };
  if (displayName) row.display_name = displayName;
  const { error } = await getSupabaseAdmin().from('students').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

async function getStudent(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from('students')
    .select('display_name, is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Only real Feide users can be admins; name: and dev: logins never are.
async function isAdminStudent(userId) {
  if (!userId || !userId.startsWith('feide:')) return false;
  const student = await getStudent(userId);
  return Boolean(student && student.is_admin === true);
}

// user_id -> display_name for the teacher's admin page.
async function loadOwners() {
  const { data, error } = await getSupabaseAdmin().from('students').select('user_id, display_name');
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map((s) => [s.user_id, s.display_name || '']));
}

module.exports = { upsertStudent, getStudent, isAdminStudent, loadOwners };
