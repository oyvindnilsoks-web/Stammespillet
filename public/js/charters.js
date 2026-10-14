// Field definitions for the three forms (Village / Shadow / Villager),
// shared by the student Contribute page and the admin page. They are short on
// purpose: a 12-year-old should be able to fill one in during a lesson.
//
// Field keys are stored in the `charter` jsonb column, so never rename a key
// once data exists. Keys that are no longer in a form are not lost: the admin
// page lists them under "Other answers".

const VILLAGE = [
  {
    num: 'I',
    title: 'Your Village',
    titleNo: 'Landsbyen deres',
    lede: 'Give your village a name and tell us who made it.',
    ledeNo: 'Gi landsbyen et navn og skriv hvem som har laget den.',
    prompts: [],
    promptsNo: [],
    fields: [
      { key: 'name', label: 'Village name', labelNo: 'Landsbyens navn', type: 'text', required: true },
      { key: 'group_members', label: 'Group members', labelNo: 'Hvem er med i gruppa?', type: 'text' },
    ],
  },
  {
    num: 'II',
    title: 'Where Is It?',
    titleNo: 'Hvor ligger den?',
    prompts: [
      'What does the land around the village look like: mountains, sea, forest, fields?',
      'What is the first thing a visitor notices?',
    ],
    promptsNo: [
      'Hvordan ser landskapet rundt landsbyen ut: fjell, hav, skog, jorder?',
      'Hva er det første en besøkende legger merke til?',
    ],
    fields: [
      { key: 'place', type: 'area' },
    ],
  },
  {
    num: 'III',
    title: 'What the People Do',
    titleNo: 'Hva folk driver med',
    prompts: ['What does the village make, grow or sell?', 'What are the people really good at?'],
    promptsNo: ['Hva lager, dyrker eller selger landsbyen?', 'Hva er folk i landsbyen veldig flinke til?'],
    fields: [
      { key: 'main_resource', label: 'The main thing the village makes or grows', labelNo: 'Det viktigste landsbyen lager eller dyrker', type: 'text' },
      { key: 'best_at', type: 'area' },
    ],
  },
  {
    num: 'IV',
    title: 'Buildings and Clothes',
    titleNo: 'Bygninger og klær',
    prompts: [
      'What do the houses look like?',
      'Is there a building or place that everyone knows? What is it called?',
      'How do people dress? Does the village have a flag or a symbol?',
    ],
    promptsNo: [
      'Hvordan ser husene ut?',
      'Finnes det en bygning eller et sted alle kjenner? Hva heter det?',
      'Hvordan kler folk seg? Har landsbyen et flagg eller et symbol?',
    ],
    fields: [
      { key: 'landmarks', type: 'area' },
      { key: 'clothing_symbol', type: 'area' },
    ],
  },
  {
    num: 'V',
    title: 'A Tradition',
    titleNo: 'En tradisjon',
    prompts: [
      'Is there a festival, a game or a rule that only your village has?',
      'Is there a food or drink that your village is known for?',
    ],
    promptsNo: [
      'Finnes det en fest, en lek eller en regel bare landsbyen deres har?',
      'Finnes det en mat eller drikke landsbyen er kjent for?',
    ],
    fields: [
      { key: 'customs', type: 'area' },
      { key: 'signature_dish', label: 'Favourite food or drink', labelNo: 'Favorittmat eller -drikke', type: 'text' },
    ],
  },
];

