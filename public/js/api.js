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
