import { supabase } from './supabaseClient.js';

// Generic content loaders - work for any number of rows, nothing about the
// example data is hardcoded here.

export async function loadAllContent() {
  const [tribesRes, charactersRes, scenesRes] = await Promise.all([
    supabase.from('tribes').select('*').order('name'),
    supabase.from('characters').select('*').order('name'),
    supabase.from('scenes').select('*'),
  ]);

  if (tribesRes.error) throw tribesRes.error;
  if (charactersRes.error) throw charactersRes.error;
  if (scenesRes.error) throw scenesRes.error;

  const tribes = new Map(tribesRes.data.map((t) => [t.id, t]));
  const characters = new Map(charactersRes.data.map((c) => [c.id, c]));
  const scenes = new Map(scenesRes.data.map((s) => [s.id, s]));

  return { tribes, characters, scenes };
}

export function imageUrl(path) {
  if (!path) return null;
  return `/assets/images/${path}`;
}
