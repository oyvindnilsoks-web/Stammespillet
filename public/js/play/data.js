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
export function listsVillage(list, tribe) {
  return names(list, tribe);
}

function names(list, tribe) {
  const target = norm(tribe.name);
  if (!target) return false;
  // The whole name as words, so "Fred" does not match "Fredby".
  const words = (s) => ' ' + s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
  return words(norm(list)).includes(words(target));
}

// Where the other villages lie, nearest first: for "who are your neighbours?".
function neighboursOf(content, tribe, count = 2) {
  const t = tribe.territory || {};
  if (!Number.isFinite(t.map_x) || !Number.isFinite(t.map_y)) return [];
  return [...content.tribes.values()]
    .filter((o) => o.id !== tribe.id && Number.isFinite((o.territory || {}).map_x) && Number.isFinite((o.territory || {}).map_y))
    .map((o) => ({ tribe: o, d: Math.hypot(o.territory.map_x - t.map_x, o.territory.map_y - t.map_y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((x) => x.tribe);
}

const GROUND = {
  mountain: 'The ground here is stony and steep, and snow stays on the peaks.',
  sea: 'We live by the sea. You can hear the waves all night.',
  forest: 'We live deep in the forest. It is dark between the trees, even in the day.',
  desert: 'It is dry here, with sand and hot wind.',
  land: 'We live on open, good land.',
};

const list = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// Extra things a villager can talk about, made from what the students wrote
// about the villager and the village (no one is making things up): where they
// live, what the village is known for, what they do and like, the neighbours.
// Only what there is something to say about is included, at most five.
export function generatedTopics(content, villager, tribe, biome = 'land') {
  const c = villager.charter || {};
  const v = tribe.charter || {};
  const shadow = tribe.charter_type === 'shadow';
  const topics = [];

  const home = [`I live in ${tribe.name}.`, shadow ? 'It is a cold and dark place. We do not talk much about it.' : GROUND[biome] || GROUND.land];
  if (asText(v.place)) home.push(asText(v.place));
  topics.push({ id: 'gen_home', question: 'Where do you live?', answer: home.join(' ') });

  const known = [asText(v.main_resource) && `Our village is known for ${asText(v.main_resource)}.`, asText(v.best_at) && `We are good at: ${asText(v.best_at)}`].filter(Boolean);
  if (known.length) topics.push({ id: 'gen_village', question: `What is ${tribe.name} known for?`, answer: known.join(' ') });

  const job = asText(c.role) || asText(villager.role);
  const likes = asText(c.interests);
  if (job || likes) {
    const day = [job && `I work as: ${job}.`, likes && `In my free time I like ${likes}.`].filter(Boolean);
    topics.push({ id: 'gen_day', question: 'What do you do all day?', answer: day.join(' ') });
  }

  const near = neighboursOf(content, tribe);
  if (near.length) {
    const lines = [`Our closest neighbours are ${list(near.map((n) => n.name))}.`];
    const foes = near.filter((n) => listsVillage(v.enemies, n) || listsVillage((n.charter || {}).enemies, tribe));
    if (foes.length) lines.push(`We do not trust ${list(foes.map((n) => n.name))}.`);
    topics.push({ id: 'gen_neighbours', question: 'Who are your neighbours?', answer: lines.join(' ') });
  }

  if (shadow && asText(v.ambition)) topics.push({ id: 'gen_ambition', question: 'What does your village want?', answer: asText(v.ambition) });
  else if (asText(v.customs_law)) topics.push({ id: 'gen_law', question: 'Is there a rule I should know?', answer: asText(v.customs_law) });

  return topics.slice(0, 5);
}

// A problem a villager has, if the student wrote a whole one: the problem,
// where it can be solved, what is found there and the thanks. The answer can wait
// in several villages, but never in the villager's own.
export function questOf(content, villager) {
  const c = villager.charter || {};
  const problem = asText(c.quest_problem);
  const found = asText(c.quest_found);
  const targetText = asText(c.quest_target);
  if (!problem || !found || !targetText) return null;
  const targets = [...content.tribes.values()].filter((t) => t.id !== villager.tribe_id && listsVillage(targetText, t));
  if (!targets.length) return null;
  return { problem, hint: asText(c.quest_hint), found, thanks: asText(c.quest_thanks) || 'Thank you!', targets: targets.map((t) => t.id) };
}

// The problems of the characters a player can meet (not the player's own).
export function allQuests(content) {
  const own = new Set(content.mineCharacters || []);
  const list = [];
  for (const villager of content.characters.values()) {
    if (own.has(villager.id)) continue;
    const quest = questOf(content, villager);
    if (quest) list.push({ villager, quest, tribe: content.tribes.get(villager.tribe_id) });
  }
  return list;
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

// The villagers of a village that the player can talk to. The student's own
// villagers are not among them: the student is one of them, playing.
export function villagersOf(content, tribeId) {
  const own = new Set(content.mineCharacters || []);
  return [...content.characters.values()].filter((c) => c.tribe_id === tribeId && !own.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
}

// The student's own approved villagers, the ones they can play as.
export function ownVillagers(content) {
  const own = new Set(content.mineCharacters || []);
  return [...content.characters.values()].filter((c) => own.has(c.id)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

// What the player looks like: the figure of the student's villager (the one
// chosen, or the first), or the plain hero when they have none yet.
export function playerLook(content, chosenId) {
  const own = ownVillagers(content);
  if (!own.length) return { key: 'hero', texture: 'heroes', frame: PLAYER_FRAME, villager: null };
  const villager = own.find((v) => v.id === chosenId) || own[0];
  return { key: villager.id, texture: 'figures', frame: figureFor(villager), villager };
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

  // Conversations the student wrote themselves: at most six.
  for (const letter of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const question = asText(c[`talk_${letter}_q`]);
    const answer = asText(c[`talk_${letter}_a`]);
    if (question && answer) topics.push({ id: `talk_${letter}`, question, answer });
  }

  // Older villagers, written before the forms were made shorter.
  if (asText(villager.goal)) topics.push({ id: 'goal', question: 'What do you want?', answer: asText(villager.goal) });
  if (asText(villager.strengths)) topics.push({ id: 'strengths', question: 'What are you good at?', answer: asText(villager.strengths) });
  if (asText(villager.weaknesses)) topics.push({ id: 'weaknesses', question: 'What are you afraid of?', answer: asText(villager.weaknesses) });
  return topics;
}
