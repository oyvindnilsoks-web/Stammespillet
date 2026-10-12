const { jwtVerify, createRemoteJWKSet } = require('jose');
const { parseCookies, serializeCookie } = require('./_lib/cookies');
const { discoverOidcConfig } = require('./_lib/oidc');
const { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, ID_TOKEN_COOKIE, ID_TOKEN_TTL_SECONDS } = require('./_lib/session');
const { upsertStudent } = require('./_lib/students');

function redirectUri(event) {
  if (process.env.FEIDE_REDIRECT_URI) return process.env.FEIDE_REDIRECT_URI;
  const host = event.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/api/auth/callback`;
}

const expireCookieOpts = { maxAge: 0 };

// The browser only gets a short code (shown as a friendly message by main.js).
// The detail goes to the function log, never to the student.
// "why" is a short machine code (letters, digits, underscore) that main.js
// shows as "(code: ...)" so a teacher can tell which step failed. It never
// contains secrets, tokens or user data.
function safe(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
}

function fail(code, detail, why) {
  const err = new Error(detail || code);
  err.loginCode = code;
  err.why = why;
  return err;
}

// The student's name comes from Feide's userinfo endpoint (scope "profile").
// It is ignored unless the response belongs to the same user as the id_token,
// and a failure here never blocks the login: the student just has no name.
async function fetchName(oidc, accessToken, payload) {
  let info = {};
  if (oidc.userinfo_endpoint && accessToken) {
    try {
      const res = await fetch(oidc.userinfo_endpoint, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        info = await res.json();
        // Claim names only, never values.
        console.log('Feide userinfo claims:', Object.keys(info).join(', '));
        if (info.sub && info.sub !== payload.sub) info = {};
      } else {
        console.error('Feide userinfo failed:', res.status);
      }
    } catch (e) {
      console.error('Feide userinfo error:', e.message);
    }
  }
  const name = info.name || payload.name;
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 100) : null;
}

exports.handler = async (event) => {
  const clearTransientCookies = [
    serializeCookie('feide_state', '', expireCookieOpts),
    serializeCookie('feide_nonce', '', expireCookieOpts),
    serializeCookie('feide_verifier', '', expireCookieOpts),
    serializeCookie('feide_next', '', expireCookieOpts),
  ];

  try {
    const q = event.queryStringParameters || {};
    const cookies = parseCookies(event);

    if (q.error) throw fail(q.error === 'access_denied' ? 'cancelled' : 'failed', `Feide returned error: ${q.error} ${q.error_description || ''}`, `provider_${safe(q.error)}`);
    if (!q.code || !q.state) throw fail('failed', 'Missing code/state in callback', 'no_code');
    if (!cookies.feide_state || q.state !== cookies.feide_state) throw fail('state', 'State mismatch or expired login cookie');

    let oidc;
    try {
      oidc = await discoverOidcConfig();
    } catch (e) {
      throw fail('failed', `Discovery failed: ${e.message}`, 'discovery');
    }
    if (!oidc) throw fail('failed', 'OIDC not configured', 'not_configured');

    const clientId = (process.env.FEIDE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.FEIDE_CLIENT_SECRET || '').trim();
    if (!clientSecret) throw fail('failed', 'FEIDE_CLIENT_SECRET is not set for this deploy context', 'no_secret');

    const tokenRes = await fetch(oidc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: q.code,
        redirect_uri: redirectUri(event),
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: cookies.feide_verifier,
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      let oauthError = '';
      try {
        oauthError = JSON.parse(text).error;
      } catch {}
      throw fail('failed', `Token exchange failed: ${tokenRes.status} ${text}`, `token_${tokenRes.status}_${safe(oauthError)}${clientSecret === clientId ? '_secret_is_client_id' : ''}`.replace(/_+$/, ''));
    }
    const tokens = await tokenRes.json();
    if (!tokens.id_token) throw fail('failed', 'No id_token in token response', 'no_id_token');

    const jwks = createRemoteJWKSet(new URL(oidc.jwks_uri));
    let payload;
    try {
      ({ payload } = await jwtVerify(tokens.id_token, jwks, {
        issuer: oidc.issuer,
        audience: clientId,
      }));
    } catch (e) {
      throw fail('failed', `id_token check failed: ${e.code || e.name} ${e.message}`, `idtoken_${safe(e.code || e.name)}_${safe(e.claim)}`.replace(/_+$/, ''));
    }
    if (payload.nonce !== cookies.feide_nonce) throw fail('failed', 'Nonce mismatch', 'nonce');
    if (!payload.sub) throw fail('failed', 'id_token missing sub claim', 'no_sub');
    // Claim names only, never values: shows what Feide really sends.
    console.log('Feide id_token claims:', Object.keys(payload).join(', '));

    // The session cookie only ever holds the Feide subject id. The name is
    // kept in the students table and is only shown to the student themselves
    // and to the teacher in /admin.html.
    const feideId = `feide:${payload.sub}`;
    const name = await fetchName(oidc, tokens.access_token, payload);
    try {
      await upsertStudent(feideId, name);
    } catch (e) {
      console.error('Could not save student:', e.message);
    }
    const sessionToken = await createSessionToken(feideId);

    // Only the admin page may be asked for as a place to land after login.
    const landing = cookies.feide_next === '/admin.html' ? '/admin.html' : '/';

    return {
      statusCode: 302,
      multiValueHeaders: {
        'Set-Cookie': [
          ...clearTransientCookies,
          serializeCookie(SESSION_COOKIE, sessionToken, { maxAge: SESSION_TTL_SECONDS }),
          // Needed later as id_token_hint when the student logs out of Feide.
          serializeCookie(ID_TOKEN_COOKIE, tokens.id_token, { maxAge: ID_TOKEN_TTL_SECONDS }),
        ],
      },
      headers: { Location: landing },
    };
  } catch (err) {
    console.error('Feide login failed:', err.message);
    return {
      statusCode: 302,
      multiValueHeaders: { 'Set-Cookie': clearTransientCookies },
      headers: { Location: `/?login_error=${err.loginCode || 'failed'}&why=${err.why || `error_${safe(err.name)}`}` },
    };
  }
};
