// Primary login while Feide is not yet connected: a student types a name,
// and that becomes their session id. No password, no Feide round-trip.
// Session ids are prefixed "name:" so they never collide with a later real
// Feide `sub` claim (or with the "dev:" test-login ids used for engine
// testing). Two students who type the exact same name will share one
// session/progress record - tell the class to use a full name or initials.
const { serializeCookie } = require('./_lib/cookies');
const { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } = require('./_lib/session');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const name = (body.name || '').trim().slice(0, 60);
  if (!name) return { statusCode: 400, body: 'name required' };

  const feideId = `name:${name.toLowerCase()}`;
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
