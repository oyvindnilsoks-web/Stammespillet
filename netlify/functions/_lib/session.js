const { SignJWT, jwtVerify } = require('jose');
const { parseCookies, serializeCookie } = require('./cookies');

const SESSION_COOKIE = 'stammespillet_session';

// A session ends after this long without activity. Every API call renews it
// (see withSessionRenewal), so a student who keeps working is never thrown
// out, while a classroom PC that someone forgot to log out of stops being
// logged in after a few hours.
const SESSION_TTL_SECONDS = 4 * 60 * 60;
const SESSION_RENEW_AFTER_SECONDS = 15 * 60;

// The Feide id_token from login, kept so logout can tell Feide which service
// and user is logging out (Feide requires it as id_token_hint). It lives
// longer than the session so a renewed session can still log out of Feide.
const ID_TOKEN_COOKIE = 'feide_idt';
const ID_TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET env var is missing or too short (set it in Netlify site settings)');
  }
  return new TextEncoder().encode(secret);
}

// feideId is the session's identity key: "feide:<sub>" for a real Feide login
// (a stable, unique id, never a name), "name:<typed name>" for the name login
// and "dev:<id>" for the engine-testing login.
async function createSessionToken(feideId) {
  return new SignJWT({ sub: feideId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function verifySessionToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload.sub;
}

// Returns a Set-Cookie value with a fresh session token when the current one
// is valid but older than SESSION_RENEW_AFTER_SECONDS, otherwise null.
// Renewing at most every 15 minutes avoids rewriting the cookie on every call.
async function renewedSessionCookie(event) {
  const token = parseCookies(event)[SESSION_COOKIE];
  if (!token) return null;
  const { payload } = await jwtVerify(token, getSecret());
  const age = Math.floor(Date.now() / 1000) - (payload.iat || 0);
  if (age < SESSION_RENEW_AFTER_SECONDS) return null;
  const fresh = await createSessionToken(payload.sub);
  return serializeCookie(SESSION_COOKIE, fresh, { maxAge: SESSION_TTL_SECONDS });
}

// Wraps an API handler so a successful call from a logged-in user also
// extends their session. Failed calls and anonymous calls are left alone.
function withSessionRenewal(handler) {
  return async (event, context) => {
    const res = await handler(event, context);
    try {
      if (res && res.statusCode < 400) {
        const cookie = await renewedSessionCookie(event);
        if (cookie) {
          if (res.multiValueHeaders && res.multiValueHeaders['Set-Cookie']) {
            res.multiValueHeaders['Set-Cookie'] = [].concat(res.multiValueHeaders['Set-Cookie'], cookie);
          } else {
            res.headers = { ...(res.headers || {}), 'Set-Cookie': cookie };
          }
        }
      }
    } catch {
      // No valid session, nothing to renew.
    }
    return res;
  };
}

// Teacher admin session: same secret, but a separate cookie and an
// `aud: 'admin'` claim, so a student's session token can never pass as admin.
const ADMIN_COOKIE = 'stammespillet_admin';
const ADMIN_TTL_SECONDS = 8 * 60 * 60;

async function createAdminToken() {
  return new SignJWT({ sub: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('admin')
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function isAdminToken(token) {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret(), { audience: 'admin' });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SESSION_RENEW_AFTER_SECONDS,
  ID_TOKEN_COOKIE,
  ID_TOKEN_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  renewedSessionCookie,
  withSessionRenewal,
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  createAdminToken,
  isAdminToken,
};
