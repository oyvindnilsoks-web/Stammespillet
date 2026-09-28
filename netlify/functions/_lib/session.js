const { SignJWT, jwtVerify } = require('jose');

const SESSION_COOKIE = 'stammespillet_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET env var is missing or too short (set it in Netlify site settings)');
  }
  return new TextEncoder().encode(secret);
}

// feideId is the session's identity key. While Feide is not connected it is
// the student's self-chosen login name, prefixed "name:" (see
// auth-name-login.js). Once Feide is wired up it should become the OIDC
// id_token's `sub` claim instead - a stable, unique, non-personal identifier,
// never a name, birthdate, or other personal data.
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
  createSessionToken,
  verifySessionToken,
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  createAdminToken,
  isAdminToken,
};
