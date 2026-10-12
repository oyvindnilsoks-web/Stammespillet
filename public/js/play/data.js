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
    const foes = near.filter((n) => atWar(content, tribe, n));
    if (foes.length) lines.push(`We are at war with ${list(foes.map((n) => n.name))}.`);
    topics.push({ id: 'gen_neighbours', question: 'Who are your neighbours?', answer: lines.join(' ') });
  }

  // What the council has decided: who rules, which god, who the friends and enemies are.
  const council = councilOf(content, tribe.id);
  if (council) {
    const ally = (council.allies || []).map((id) => content.tribes.get(id)?.name).filter(Boolean);
    if (asText(council.government)) topics.push({ id: 'gen_rule', question: 'Who rules here?', answer: asText(council.government) });
    if (asText(council.god)) topics.push({ id: 'gen_god', question: 'Which god do you believe in?', answer: asText(council.god) });
    if (ally.length) topics.push({ id: 'gen_allies', question: 'Who are your friends?', answer: `We are allied with ${list(ally)}.` });
  }

  if (shadow && asText(v.ambition)) topics.push({ id: 'gen_ambition', question: 'What does your village want?', answer: asText(v.ambition) });
  else if (asText(v.customs_law)) topics.push({ id: 'gen_law', question: 'Is there a rule I should know?', answer: asText(v.customs_law) });

  return topics.slice(0, 8);
}

// A problem a villager has, if the student wrote a whole one: the problem,
// where it can be solved, what is found there and the thanks. The answer can wait
// in several villages, but never in the villager's own.
export function questOf(content, villager) {
  const c = villager.charter || {};
  const problem = asText(c.quest_problem);
  const found = asText(c.quest_found);
  const targetText = asText(c.quest_target);
  if (problem && found && targetText) {
    const targets = [...content.tribes.values()].filter((t) => t.id !== villager.tribe_id && listsVillage(targetText, t));
    if (targets.length) return { problem, hint: asText(c.quest_hint), found, thanks: asText(c.quest_thanks) || 'Thank you!', targets: targets.map((t) => t.id) };
  }
  return placeholderQuest(content, villager);
}

// A stand-in problem for a villager whose student has not written one: the answer
// is in the nearest other village. It shows how problems work, and is replaced by
// the student's own problem when there is one.
function placeholderQuest(content, villager) {
  const tribe = content.tribes.get(villager.tribe_id);
  const near = tribe && neighboursOf(content, tribe, 1)[0];
  if (!near) return null;
  return {
    placeholder: true,
    problem: 'I have lost something that matters a lot to me, and I cannot go looking for it myself. Please search the other villages and ask around.',
    hint: 'Start with the villages closest to ours.',
    found: 'You find a note: "This problem is a placeholder. Soon the students will write real problems, and the real answers will be here."',
    thanks: 'Thank you for looking! (This is a placeholder: the students will write real problems soon.)',
    targets: [near.id],
  };
}

// News for the player's villages: another village has made them an ally or an enemy.
export function noticesFor(content) {
  const mine = content.mine || [];
  const out = [];
  for (const c of (content.councils ? [...content.councils.values()] : [])) {
    if (mine.includes(c.tribe_id)) continue;
    const from = content.tribes.get(c.tribe_id);
    for (const id of mine) {
      const to = content.tribes.get(id);
      if (!from || !to) continue;
      if ((c.allies || []).includes(id)) out.push({ key: `ally:${c.tribe_id}:${id}`, text: `${from.name} has made ${to.name} an ally.` });
      if ((c.enemies || []).includes(id)) out.push({ key: `enemy:${c.tribe_id}:${id}`, text: `${from.name} has declared ${to.name} an enemy. You cannot visit each other.` });
    }
  }
  return out;
}

// ---- the buildings of a village follow what the students wrote ----

