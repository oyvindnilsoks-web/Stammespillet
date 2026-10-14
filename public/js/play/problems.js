// A real problem for every villager, made from the villager and the world: either
// "go and talk to a particular villager in another village" or "find something out on
// the map". The words are written here (no language model), and filled in with the
// names of the villager, the village and the other villager. A villager gets the same
// problem every time, for every player. A problem the student wrote in the form
// (quest_problem ...) is used instead, see questOf in data.js.
//
// Texts: {other} {otherVillage} {village} {roleBit} are filled in. {oThem} and {oTheir} are him/her/it and his/her/its for the other villager, {aThem} the same for the villager who asks. They follow the pronoun (he, she or it) the students chose; without one it is he.

const hash = (text) => {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const pick = (list, seed) => list[hash(seed) % list.length];

// Problems that can only be solved by talking to a villager in another village.
export const TALK = [
  {
    problem: 'My work{roleBit} has gone wrong and I do not know why. {other} in {otherVillage} knows more about this than anyone. Could you go and ask {oThem} what I should do?',
    found: '{other} thinks for a moment. "Tell {aThem} to start again from the beginning, and to ask for help earlier next time. Hard things are easier with a friend."',
    thanks: 'So that is the answer! Start again, and ask for help sooner. Thank you, you have saved my day.',
  },
  {
    problem: 'I have written a letter, but I am too shy to send it. Please tell {other} in {otherVillage} that I am thinking of {oThem}.',
    found: '{other} smiles. "Tell {aThem} I think of {aThem} too, and that I will write back soon."',
    thanks: '{other} thinks of me too! That is the best news I have had all week. Thank you.',
  },
  {
    problem: 'There is a rumour in {village} that {other} in {otherVillage} has found something strange. Could you go and ask {oThem} what it is?',
    found: '{other} whispers: "It is only a shiny stone, but it hums at night. Tell {aThem} to come and see it."',
    thanks: 'A humming stone! I must go and see it myself. Thank you for asking.',
  },
  {
    problem: 'I have forgotten an old song, and {other} in {otherVillage} knows it. Please go and ask {oThem} how it begins.',
    found: '{other} hums the first line: "Over the hills and over the sea, the wind brings word to you from me." "Tell {aThem} the rest will come back."',
    thanks: 'Over the hills and over the sea... yes! Now I remember. Thank you.',
  },
  {
    problem: 'We have more food than we can eat in {village}, and nobody to share it with. {other} in {otherVillage} may need some. Please go and ask {oThem}.',
    found: '{other} laughs. "We have an empty storeroom! Tell {aThem} to bring it any time."',
    thanks: 'A storeroom that needs filling, how wonderful! Thank you for carrying the message.',
  },
  {
    problem: 'I said something unkind to {other} in {otherVillage}, and I am too ashamed to say sorry myself. Will you go and tell {oThem} for me?',
    found: '{other} shakes {oTheir} head and smiles. "There is nothing to forgive. Tell {aThem} to come and have tea."',
    thanks: '{other} forgives me! I will go and have tea with {oThem}. You are a good friend.',
  },
  {
    problem: 'I am not sure my plan for the autumn festival is any good. {other} in {otherVillage} has organised many. Please go and ask for advice.',
    found: '{other} thinks. "Light, food and music. People forget everything else. Tell {aThem} to start with those three."',
    thanks: 'Light, food and music. How simple! Thank you so much.',
  },
  {
    problem: 'I would like a new friend. They say {other} in {otherVillage} is kind and curious. Could you go and say hello from me?',
    found: '{other} lights up. "Hello to you too! Tell {aThem} I would love to meet."',
    thanks: '{other} wants to meet me! You have made my day, thank you.',
  },
];

// Problems that are solved by finding something out on the map. frame is a tile of
// the town sheet used as a small picture of the thing.
export const FIND = [
  {
    item: 'a lost ring',
    problem: 'I have lost my grandmother\'s ring somewhere out on the map. I have looked everywhere in {village}, so it must be out there. Could you find it for me?',
    found: 'You find a small ring in the grass. It glitters in the sun.',
    thanks: 'My grandmother\'s ring! Thank you, thank you!',
  },
  {
    item: 'a basket of herbs',
    problem: 'I was picking herbs for a medicine when I was called home in a hurry, and I left my basket out on the map. Could you bring it back?',
    found: 'You find a basket full of fresh herbs. They smell lovely.',
    thanks: 'My herbs! Now I can make the medicine in time.',
  },
  {
    item: 'a sealed letter',
    problem: 'The wind took an important letter out of my hand and blew it far away over the land. Please find it before it rains.',
    found: 'You find a sealed letter, a little dirty but still unopened.',
    thanks: 'The letter! Still sealed! You have no idea how important this is. Thank you.',
  },
  {
    item: 'a golden key',
    problem: 'I dropped the key to my workshop on the way home from {village}, and I cannot work without it. It is out on the map somewhere.',
    found: 'You find a golden key half hidden in the grass.',
    thanks: 'My key! Now I can open the workshop again. Thank you.',
  },
  {
    item: 'a traveller\'s bag',
    problem: 'A traveller asked me to look after their bag, and I carried it out on the map and lost it. They will be so angry. Please find it!',
    found: 'You find a heavy leather bag. It looks like it has travelled a long way.',
    thanks: 'The bag! I can give it back before they notice. You are a hero.',
  },
  {
    item: 'a wooden toy',
    problem: 'My little brother lost his favourite wooden toy while we were out on the map, and he has not stopped crying. Could you find it?',
    found: 'You find a little wooden horse lying on its side.',
    thanks: 'His horse! He will be so happy. Thank you.',
  },
  {
    item: 'a lantern',
    problem: 'My lantern fell off the cart on the way home to {village}. The nights are getting dark and I need it. It must be out on the map somewhere.',
    found: 'You find a lantern. The glass is cracked, but it still works.',
    thanks: 'My lantern! The nights will be bright again. Thank you.',
  },
  {
    item: 'a rolled-up map',
    problem: 'I drew a map of a secret place, and now the map has gone. I think I dropped it out on the map. Please find it and tell nobody!',
    found: 'You find a rolled-up scroll with a strange drawing on it. You do not tell anybody.',
    thanks: 'My map! And you did not look, did you? Thank you.',
  },
];

// him/her/it and his/her/its for a villager: the pronoun the students chose, he if none.
const PRONOUNS = { he: { them: 'him', their: 'his' }, she: { them: 'her', their: 'her' }, it: { them: 'it', their: 'its' } };
const pronounsOf = (villager) => PRONOUNS[(villager.charter || {}).pronoun] || PRONOUNS.he;

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, key) => (vars[key] === undefined ? '' : vars[key]));
const asText = (v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || '').trim());