const SHADOW = [
  {
    num: 'I',
    title: 'Name and Reputation',
    titleNo: 'Navn og rykte',
    lede: 'Everybody has heard of this village, and nobody is happy about it.',
    ledeNo: 'Alle har hørt om denne landsbyen, og ingen er glade for det.',
    prompts: ['What do other people call them?', 'What do people say about them?'],
    promptsNo: ['Hva kaller andre dem?', 'Hva sier folk om dem?'],
    fields: [
      { key: 'name', label: 'Village name', labelNo: 'Landsbyens navn', type: 'text', required: true },
      { key: 'group_members', label: 'Group members', labelNo: 'Hvem er med i gruppa?', type: 'text' },
      { key: 'reputation', label: 'Nickname and reputation', labelNo: 'Kallenavn og rykte', type: 'area' },
    ],
  },
  {
    num: 'II',
    title: 'Where Is It?',
    titleNo: 'Hvor ligger den?',
    prompts: ['What does the land look like, and why do people stay away?', 'What is the first sign that a traveller has come too close?'],
    promptsNo: ['Hvordan ser landskapet ut, og hvorfor holder folk seg unna?', 'Hva er det første tegnet på at en reisende har kommet for nær?'],
    fields: [{ key: 'place', type: 'area' }],
  },
  {
    num: 'III',
    title: 'Power',
    titleNo: 'Makt',
    prompts: ['What do they have a lot of?', 'Why are people afraid of them?'],
    promptsNo: ['Hva har de mye av?', 'Hvorfor er folk redde for dem?'],
    fields: [
      { key: 'main_resource', label: 'What they have most of', labelNo: 'Det de har mest av', type: 'text' },
      { key: 'feared_for', type: 'area' },
    ],
  },
  {
    num: 'IV',
    title: 'Buildings and Clothes',
    titleNo: 'Bygninger og klær',
    prompts: ['What do the buildings look like?', 'How do they dress? Do they have a symbol, and what does it look like?'],
    promptsNo: ['Hvordan ser bygningene ut?', 'Hvordan kler de seg? Har de et symbol, og hvordan ser det ut?'],
    fields: [
      { key: 'landmarks', type: 'area' },
      { key: 'clothing_symbol', type: 'area' },
    ],
  },
  {
    num: 'V',
    title: 'Rules and Goals',
    titleNo: 'Regler og mål',
    prompts: ['Is there a rule everyone must follow? What happens if someone breaks it?', 'What do they want most of all?'],
    promptsNo: ['Finnes det en regel alle må følge? Hva skjer hvis noen bryter den?', 'Hva ønsker de seg aller mest?'],
    fields: [
      { key: 'customs_law', type: 'area' },
      { key: 'ambition', type: 'area' },
    ],
  },
];

// Six conversations a villager can have: a question and an answer each.
// (Letters, not numbers, because answer keys may only contain letters and _.)
const TALKS = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((letter, i) => [
  { key: `talk_${letter}_q`, label: `Question ${i + 1}: what the player asks`, labelNo: `Spørsmål ${i + 1}: det spilleren spør om`, type: 'text' },
  { key: `talk_${letter}_a`, label: `Answer ${i + 1}: what your villager says`, labelNo: `Svar ${i + 1}: det innbyggeren sier`, type: 'area' },
]);

