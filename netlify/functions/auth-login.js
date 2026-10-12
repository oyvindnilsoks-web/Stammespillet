const { serializeCookie } = require('./_lib/cookies');
const { discoverOidcConfig, randomToken, pkcePair } = require('./_lib/oidc');

function redirectUri(event) {
  if (process.env.FEIDE_REDIRECT_URI) return process.env.FEIDE_REDIRECT_URI;
  const host = event.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/api/auth/callback`;
}

exports.handler = async (event) => {
  const oidc = await discoverOidcConfig();

  // Feide isn't configured yet (kommune hasn't handed over client credentials) -
  // send the student to the local dev-login page instead of a dead end.
  if (!oidc || !process.env.FEIDE_CLIENT_ID) {
    return { statusCode: 302, headers: { Location: '/dev-login.html?reason=not_configured' } };
  }

  const state = randomToken(16);
  const nonce = randomToken(16);
  const { verifier, challenge } = pkcePair();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: (process.env.FEIDE_CLIENT_ID || '').trim(),
    redirect_uri: redirectUri(event),
    // "profile" is what gives us the student's name from the userinfo endpoint.
    scope: 'openid profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const cookieOpts = { maxAge: 600 };
  const cookies = [
    serializeCookie('feide_state', state, cookieOpts),
    serializeCookie('feide_nonce', nonce, cookieOpts),
    serializeCookie('feide_verifier', verifier, cookieOpts),
  ];
  // The admin page asks to land back on itself after login. Nothing else is
  // accepted, so this can never become an open redirect.
  if ((event.queryStringParameters || {}).next === '/admin.html') {
    cookies.push(serializeCookie('feide_next', '/admin.html', cookieOpts));
  }

  return {
    statusCode: 302,
    multiValueHeaders: { 'Set-Cookie': cookies },
    headers: { Location: `${oidc.authorization_endpoint}?${params.toString()}` },
  };
};
