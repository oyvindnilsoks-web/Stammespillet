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
    client_id: process.env.FEIDE_CLIENT_ID,
    redirect_uri: redirectUri(event),
    scope: 'openid',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const cookieOpts = { maxAge: 600 };
  return {
    statusCode: 302,
    multiValueHeaders: {
      'Set-Cookie': [
        serializeCookie('feide_state', state, cookieOpts),
        serializeCookie('feide_nonce', nonce, cookieOpts),
        serializeCookie('feide_verifier', verifier, cookieOpts),
      ],
    },
    headers: { Location: `${oidc.authorization_endpoint}?${params.toString()}` },
  };
};
