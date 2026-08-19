const cookie = require('cookie');

function parseCookies(event) {
  const header = event.headers.cookie || event.headers.Cookie || '';
  return cookie.parse(header);
}

function serializeCookie(name, value, opts = {}) {
  return cookie.serialize(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...opts,
  });
}

module.exports = { parseCookies, serializeCookie };
