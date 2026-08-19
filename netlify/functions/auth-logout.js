const { serializeCookie } = require('./_lib/cookies');
const { SESSION_COOKIE } = require('./_lib/session');

exports.handler = async () => ({
  statusCode: 302,
  headers: {
    Location: '/',
    'Set-Cookie': serializeCookie(SESSION_COOKIE, '', { maxAge: 0 }),
  },
});
