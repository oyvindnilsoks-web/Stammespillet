import { supabase } from './supabaseClient.js';
import { SUPABASE_URL } from './config.js';

// Generic content loaders - work for any number of rows, nothing about the
// example data is hardcoded here. RLS only returns approved tribes/characters
// (and their media) to the browser; pending student submissions stay hidden.

export async function loadAllContent() {
  const [tribesRes, charactersRes, scenesRes, mediaRes] = await Promise.all([
    supabase.from('tribes').select('*').order('name'),
    supabase.from('characters').select('*').order('name'),
    supabase.from('scenes').select('*'),
    supabase.from('media').select('*').order('sort_order').order('created_at'),
  ]);

  if (tribesRes.error) throw tribesRes.error;
  if (charactersRes.error) throw charactersRes.error;
  if (scenesRes.error) throw scenesRes.error;
  if (mediaRes.error) throw mediaRes.error;

  const tribes = new Map(tribesRes.data.map((t) => [t.id, t]));
  const characters = new Map(charactersRes.data.map((c) => [c.id, c]));
  const scenes = new Map(scenesRes.data.map((s) => [s.id, s]));

  return { tribes, characters, scenes, media: mediaRes.data };
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
