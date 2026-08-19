// Local/test-only login that bypasses Feide entirely. Only works when
// ENABLE_DEV_LOGIN=true is set in the Netlify environment - this must stay
// unset (or "false") in production once real Feide credentials are wired up.
const { serializeCookie } = require('./_lib/cookies');
const { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } = require('./_lib/session');

exports.handler = async (event) => {
  if (process.env.ENABLE_DEV_LOGIN !== 'true') {
    return { statusCode: 404, body: 'Not found' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const raw = (body.testId || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!raw) return { statusCode: 400, body: 'testId required' };

  const feideId = `dev:${raw}`;
  const sessionToken = await createSessionToken(feideId);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': serializeCookie(SESSION_COOKIE, sessionToken, { maxAge: SESSION_TTL_SECONDS }),
    },
    body: JSON.stringify({ ok: true }),
  };
};
