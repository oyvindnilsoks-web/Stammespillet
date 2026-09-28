const crypto = require('crypto');
const { serializeCookie } = require('./_lib/cookies');
const { ADMIN_COOKIE, ADMIN_TTL_SECONDS, createAdminToken } = require('./_lib/session');

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'DELETE') {
    return {
      statusCode: 200,
      headers: { 'Set-Cookie': serializeCookie(ADMIN_COOKIE, '', { maxAge: 0, sameSite: 'strict' }) },
      body: JSON.stringify({ ok: true }),
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ADMIN_PASSWORD is not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const ok = crypto.timingSafeEqual(sha256(body.password || ''), sha256(expected));
  if (!ok) {
    // Slows down password guessing without needing server-side state.
    await new Promise((r) => setTimeout(r, 800));
    return { statusCode: 401, body: JSON.stringify({ error: 'Wrong password' }) };
  }

  const token = await createAdminToken();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': serializeCookie(ADMIN_COOKIE, token, { maxAge: ADMIN_TTL_SECONDS, sameSite: 'strict' }),
    },
    body: JSON.stringify({ ok: true }),
  };
};