const VILLAGER = [
  {
    num: 'I',
    title: 'About Your Villager',
    titleNo: 'Om innbyggeren din',
    prompts: [],
    promptsNo: [],
    fields: [
      { key: 'name', label: 'Name', labelNo: 'Navn', type: 'text', required: true },
      { key: 'age', label: 'Age', labelNo: 'Alder', type: 'text' },
      { key: 'role', label: 'Job', labelNo: 'Jobb', type: 'text' },
      // he, she or it: how the others in the game talk about the villager. Without an answer it is he.
      { key: 'pronoun', label: 'Pronoun (he, she or it)', labelNo: 'Pronomen (he, she eller it)', type: 'choice', options: ['he', 'she', 'it'], default: 'he' },
    ],
  },
  {
    num: 'II',
    title: 'Appearance',
    titleNo: 'Utseende',
    prompts: [
      'Height, hair, eyes: what do people notice first?',
      'What do they usually wear?',
      'Do they carry something special, or have a scar or a special way of walking?',
    ],
    promptsNo: [
      'Høyde, hår, øyne: hva legger folk merke til først?',
      'Hva går de vanligvis i?',
      'Bærer de på noe spesielt, eller har de et arr eller en spesiell gange?',
    ],
    fields: [{ key: 'appearance', type: 'area' }],
  },
  {
    num: 'III',
    title: 'Personality',
    titleNo: 'Personlighet',
    prompts: ['Three words that describe them.', 'What do they like? What are they afraid of?'],
    promptsNo: ['Tre ord som beskriver dem.', 'Hva liker de? Hva er de redde for?'],
    fields: [
      { key: 'personality', type: 'area' },
      { key: 'interests', label: 'What do they like to do?', labelNo: 'Hva liker de å gjøre?', type: 'text' },
    ],
  },
  {
    num: 'IV',
    title: 'What They Say',
    titleNo: 'Hva de sier',
    lede: 'Players talk to your villager by choosing a question. Write up to six questions and the answers your villager gives. Only text.',
    ledeNo: 'Spillere snakker med innbyggeren din ved å velge et spørsmål. Skriv opptil seks spørsmål og svarene innbyggeren gir. Bare tekst.',
    prompts: [
      'What would a visitor like to ask? Rumours, the weather, the village, the villager’s secret…',
      'Answer the way your villager would: with their own words and mood.',
    ],
    promptsNo: [
      'Hva vil en besøkende spørre om? Rykter, været, landsbyen, innbyggerens hemmelighet …',
      'Svar slik innbyggeren din ville gjort: med egne ord og humør.',
    ],
    fields: TALKS,
  },
  {
    num: 'V',
    title: 'A Problem to Solve (optional)',
    titleNo: 'Et problem som må løses (valgfritt)',
    lede: 'Does your villager have a problem? Then the player has to search for the answer in another village, and come back. The same answer can wait in several villages.',
    ledeNo: 'Har innbyggeren din et problem? Da må spilleren lete etter svaret i en annen landsby og komme tilbake. Det samme svaret kan vente i flere landsbyer.',
    prompts: [
      'What is wrong, and what does your villager say about it?',
      'Give a hint, but do not give away the place. The player has to search.',
      'Write the exact name of the village (or villages, separated by commas) where the player finds the answer. It cannot be your own village.',
    ],
    promptsNo: [
      'Hva er galt, og hva sier innbyggeren din om det?',
      'Gi et hint, men ikke si hvor det er. Spilleren må lete.',
      'Skriv nøyaktig navn på landsbyen (eller landsbyene, skilt med komma) der spilleren finner svaret. Det kan ikke være landsbyen deres.',
    ],
    fields: [
      { key: 'quest_problem', label: 'The problem, in your villager’s words', labelNo: 'Problemet, med innbyggerens egne ord', type: 'area' },
      { key: 'quest_hint', label: 'A hint about where to search', labelNo: 'Et hint om hvor spilleren kan lete', type: 'area' },
      { key: 'quest_target', label: 'Village name(s) where the answer is', labelNo: 'Navn på landsbyen(e) der svaret finnes', type: 'text' },
      { key: 'quest_found', label: 'What the player finds or hears there', labelNo: 'Det spilleren finner eller hører der', type: 'area' },
      { key: 'quest_thanks', label: 'What your villager says when the problem is solved', labelNo: 'Det innbyggeren sier når problemet er løst', type: 'area' },
    ],
  },
];

// Students write their own problems (the "A Problem to Solve" part of the villager
// form) when this is true. Until then the game gives every villager a placeholder
// problem, so the way it works can be tried. Set it to true when the class gets there.
export const QUESTS_ENABLED = false;
const withoutQuests = (sections) => sections.filter((s) => !s.fields.some((f) => f.key.startsWith('quest_')));

export const CHARTERS = {
  village: { label: 'Village Charter', sections: VILLAGE },
  shadow: { label: 'Shadow Charter', sections: SHADOW },
  villager: { label: 'Villager Charter', sections: QUESTS_ENABLED ? VILLAGER : withoutQuests(VILLAGER) },
};

export function allFields(type) {
  return CHARTERS[type].sections.flatMap((s) => s.fields.map((f) => ({ ...f, section: s })));
}
