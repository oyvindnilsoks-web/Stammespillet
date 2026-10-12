const crypto = require('crypto');
const { parseCookies, serializeCookie } = require('./_lib/cookies');
const { ADMIN_COOKIE, ADMIN_TTL_SECONDS, createAdminToken, verifySessionToken, SESSION_COOKIE } = require('./_lib/session');
const { isAdminStudent } = require('./_lib/students');

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}

async function adminCookieResponse() {
  const token = await createAdminToken();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': serializeCookie(ADMIN_COOKIE, token, { maxAge: ADMIN_TTL_SECONDS, sameSite: 'strict' }),
    },
    body: JSON.stringify({ ok: true }),
  };
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // A teacher whose Feide user is marked is_admin in the students table gets
  // in without the password. The Feide session cookie is signed by us, and
  // only feide: ids can be admins, so a name or dev login can never get here.
  if (body.feide === true) {
    let userId = null;
    try {
      const token = parseCookies(event)[SESSION_COOKIE];
      userId = token ? await verifySessionToken(token) : null;
    } catch {}
    let allowed = false;
    try {
      allowed = await isAdminStudent(userId);
    } catch (e) {
      console.error('Admin check failed:', e.message);
    }
    if (!allowed) return { statusCode: 403, body: JSON.stringify({ error: 'Not an admin' }) };
    return adminCookieResponse();
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ADMIN_PASSWORD is not configured' }) };
  }

  const ok = crypto.timingSafeEqual(sha256(body.password || ''), sha256(expected));
  if (!ok) {
    // Slows down password guessing without needing server-side state.
    await new Promise((r) => setTimeout(r, 800));
    return { statusCode: 401, body: JSON.stringify({ error: 'Wrong password' }) };
  }

  return adminCookieResponse();
};
