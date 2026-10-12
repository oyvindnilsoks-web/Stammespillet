// Wrappers around the Netlify Functions that handle auth + progress.
// The session lives in an httpOnly cookie, so these calls never see the raw
// Feide id - only a boolean "authenticated" flag and a non-identifying tag.

export async function getSession() {
  const res = await fetch('/api/session', { credentials: 'same-origin' });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function devLogin(testId) {
  const res = await fetch('/api/auth/dev-login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId }),
  });
  if (!res.ok) throw new Error('Dev login failed (is ENABLE_DEV_LOGIN=true set?)');
  return res.json();
}

// The main login while Feide is not yet connected: a student just types a
// name. See netlify/functions/auth-name-login.js for how the session is
// created from it.
export async function nameLogin(name) {
  const res = await fetch('/api/auth/name-login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Login failed - please try again.');
  return res.json();
}

export function loginUrl() {
  return '/api/auth/login';
}

export function logoutUrl() {
  return '/api/auth/logout';
}

export async function loadProgress() {
  const res = await fetch('/api/progress', { credentials: 'same-origin' });
  if (res.status === 401) return { unauthenticated: true };
  if (!res.ok) throw new Error('Failed to load progress');
  const { progress } = await res.json();
  return { progress };
}

export async function saveProgress(state) {
  const res = await fetch('/api/progress', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error('Failed to save progress');
  return res.json();
}

// Student contributions (village + villager forms). The server only returns
// the logged-in student's own submissions, plus the village list for the
// villager form's drop-down.
export async function loadSubmissions() {
  const res = await fetch('/api/submit', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not load your submissions.');
  return res.json();
}

export async function sendSubmission(payload) {
  const res = await fetch('/api/submit', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error('You are logged out. Log in again - your text is saved.');
  }
  if (!res.ok) throw new Error(data.error || 'Could not send - please try again.');
  return data;
}

// Where the student stands (a heartbeat while inside a village; null when they
// leave), the gathering of the villagers of a village, and starting the council.
export async function presenceBeat(tribeId) {
  await fetch('/api/presence', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tribe_id: tribeId }),
    keepalive: true,
  });
}

// The student stands on the world map here (fx and fy are fractions of the map, look
// is the figure or null). The answer: the other students on the map, a challenge
// waiting for this student, and how many battle results have not been shown.
export async function presenceWorld(fx, fy, look) {
  const res = await fetch('/api/presence', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world: true, fx, fy, look }),
  });
  if (!res.ok) throw new Error('Could not see the others.');
  return res.json();
}

export async function presenceState(tribeId) {
  const res = await fetch(`/api/presence?tribe_id=${encodeURIComponent(tribeId)}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not check who is here.');
  return res.json();
}

export async function startCouncilSession(tribeId) {
  const res = await fetch('/api/presence', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start-council', tribe_id: tribeId }),
  });
  return res.json().catch(() => ({ ok: false }));
}

// Where the poison is, and cleaning around a village after a solved problem.
export async function loadWorld() {
  const res = await fetch('/api/world', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not load the world.');
  return res.json();
}

export async function cleanseWorld(tribeId) {
  const res = await fetch('/api/world', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cleanse', tribe_id: tribeId }),
  });
  if (!res.ok) throw new Error('Could not clean.');
  return res.json();
}

// Artifacts: what the student has sent, the backpack, and sending a scan.
export async function artifactList() {
  const res = await fetch('/api/artifact', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not load the artifacts.');
  return res.json();
}

export async function artifactAdd(payload) {
  const res = await fetch('/api/artifact', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send.');
  return data;
}

export async function artifactDelete(id) {
  const res = await fetch('/api/artifact', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (!res.ok) throw new Error('Could not take it away.');
  return res.json();
}

// Glossary battles between students: the window's data, and the moves.
export async function battleList() {
  const res = await fetch('/api/battle', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not load the battles.');
  return res.json();
}

export async function battleDo(body) {
  const res = await fetch('/api/battle', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.error) throw new Error('Something went wrong.');
  return data;
}

// The tasks that clean the poison: a new quiz, and handing in the answers.
export async function startTask() {
  const res = await fetch('/api/world', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'task-start' }),
  });
  if (!res.ok) throw new Error('Could not start the tasks.');
  return res.json();
}

export async function submitTask(token, answers, fx, fy) {
  const res = await fetch('/api/world', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'task-submit', token, answers, fx, fy }),
  });
  if (!res.ok) throw new Error('Could not check the answers.');
  return res.json();
}

// The council of the villages the student lives in, and a way to save one.
export async function loadCouncils() {
  const res = await fetch('/api/council', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Could not load the councils.');
  return res.json();
}

export async function saveCouncil(payload) {
  const res = await fetch('/api/council', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('You are logged out. Log in again.');
  if (!res.ok) {
    const err = new Error(data.error === 'translation_unavailable' ? 'The translation did not work.' : data.error || 'Could not save.');
    err.code = data.error;
    throw err;
  }
  return data;
}

// Join a village a group member started, with its group code. Resolves to
// { id, name } of the village.
export async function joinVillage(code) {
  const res = await fetch('/api/submit', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'join', code }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('You are logged out. Log in again - your text is saved.');
  if (!res.ok) throw new Error(data.error || 'Could not join - please try again.');
  return data;
}

// Pictures for a village (landmarks and other things). The picture is sent
// as base64 inside the JSON; the page shrinks it first, so it is small.
async function villageAction(body) {
  const res = await fetch('/api/submit', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('You are logged out. Log in again - your text is saved.');
  if (!res.ok) throw new Error(data.error || 'Something went wrong - please try again.');
  return data;
}

export function addVillageImage({ tribe_id, caption, mime, data }) {
  return villageAction({ action: 'add-image', tribe_id, caption, mime, data });
}

// The drawing of a villager: one picture, a new one replaces the old.
export function addVillagerImage({ character_id, mime, data }) {
  return villageAction({ action: 'add-image', character_id, mime, data });
}

export function deleteVillageImage(id) {
  return villageAction({ action: 'delete-image', id });
}

// Unsent Contribute text kept on the server, so a student can continue on
// another computer. Failures carry a `status` (0 = no network) so the page can
// tell "logged out" from "offline" from "rejected".
export async function loadDrafts() {
  const res = await fetch('/api/draft', { credentials: 'same-origin' });
  if (!res.ok) {
    const err = new Error('Could not load saved drafts.');
    err.status = res.status;
    throw err;
  }
  return (await res.json()).drafts || [];
}

// keepalive lets the request finish while the page is closing; browsers only
// allow it for bodies under 64 KB, so larger drafts skip it and stay in the
// browser copy until the next visit.
export async function putDraft(kind, refId, content, { keepalive = false } = {}) {
  const body = JSON.stringify({ kind, ref_id: refId, content });
  let res;
  try {
    res = await fetch('/api/draft', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60000,
    });
  } catch {
    const err = new Error('No connection');
    err.status = 0;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Could not save online.');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Best effort: a draft that is not deleted only comes back as old text.
export async function removeDraft(kind, refId) {
  try {
    const res = await fetch(`/api/draft?kind=${encodeURIComponent(kind)}&ref_id=${encodeURIComponent(refId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    return res.ok;
  } catch {
    return false;
  }
}