const letters = (words) => new RegExp(`(?<![\\p{L}])(?:${words.join('|')})(?![\\p{L}])`, 'u');
const ROOF_COLOURS = [
  [letters(['blue', 'blå', 'blått', 'blåe']), 0x5b8fd6],
  [letters(['green', 'grønn', 'grønt', 'grønne']), 0x5fae5f],
  [letters(['yellow', 'gul', 'gult', 'gule', 'golden', 'gylden', 'gull']), 0xe8c64a],
  [letters(['white', 'hvit', 'hvitt', 'hvite']), 0xf2f2f2],
  [letters(['black', 'svart', 'svarte', 'sort']), 0x4a4a52],
  [letters(['purple', 'lilla', 'violet']), 0xa56fc8],
  [letters(['pink', 'rosa']), 0xe99ac0],
  [letters(['orange', 'oransje']), 0xf0954a],
  [letters(['straw', 'thatch', 'thatched', 'halm', 'stråtak', 'torv', 'torvtak']), 0xd8b45a],
];
const RED = letters(['red', 'rød', 'rødt', 'røde']);
const GREY = letters(['grey', 'gray', 'grå', 'grått', 'slate', 'skifer']);
const ROOF_SENTENCE = letters(['roof', 'roofs', 'tak', 'taket', 'takene', 'house', 'houses', 'huset', 'hus', 'husene', 'cottage', 'cottages', 'hytte', 'hytter']);
const STONE = letters(['stone', 'stones', 'stein', 'steinhus', 'rock', 'brick', 'bricks', 'murstein', 'mur', 'marble', 'marmor']);
const WHITEWASH = letters(['whitewashed', 'hvitkalket', 'hvite hus', 'white houses', 'white walls', 'hvite vegger']);
const SMALL = letters(['small', 'tiny', 'little', 'hamlet', 'few', 'liten', 'lite', 'små', 'bitteliten']);
const LARGE = letters(['big', 'large', 'huge', 'city', 'town', 'many', 'metropolis', 'stor', 'store', 'storby', 'mange']);
const LANDMARKS = [
  ['lighthouse', letters(['lighthouse', 'fyrtårn', 'fyrlykt'])],
  ['windmill', letters(['windmill', 'mill', 'mølle', 'vindmølle'])],
  ['temple', letters(['temple', 'tempel', 'church', 'kirke', 'cathedral', 'katedral', 'shrine', 'helligdom', 'chapel', 'kapell'])],
  ['fountain', letters(['fountain', 'fontene', 'springvann'])],
  ['well', new RegExp('(?<![\\p{L}])(?:(?:a|the|old|water|stone|village) well|brønn|brønnen)(?![\\p{L}])', 'u')],
  ['tower', letters(['tower', 'towers', 'tårn', 'tårnet', 'castle', 'slott', 'borg', 'fortress', 'festning'])],
];

// What the village text says about its houses and known buildings: the colour of
// the roofs, stone or wood, how big the village is, and up to two landmarks. Reads
// the English text and the Norwegian original. Nothing found means the usual look.
export function buildingLook(tribe) {
  const c = tribe.charter || {};
  const o = tribe.charter_original || {};
  const text = [c.landmarks, o.landmarks, c.clothing_symbol, o.clothing_symbol, c.place, o.place]
    .filter((x) => typeof x === 'string')
    .join('. ')
    .toLowerCase();
  const sentences = text.split(/[.!?\n]+/);
  const roofText = sentences.filter((s) => ROOF_SENTENCE.test(s)).join(' ');

  let roof = null;
  const colour = ROOF_COLOURS.find(([re]) => re.test(roofText));
  if (colour) roof = { tile: 'grey', tint: colour[1] };
  else if (RED.test(roofText)) roof = { tile: 'red', tint: null };
  else if (GREY.test(roofText)) roof = { tile: 'grey', tint: null };

  const wallTint = WHITEWASH.test(text) ? 0xf4f0e8 : STONE.test(text) ? 0xa7abb8 : null;
  const houses = SMALL.test(text) && !LARGE.test(text) ? 5 : LARGE.test(text) && !SMALL.test(text) ? 8 : 7;
  const landmarks = LANDMARKS.filter(([, re]) => re.test(text)).map(([kind]) => kind).slice(0, 2);
  return { roof, wallTint, houses, landmarks };
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
    if (atWar(content, mine, tribe)) return true;
  }
  return false;
}

// The council of a village: how it is ruled, its god, its laws, its allies and enemies.
export function councilOf(content, tribeId) {
  return (content.councils && content.councils.get(tribeId)) || null;
}

// Two villages are at war when either council names the other as an enemy.
// (Older villages wrote their enemies as text in the form: that still counts.)
export function atWar(content, a, b) {
  const enemies = (tribe) => (councilOf(content, tribe.id) || {}).enemies || [];
  return enemies(a).includes(b.id) || enemies(b).includes(a.id) || names((a.charter || {}).enemies, b) || names((b.charter || {}).enemies, a);
}

// What the council says, with the villages named, for the sign in the village.
export function councilView(content, tribeId) {
  const c = councilOf(content, tribeId);
  if (!c) return null;
  const named = (ids) => (ids || []).map((id) => content.tribes.get(id)?.name).filter(Boolean);
  const view = { government: c.government, god: c.god, laws: c.laws, allies: named(c.allies), enemies: named(c.enemies) };
  return view.government || view.god || view.laws || view.allies.length || view.enemies.length ? view : null;
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
