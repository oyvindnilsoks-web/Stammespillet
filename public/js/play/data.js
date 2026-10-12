// What the game knows about the world, taken from the approved villages and
// villagers the students wrote. Nothing here is drawn; see world.js and village.js.

// Frames of the "heroes" sheet (Kenney Tiny Dungeon, 12 per row) that look like
// people. The player has a figure of their own, so it never matches a villager.
export const HERO_FRAMES = [84, 85, 86, 87, 88, 96, 97, 98, 99, 100];
export const PLAYER_FRAME = 112;

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small random number generator that gives the same numbers for the same
// seed, so a village always looks the same.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function heroFrameFor(id) {
  return HERO_FRAMES[hashString(String(id)) % HERO_FRAMES.length];
}

// Villages that have a place on the map, with that place as fractions 0 to 1.
export function mappedVillages(content) {
  const list = [];
  for (const tribe of content.tribes.values()) {
    const t = tribe.territory || {};
    if (!Number.isFinite(t.map_x) || !Number.isFinite(t.map_y)) continue;
    list.push({ tribe, fx: Math.min(0.98, Math.max(0.02, t.map_x / 100)), fy: Math.min(0.98, Math.max(0.02, t.map_y / 100)) });
  }
  return list.sort((a, b) => a.tribe.name.localeCompare(b.tribe.name));
}

export function villagersOf(content, tribeId) {
  return [...content.characters.values()].filter((c) => c.tribe_id === tribeId).sort((a, b) => a.name.localeCompare(b.name));
}

export function mediaOfTribe(content, tribeId) {
  return (content.media || []).filter((m) => m.tribe_id === tribeId);
}

const asText = (v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || '').trim());

// The things a villager can talk about, built from what the student wrote.
// Each one has a question the player asks and the villager's answer.
export function dialogTopics(villager) {
  const c = villager.charter || {};
  const topics = [];

  const intro = [`Name: ${villager.name}`];
  if (asText(c.age)) intro.push(`Age: ${asText(c.age)}`);
  const job = asText(c.role) || asText(villager.role);
  if (job) intro.push(`Job: ${job}`);
  topics.push({ id: 'intro', question: 'Who are you?', answer: intro.join('\n') });

  const look = asText(c.appearance) || (c.personality ? '' : asText(villager.description));
  if (look) topics.push({ id: 'look', question: 'What do you look like?', answer: look });
  if (asText(c.personality)) topics.push({ id: 'personality', question: 'What are you like?', answer: asText(c.personality) });

  // Older villagers, written before the forms were made shorter.
  if (asText(villager.goal)) topics.push({ id: 'goal', question: 'What do you want?', answer: asText(villager.goal) });
  if (asText(villager.strengths)) topics.push({ id: 'strengths', question: 'What are you good at?', answer: asText(villager.strengths) });
  if (asText(villager.weaknesses)) topics.push({ id: 'weaknesses', question: 'What are you afraid of?', answer: asText(villager.weaknesses) });
  return topics;
}
