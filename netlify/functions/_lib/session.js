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

// feideId must be a stable, unique, non-personal identifier from the OIDC id_token
// (the `sub` claim), never a name, birthdate, or other personal data.
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

module.exports = { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, verifySessionToken };