// The problem of a villager, or null if the world has nothing to base one on.
export function generatedQuest(content, villager) {
  const tribe = content.tribes.get(villager.tribe_id);
  if (!tribe) return null;
  const role = asText((villager.charter || {}).role) || asText(villager.role);
  const own = new Set(content.mineCharacters || []);
  // Someone the player can talk to in another village (not the player's own villagers).
  const others = [...content.characters.values()].filter((c) => c.id !== villager.id && c.tribe_id !== villager.tribe_id && !own.has(c.id) && content.tribes.has(c.tribe_id));

  if (others.length && hash(villager.id + ':kind') % 2 === 0) {
    // The same other villager every time: the one that scores lowest for this villager.
    const target = others.map((c) => ({ c, score: hash(villager.id + '>' + c.id) })).sort((a, b) => a.score - b.score)[0].c;
    const otherVillage = content.tribes.get(target.tribe_id).name;
    const t = pick(TALK, villager.id + ':talk');
    const o = pronounsOf(target);
    const a = pronounsOf(villager);
    const vars = { village: tribe.name, other: target.name, otherVillage, roleBit: role ? ` as ${role}` : '', oThem: o.them, oTheir: o.their, aThem: a.them };
    return {
      generated: true,
      kind: 'talk',
      problem: fill(t.problem, vars),
      hint: `${target.name} lives in ${otherVillage}.`,
      found: fill(t.found, vars),
      thanks: fill(t.thanks, vars),
      targets: [],
      target: { villagerId: target.id, villagerName: target.name, villageId: target.tribe_id, villageName: otherVillage },
    };
  }

  const f = pick(FIND, villager.id + ':find');
  const vars = { village: tribe.name };
  return {
    generated: true,
    kind: 'find',
    problem: fill(f.problem, vars),
    hint: 'It is out on the map, not in a village.',
    found: f.found,
    thanks: f.thanks,
    targets: [],
    item: { name: f.item },
  };
}
