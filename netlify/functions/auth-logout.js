const { parseCookies, serializeCookie } = require('./_lib/cookies');
const { discoverOidcConfig } = require('./_lib/oidc');
const { SESSION_COOKIE, ADMIN_COOKIE, ID_TOKEN_COOKIE } = require('./_lib/session');

// Where Feide sends the student after logout. It has to be one of the
// "Redirect URI til etter utlogging" addresses registered in the Feide portal,
// so it is the site root on the same origin as the login callback.
function logoutRedirectUri(event) {
  if (process.env.FEIDE_REDIRECT_URI) {
    try {
      return `${new URL(process.env.FEIDE_REDIRECT_URI).origin}/`;
    } catch {
      // fall through to the host header
    }
  }
  const host = event.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}/`;
}

// Ends our own session first, then, for a Feide login, sends the browser to
// Feide so the Feide single sign-on session ends too. Without that step the
// next student on a shared PC would still be logged in to Feide and could
// log in as the previous student with one click.
exports.handler = async (event) => {
  const cookies = parseCookies(event);
  const gone = { maxAge: 0 };
  const clear = [
    serializeCookie(SESSION_COOKIE, '', gone),
    // The teacher's admin cookie goes too, so logging out really logs out.
    serializeCookie(ADMIN_COOKIE, '', { ...gone, sameSite: 'strict' }),
    serializeCookie(ID_TOKEN_COOKIE, '', gone),
  ];

  let location = '/';
  const idToken = cookies[ID_TOKEN_COOKIE];
  if (idToken) {
    try {
      const oidc = await discoverOidcConfig();
      if (oidc && oidc.end_session_endpoint) {
        const params = new URLSearchParams({
          id_token_hint: idToken,
          post_logout_redirect_uri: logoutRedirectUri(event),
        });
        location = `${oidc.end_session_endpoint}?${params.toString()}`;
      }
    } catch (e) {
      // Logging out locally still worked; the Feide session just stays.
      console.error('Could not build the Feide logout address:', e.message);
    }
  }

  return {
    statusCode: 302,
    multiValueHeaders: { 'Set-Cookie': clear },
    headers: { Location: location },
  };
};
