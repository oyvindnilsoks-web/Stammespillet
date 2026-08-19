const { jwtVerify, createRemoteJWKSet } = require('jose');
const { parseCookies, serializeCookie } = require('./_lib/cookies');
const { discoverOidcConfig } = require('./_lib/oidc');
const { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } = require('./_lib/session');

function redirectUri(event) {
  if (process.env.FEIDE_REDIRECT_URI) return process.env.FEIDE_REDIRECT_URI;
  const host = event.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/api/auth/callback`;
}

const expireCookieOpts = { maxAge: 0 };

exports.handler = async (event) => {
  const clearTransientCookies = [
    serializeCookie('feide_state', '', expireCookieOpts),
    serializeCookie('feide_nonce', '', expireCookieOpts),
    serializeCookie('feide_verifier', '', expireCookieOpts),
  ];

  try {
    const q = event.queryStringParameters || {};
    const cookies = parseCookies(event);

    if (q.error) throw new Error(`Feide returned error: ${q.error}`);
    if (!q.code || !q.state) throw new Error('Missing code/state in callback');
    if (q.state !== cookies.feide_state) throw new Error('State mismatch');

    const oidc = await discoverOidcConfig();
    if (!oidc) throw new Error('OIDC not configured');

    const tokenRes = await fetch(oidc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: q.code,
        redirect_uri: redirectUri(event),
        client_id: process.env.FEIDE_CLIENT_ID,
        client_secret: process.env.FEIDE_CLIENT_SECRET,
        code_verifier: cookies.feide_verifier,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
    const tokens = await tokenRes.json();
    if (!tokens.id_token) throw new Error('No id_token in token response');

    const jwks = createRemoteJWKSet(new URL(oidc.jwks_uri));
    const { payload } = await jwtVerify(tokens.id_token, jwks, {
      issuer: oidc.issuer,
      audience: process.env.FEIDE_CLIENT_ID,
    });
    if (payload.nonce !== cookies.feide_nonce) throw new Error('Nonce mismatch');
    if (!payload.sub) throw new Error('id_token missing sub claim');

    // Only the unique subject identifier is kept - no name, email, or other
    // personal data is extracted from the id_token.
    const feideId = `feide:${payload.sub}`;
    const sessionToken = await createSessionToken(feideId);

    return {
      statusCode: 302,
      multiValueHeaders: {
        'Set-Cookie': [
          ...clearTransientCookies,
          serializeCookie(SESSION_COOKIE, sessionToken, { maxAge: SESSION_TTL_SECONDS }),
        ],
      },
      headers: { Location: '/' },
    };
  } catch (err) {
    return {
      statusCode: 302,
      multiValueHeaders: { 'Set-Cookie': clearTransientCookies },
      headers: { Location: `/?login_error=${encodeURIComponent(err.message)}` },
    };
  }
};
