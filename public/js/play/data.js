// What the game knows about the world, taken from the approved villages and
// villagers the students wrote. Nothing here is drawn; see world.js and village.js.

import { FIGURE_COUNT } from './figures.js';

// The figure the player walks around as: frame 112 of the "heroes" sheet. The
// villagers' 60 figures are in figures.js, and none of them looks exactly like it.
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

// The figure of a villager: the one the student chose, or one picked from the id.
export function figureFor(villager) {
  const chosen = villager.sprite === null || villager.sprite === undefined ? NaN : Number(villager.sprite);
  return Number.isInteger(chosen) && chosen >= 0 && chosen < FIGURE_COUNT ? chosen : heroFrameFor(villager.id);
}

// The student's drawing of a villager, if they added one.
export function portraitOf(content, villagerId) {
  return (content.media || []).find((m) => m.character_id === villagerId && m.storage_path && (m.kind === 'drawing' || m.kind === 'image')) || null;
}

// The shield of a village, if the teacher added one.
export function shieldOf(content, tribeId) {
  return (content.media || []).find((m) => m.tribe_id === tribeId && m.kind === 'shield' && m.storage_path) || null;
}

export function heroFrameFor(id) {
  return hashString(String(id)) % FIGURE_COUNT;
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

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Does the text a village wrote under "enemies" name this village?
function names(list, tribe) {
  const target = norm(tribe.name);
  if (!target) return false;
  // The whole name as words, so "Fred" does not match "Fredby".
  const words = (s) => ' ' + s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
  return words(norm(list)).includes(words(target));
}

// The village the player belongs to is at war with this one, either way round.
// A student with no village of their own is at war with nobody.
export function isEnemy(content, tribe) {
  for (const id of content.mine || []) {
    if (id === tribe.id) return false;
    const mine = content.tribes.get(id);
    if (!mine) continue;
    if (names((mine.charter || {}).enemies, tribe) || names((tribe.charter || {}).enemies, mine)) return true;
  }
  return false;
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
