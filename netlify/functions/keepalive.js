const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');

// Scheduled daily (see netlify.toml). Supabase's free tier pauses a project
// after about a week without traffic, which takes the whole game offline -
// one tiny query a day keeps it awake during quiet school weeks.
exports.handler = async () => {
  const { error } = await getSupabaseAdmin().from('settings').select('key').limit(1);
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: 'ok' };
};
