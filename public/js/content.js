import { SUPABASE_URL } from './config.js';

// Generic content loader - works for any number of rows, nothing about the
// example data is hardcoded here. The content comes from /api/content, which
// needs a login and only returns approved villages, villagers and their media.
// The browser never reads these tables directly, so nobody outside the class
// can read what the students wrote.

export async function loadAllContent() {
  const res = await fetch('/api/content', { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'You are logged out. Log in again.' : 'Could not load the game content.');
  }
  const { tribes, characters, scenes, media, mine, mine_characters } = await res.json();
  return {
    tribes: new Map(tribes.map((t) => [t.id, t])),
    characters: new Map(characters.map((c) => [c.id, c])),
    scenes: new Map(scenes.map((s) => [s.id, s])),
    media,
    mine: mine || [],
    mineCharacters: mine_characters || [],
  };
}

// Older content uses paths under /assets/images; images uploaded through the
// admin page are stored as full Supabase Storage URLs.
export function imageUrl(path) {
  if (!path) return null;
  if (/^https:\/\//.test(path)) return path;
  return `/assets/images/${path}`;
}

export function mediaUrl(storagePath) {
  if (!storagePath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
}
