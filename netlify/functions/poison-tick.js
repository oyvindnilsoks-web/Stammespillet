const { getSupabaseAdmin } = require('./_lib/supabaseAdmin');
const world = require('./_lib/world');

// Scheduled every five minutes (see netlify.toml). Moves the poison of the evil
// villages one step, but only when the teacher has started it, it is a school
// day between 08:00 and 15:30, and the chosen number of minutes has passed.
exports.handler = async () => {
  try {
    const result = await world.advance(getSupabaseAdmin());
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    console.error('Poison step failed:', e.message);
    return { statusCode: 500, body: 'failed' };
  }
};
