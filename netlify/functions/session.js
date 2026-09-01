const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE } = require('./_lib/session');

exports.handler = async (event) => {
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE];
  if (!token) return { statusCode: 200, body: JSON.stringify({ authenticated: false }) };

  try {
    const feideId = await verifySessionToken(token);
    // "name:..." ids are the self-chosen login name (nothing sensitive to
    // hide), so show it as-is. Anything else - a future real Feide `sub`
    // claim - stays a short, non-reversible display tag so the UI can show
    // "logged in as ..." without leaking the id.
    const displayTag = feideId.startsWith('name:')
      ? feideId.slice('name:'.length)
      : crypto.createHash('sha256').update(feideId).digest('hex').slice(0, 8);
    return { statusCode: 200, body: JSON.stringify({ authenticated: true, displayTag }) };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ authenticated: false }) };
  }
};
