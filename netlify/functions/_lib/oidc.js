const crypto = require('crypto');

let discoveryCache = null;
let discoveryCacheAt = 0;
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

// Standard OIDC discovery - works against any spec-compliant Feide/Dataporten
// OIDC endpoint without hardcoding endpoint URLs, since Steinkjer kommune's
// exact issuer URL is set up on their side and only known once configured.
async function discoverOidcConfig() {
  const issuer = process.env.FEIDE_ISSUER;
  if (!issuer) return null;
  const now = Date.now();
  if (discoveryCache && now - discoveryCacheAt < DISCOVERY_TTL_MS) return discoveryCache;

  const res = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  discoveryCache = await res.json();
  discoveryCacheAt = now;
  return discoveryCache;
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(bytes = 32) {
  return base64url(crypto.randomBytes(bytes));
}

function pkcePair() {
  const verifier = randomToken(32);
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

module.exports = { discoverOidcConfig, randomToken, pkcePair };
