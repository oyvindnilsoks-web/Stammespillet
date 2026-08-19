const { createClient } = require('@supabase/supabase-js');

let client;

// Service-role client for server-side use only (Netlify Functions). Never
// send SUPABASE_SERVICE_ROLE_KEY to the browser - it bypasses RLS entirely.
function getSupabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are missing');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

module.exports = { getSupabaseAdmin };
