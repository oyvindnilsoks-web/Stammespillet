const crypto = require('crypto');
const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const { getStudent } = require('./_lib/students');

exports.handler = withSessionRenewal(async (event) => {
  // The login page only shows the Feide button once Feide is configured.
  const feideEnabled = Boolean(process.env.FEIDE_ISSUER && process.env.FEIDE_CLIENT_ID);
  // The name login can be switched off once Feide works for everyone, and the
  // Norwegian writing mode only exists while there is a DeepL key.
  const flags = {
    feideEnabled,
    nameLoginEnabled: process.env.ALLOW_NAME_LOGIN !== 'false',
    translationEnabled: Boolean((process.env.DEEPL_API_KEY || '').trim()),
  };
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE];
  if (!token) return { statusCode: 200, body: JSON.stringify({ authenticated: false, ...flags }) };

  try {
    const feideId = await verifySessionToken(token);
    // "name:..." ids are the self-chosen login name (nothing sensitive to
    // hide), so show it as-is. A Feide user is shown by their own name, which
    // only they see on their own screen; if we have no name for them, or the
    // lookup fails, it falls back to a short non-reversible tag.
    let displayTag;
    if (feideId.startsWith('name:')) {
      displayTag = feideId.slice('name:'.length);
    } else {
      displayTag = crypto.createHash('sha256').update(feideId).digest('hex').slice(0, 8);
      if (feideId.startsWith('feide:')) {
        try {
          const student = await getStudent(feideId);
          if (student && student.display_name) displayTag = student.display_name;
        } catch (e) {
          console.error('Could not read student name:', e.message);
        }
      }
    }
    return { statusCode: 200, body: JSON.stringify({ authenticated: true, displayTag, ...flags }) };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ authenticated: false, ...flags }) };
  }
});
