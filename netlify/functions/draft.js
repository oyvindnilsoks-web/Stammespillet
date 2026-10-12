const { parseCookies } = require('./_lib/cookies');
const { verifySessionToken, SESSION_COOKIE, withSessionRenewal } = require('./_lib/session');
const drafts = require('./_lib/drafts');

// Server-side copy of what a student has typed in Contribute but not sent.
// It is what lets the text follow the student to another computer. The
// browser keeps its own copy as well, for when the network is down.

const MAX_BODY_BYTES = 200 * 1024; // 60 answers of 2000 characters fit with room to spare

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function requireUser(event) {
  const token = parseCookies(event)[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

exports.handler = withSessionRenewal(async (event) => {
  const user = await requireUser(event);
  if (!user) return json(401, { error: 'Not logged in' });

  try {
    if (event.httpMethod === 'GET') {
      return json(200, { drafts: await drafts.listDrafts(user) });
    }

    if (event.httpMethod === 'PUT') {
      if ((event.body || '').length > MAX_BODY_BYTES) return json(413, { error: 'Draft is too large' });
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'Invalid JSON' });
      }
      if (!drafts.KINDS.includes(body.kind)) return json(400, { error: 'Unknown form' });
      if (!drafts.isRef(body.ref_id)) return json(400, { error: 'Unknown submission' });
      const content = drafts.cleanDraft(body.kind, body.content);
      if (!content) return json(400, { error: 'Invalid draft' });

      try {
        const updatedAt = await drafts.saveDraft(user, body.kind, body.ref_id, content);
        return json(200, { ok: true, updated_at: updatedAt });
      } catch (e) {
        if (e.code === 'too_many') return json(429, { error: 'Too many unsent drafts. Send or delete some first.' });
        throw e;
      }
    }

    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      if (!drafts.KINDS.includes(q.kind) || !drafts.isRef(q.ref_id)) return json(400, { error: 'Unknown draft' });
      await drafts.deleteDraft(user, q.kind, q.ref_id);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('Draft request failed:', e.message);
    return json(500, { error: 'Could not reach the draft store' });
  }
});
