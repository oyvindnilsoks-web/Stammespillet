// Field definitions for the three worksheets (Village / Shadow / Villager
// Charter), mirroring the printed sheets the class already used. Shared by
// the student Contribute page and the admin page. Field keys are stored in
// the `charter` jsonb column, so never rename a key once data exists.

const VILLAGE = [
  {
    num: 'I',
    title: 'Name and Core Idea',
    titleNo: 'Navn og grunnidé',
    lede: 'Before you answer anything else: who are you, in one sentence?',
    prompts: [
      'What does the name mean, or where does it come from?',
      'If the village were one word or one feeling — which?',
      'Do you have a motto or saying that everyone in the village knows?',
    ],
    promptsNo: [
      'Hva betyr navnet, eller hvor kommer det fra?',
      'Hvis landsbyen var ett ord eller én følelse — hvilket?',
      'Har dere et motto eller ordtak alle i landsbyen kjenner?',
    ],
    fields: [
      { key: 'name', label: 'Village name', labelNo: 'Landsbyens navn', type: 'text', required: true },
      { key: 'group_members', label: 'Group members', labelNo: 'Hvem er med i gruppa?', type: 'text' },
      { key: 'core_idea', label: 'Meaning, feeling and motto', labelNo: 'Betydning, følelse og motto', type: 'area' },
    ],
  },
  {
    num: 'II',
    title: 'Place and Landscape',
    titleNo: 'Sted og landskap',
    lede: 'Where on the map do you sit, and how does the place shape the people?',
    prompts: [
      'Mountains, coast, forest, plains, river delta — what kind of landscape do you live in?',
      "What's the first thing a stranger notices when they arrive?",
      'Which season is most beautiful there — and which is most dangerous?',
      'Which other village is closest, and how long is the journey there?',
    ],
    promptsNo: [
      'Fjell, kyst, skog, slette, elvedelta — hva slags landskap bor dere i?',
      'Hva er det første en fremmed legger merke til?',
      'Hvilken årstid er vakrest — og hvilken er farligst?',
      'Hvilken landsby ligger nærmest, og hvor lang er reisen?',
    ],
    fields: [{ key: 'place', type: 'area' }],
  },
  {
    num: 'III',
    title: 'Resources and Livelihood',
    titleNo: 'Ressurser og levebrød',
    lede: 'What gives the village food and income — and what must they get from elsewhere?',
    prompts: ['What do they sell or trade to other villages?', "What don't they have themselves, and must trade for?"],
    promptsNo: ['Hva selger eller bytter de til andre landsbyer?', 'Hva har de ikke selv, og må handle til seg?'],
    fields: [
      { key: 'main_resource', label: 'Main resource', labelNo: 'Hovedressurs', type: 'text' },
      { key: 'secondary_resources', label: 'Two secondary resources', labelNo: 'To biressurser', type: 'text' },
      { key: 'trade', label: 'Trade', labelNo: 'Handel', type: 'area' },
    ],
  },
  {
    num: 'IV',
    title: "What They're Best in the Whole World At",
    titleNo: 'Det de er best i hele verden på',
    lede: 'One thing no other village does as well. Not just "what" — but how they got so good at it.',
    prompts: [
      'Is it a craft, an art form, a fighting style, a kind of knowledge?',
      'Who taught them first, or how did the skill come about?',
      'What would a visitor pay a lot to learn, or to take home?',
    ],
    promptsNo: [
      'Er det et håndverk, en kunstform, en kampstil, en form for kunnskap?',
      'Hvem lærte dem det først, eller hvordan oppsto ferdigheten?',
      'Hva ville en besøkende betale mye for å lære eller få med seg hjem?',
    ],
    fields: [{ key: 'best_at', type: 'area' }],
  },
  {
    num: 'V',
    title: 'Food and Drink',
    titleNo: 'Mat og drikke',
    lede: 'Food reveals as much about a people as their history does.',
    prompts: ['Is there something they never eat — a taboo, or something they find disgusting?'],
    promptsNo: ['Finnes det noe de aldri spiser — et tabu, eller noe de synes er ekkelt?'],
    fields: [
      { key: 'signature_dish', label: 'Signature dish', labelNo: 'Signaturretten', type: 'text' },
      { key: 'feast_food', label: 'Feast food / drink', labelNo: 'Festmat / -drikke', type: 'text' },
      { key: 'food_taboo', label: 'Never eat', labelNo: 'Spiser aldri', type: 'area' },
    ],
  },
  {
    num: 'VI',
    title: 'Landmarks',
    titleNo: 'Byggverk',
    lede: 'Choose one named landmark that everyone in the village knows — and give it a small story.',
    prompts: [
      'What kind of materials and building style do they generally use?',
      'What is the most famous landmark called, and what is it used for?',
      "What's the short story or myth attached to it?",
    ],
    promptsNo: [
      'Hva slags materialer og byggestil bruker de?',
      'Hva heter det mest kjente byggverket, og hva brukes det til?',
      'Hva er den korte historien eller myten knyttet til det?',
    ],
    fields: [{ key: 'landmarks', type: 'area' }],
  },
  {
    num: 'VII',
    title: 'Clothing and Symbol',
    titleNo: 'Klær og symbol',
    prompts: [
      'How do people in the village dress — colours, materials, something everyone wears?',
      'Does the village have a mark, symbol, or banner? What does it depict?',
    ],
    promptsNo: [
      'Hvordan kler folk seg — farger, materialer, noe alle har på seg?',
      'Har landsbyen et merke, symbol eller banner? Hva forestiller det?',
    ],
    fields: [{ key: 'clothing_symbol', type: 'area' }],
  },
  {
    num: 'VIII',
    title: 'Customs and Celebration',
    titleNo: 'Skikker og fest',
    prompts: [
      'Do they have a festival or celebration no other village has?',
      'Is there a rule or taboo everyone follows — without exception?',
      'How do they mark a child becoming an adult?',
    ],
    promptsNo: [
      'Har de en fest eller markering ingen andre landsbyer har?',
      'Finnes det en regel eller et tabu alle følger — uten unntak?',
      'Hvordan markerer de at et barn blir voksen?',
    ],
    fields: [{ key: 'customs', type: 'area' }],
  },
  {
    num: 'IX',
    title: 'How They Remember',
    titleNo: 'Hvordan de husker',
    lede: 'Every village has its own way of keeping its past alive.',
    prompts: ['Is it an object, a place, a song, a book, or something else entirely?', 'What happens if that thing or custom is lost?'],
    promptsNo: ['Er det en gjenstand, et sted, en sang, en bok, eller noe helt annet?', 'Hva skjer hvis den tingen eller skikken går tapt?'],
    fields: [{ key: 'remember', type: 'area' }],
  },
  {
    num: 'X',
    title: 'Government and Law',
    titleNo: 'Styre og lov',
    prompts: ['Is there one law or rule that matters especially to them?'],
    promptsNo: ['Finnes det én lov eller regel som er spesielt viktig for dem?'],
    fields: [
      { key: 'leader', label: 'Who leads the village?', labelNo: 'Hvem leder landsbyen?', type: 'text' },
      { key: 'become_leader', label: 'How does one become leader?', labelNo: 'Hvordan blir man leder?', type: 'text' },
      { key: 'important_law', label: 'Important law', labelNo: 'Viktig lov', type: 'area' },
    ],
  },
  {
    num: 'XI',
    title: 'Relationship to the Other Villages',
    titleNo: 'Forhold til de andre landsbyene',
    lede: 'Talk to the other groups before you answer here — the relationship has to check out from both sides.',
    prompts: ['Why is the relationship the way it is — what happened?', 'Is there a village they barely know exists?'],
    promptsNo: ['Hvorfor er forholdet slik det er — hva skjedde?', 'Finnes det en landsby de knapt vet at finnes?'],
    fields: [
      { key: 'allied_with', label: "One they're allied with", labelNo: 'En de er alliert med', type: 'text' },
      { key: 'strained_with', label: 'One they have a strained relationship with', labelNo: 'En de har et anstrengt forhold til', type: 'text' },
      { key: 'relations_story', label: 'Why?', labelNo: 'Hvorfor?', type: 'area' },
    ],
  },
  {
    num: 'XII',
    title: 'History and Famous Names',
    titleNo: 'Historie og berømte navn',
    prompts: [
      "How do they tell the story of the village's founding?",
      'Who is the most famous person who ever lived there — and why does everyone remember the name?',
      'Is there one dramatic event everyone in the village can tell you about?',
    ],
    promptsNo: [
      'Hvordan forteller de at landsbyen ble grunnlagt?',
      'Hvem er den mest berømte personen som har levd der — og hvorfor?',
      'Finnes det én dramatisk hendelse alle kan fortelle om?',
    ],
    fields: [{ key: 'history', type: 'area' }],
  },
];

const SHADOW = [
  {
    num: 'I',
    title: 'Name and Reputation',
    titleNo: 'Navn og rykte',
    prompts: [
      'What do others call them — a nickname, said with fear or contempt?',
      'What reputation precedes them, even far away?',
    ],
    promptsNo: ['Hva kaller de andre dem — et kallenavn, sagt med frykt eller forakt?', 'Hvilket rykte går foran dem, selv langt unna?'],
    fields: [
      { key: 'name', label: 'Village name', labelNo: 'Landsbyens navn', type: 'text', required: true },
      { key: 'group_members', label: 'Group members', labelNo: 'Hvem er med i gruppa?', type: 'text' },
      { key: 'reputation', label: 'Nickname and reputation', labelNo: 'Kallenavn og rykte', type: 'area' },
    ],
  },
  {
    num: 'II',
    title: 'Place — The Land People Avoid',
    titleNo: 'Sted — det folk unngår',
    prompts: ['Where are they located, and what kind of landscape is it?', "What's the first sign a traveller has come too close to their border?"],
    promptsNo: ['Hvor ligger de, og hva slags landskap er det?', 'Hva er det første tegnet på at en reisende har kommet for nær grensen?'],
    fields: [{ key: 'place', type: 'area' }],
  },
  {
    num: 'III',
    title: 'Power and Resources',
    titleNo: 'Makt og ressurser',
    lede: "Most villages make do with what they have. This one doesn't.",
    prompts: ['What do they have a lot of — and how did they get more than their rightful share?', 'Who loses out because of it, and do they know it themselves?'],
    promptsNo: ['Hva har de mye av — og hvordan skaffet de seg mer enn sin rettmessige del?', 'Hvem taper på det, og vet de det selv?'],
    fields: [
      { key: 'main_resource', label: 'What they have most of', labelNo: 'Det de har mest av', type: 'text' },
      { key: 'power_resources', label: 'How they got it, and who loses', labelNo: 'Hvordan de fikk det, og hvem taper', type: 'area' },
    ],
  },
  {
    num: 'IV',
    title: "What They're Feared For",
    titleNo: 'Det de er fryktet for',
    prompts: ['What do they do better than anyone else — a skill, a strength, a form of control?', 'What would happen to a stranger who challenged them?'],
    promptsNo: ['Hva gjør de bedre enn noen andre — en ferdighet, en styrke, en form for kontroll?', 'Hva ville skjedd med en fremmed som utfordret dem?'],
    fields: [{ key: 'feared_for', type: 'area' }],
  },
  {
    num: 'V',
    title: 'Food and Drink',
    titleNo: 'Mat og drikke',
    lede: 'Even the feared eat dinner. This field keeps them human.',
    prompts: [],
    promptsNo: [],
    fields: [
      { key: 'signature_dish', label: 'Signature dish', labelNo: 'Signaturretten', type: 'text' },
      { key: 'never_serve', label: "Something they'd never serve a stranger", labelNo: 'Noe de aldri ville servert en fremmed', type: 'text' },
    ],
  },
  {
    num: 'VI',
    title: 'Landmarks',
    titleNo: 'Byggverk',
    prompts: ['What kind of building style and materials define the village?', 'What is the most impressive (or most frightening) landmark called, and what happens there?'],
    promptsNo: ['Hva slags byggestil og materialer preger landsbyen?', 'Hva heter det mest imponerende (eller skumleste) byggverket, og hva skjer der?'],
    fields: [{ key: 'landmarks', type: 'area' }],
  },
  {
    num: 'VII',
    title: 'Clothing and Symbol',
    titleNo: 'Klær og symbol',
    prompts: ['How do they dress — and do the leaders visibly stand apart from the rest?', 'Do they have a mark or symbol? What does it depict, and why does it feel unsettling to outsiders?'],
    promptsNo: ['Hvordan kler de seg — og skiller lederne seg synlig ut?', 'Har de et merke eller symbol? Hva forestiller det, og hvorfor virker det urovekkende?'],
    fields: [{ key: 'clothing_symbol', type: 'area' }],
  },
  {
    num: 'VIII',
    title: 'Customs and Law',
    titleNo: 'Skikker og lov',
    prompts: [
      'Is there a law everyone must follow, no matter how unfair it looks from outside?',
      'What happens to someone who breaks their rules?',
      "Do they have a secret custom or ceremony the other villages don't know about?",
    ],
    promptsNo: [
      'Finnes det en lov alle må følge, uansett hvor urettferdig den virker?',
      'Hva skjer med noen som bryter reglene?',
      'Har de en hemmelig skikk eller seremoni de andre ikke vet om?',
    ],
    fields: [{ key: 'customs_law', type: 'area' }],
  },
  {
    num: 'IX',
    title: 'What They Want That Others Would Never Accept',
    titleNo: 'Det de vil som de andre aldri ville godtatt',
    lede: 'This is the core of why they are dangerous.',
    prompts: ['What do they want — and why would the other villages never agree to it?', 'Or do they simply believe they deserve more than everyone else?'],
    promptsNo: ['Hva vil de — og hvorfor ville de andre landsbyene aldri gått med på det?', 'Eller tror de rett og slett at de fortjener mer enn alle andre?'],
    fields: [{ key: 'ambition', type: 'area' }],
  },
  {
    num: 'X',
    title: 'Who Rules, and How',
    titleNo: 'Hvem styrer, og hvordan',
    prompts: [],
    promptsNo: [],
    fields: [
      { key: 'leader', label: 'Leader(s)', labelNo: 'Leder(e)', type: 'text' },
      { key: 'hold_power', label: 'How do they hold onto power?', labelNo: 'Hvordan holder de på makten?', type: 'area' },
    ],
  },
  {
    num: 'XI',
    title: 'Relationship to the Other Villages',
    titleNo: 'Forhold til de andre landsbyene',
    lede: 'Talk to at least two of the other groups — their fear of you has to match what you write here.',
    prompts: ['Why are they isolated from the rest? What happened — or what do the others think happened?', 'Is there one village that still trades with them in secret? Why?'],
    promptsNo: ['Hvorfor er de isolert fra resten? Hva skjedde — eller hva tror de andre skjedde?', 'Finnes det én landsby som fortsatt handler med dem i hemmelighet? Hvorfor?'],
    fields: [{ key: 'relations_story', type: 'area' }],
  },
  {
    num: 'XII',
    title: "Why They Believe They're Right",
    titleNo: 'Hvorfor de tror de har rett',
    lede: 'The most important field on the whole sheet. Write it as if you actually lived there and truly believed it.',
    prompts: ['How do they explain their own actions to their own children?', 'What do they believe would happen to the world if no one did what they do?'],
    promptsNo: ['Hvordan forklarer de sine egne handlinger til sine egne barn?', 'Hva tror de ville skje med verden om ingen gjorde som dem?'],
    fields: [{ key: 'why_right', type: 'area' }],
  },
];

const VILLAGER = [
  {
    num: 'I',
    title: 'Name, Role, and Age',
    titleNo: 'Navn, rolle og alder',
    prompts: ['Is the role something they chose, or something they were born into?', 'Do they enjoy it — or do they secretly dream of something else?'],
    promptsNo: ['Er rollen noe de valgte selv, eller noe de ble født inn i?', 'Trives de med den — eller drømmer de om noe annet?'],
    fields: [
      { key: 'name', label: 'Name', labelNo: 'Navn', type: 'text', required: true },
      { key: 'age', label: 'Age', labelNo: 'Alder', type: 'text' },
      { key: 'role', label: 'Role / occupation', labelNo: 'Rolle / yrke', type: 'text' },
      { key: 'role_story', label: 'Chosen or born into it?', labelNo: 'Valgt eller født inn i?', type: 'area' },
    ],
  },
  {
    num: 'II',
    title: 'Appearance',
    titleNo: 'Utseende',
    prompts: [
      'Build, hair, eyes — the most important thing someone would notice first.',
      'Do they have a physical feature: a scar, a distinctive walk, something they always carry?',
      "What do they usually wear, and does it fit the village's style?",
    ],
    promptsNo: [
      'Bygning, hår, øyne — det viktigste noen legger merke til først.',
      'Har de et kjennetegn: et arr, en spesiell gange, noe de alltid bærer på?',
      'Hva går de vanligvis i, og passer det til landsbyens stil?',
    ],
    fields: [{ key: 'appearance', type: 'area' }],
  },
  {
    num: 'III',
    title: 'Personality',
    titleNo: 'Personlighet',
    prompts: [
      "Three words that describe them — and one example of each, from something they'd actually do.",
      "How do they act when they're scared or under pressure?",
      'What makes them laugh?',
    ],
    promptsNo: [
      'Tre ord som beskriver dem — og ett eksempel på hver.',
      'Hvordan oppfører de seg når de er redde eller under press?',
      'Hva får dem til å le?',
    ],
    fields: [{ key: 'personality', type: 'area' }],
  },
  {
    num: 'IV',
    title: 'Strengths and Talents',
    titleNo: 'Styrker og talenter',
    prompts: ['What are they better at than most others in the village?', 'Is there a surprising talent almost no one knows about?'],
    promptsNo: ['Hva er de bedre til enn de fleste andre i landsbyen?', 'Finnes det et overraskende talent nesten ingen vet om?'],
    fields: [{ key: 'strengths', type: 'area' }],
  },
  {
    num: 'V',
    title: 'Weaknesses and Fears',
    titleNo: 'Svakheter og frykt',
    lede: 'This might be the most important field on the whole sheet. A weakness is something that can actually cause trouble in the story.',
    prompts: [
      'What are they bad at, that they should really be better at for their role?',
      'What are they most afraid of — and why exactly that?',
      'Do they have a personality flaw (stubbornness, suspicion, too trusting...) that can cause problems?',
    ],
    promptsNo: [
      'Hva er de dårlige til, som de burde vært flinkere til?',
      'Hva er de mest redde for — og hvorfor akkurat det?',
      'Har de en feil i personligheten (stahet, mistenksomhet, for tillitsfull...) som kan skape problemer?',
    ],
    fields: [{ key: 'weaknesses', type: 'area' }],
  },
  {
    num: 'VI',
    title: 'Goal and Drive',
    titleNo: 'Mål og drivkraft',
    prompts: [
      'What does your character want more than anything else, right now?',
      'Why does this matter so much to them, personally?',
      "What happens — to them, or to someone they love — if they don't achieve it?",
    ],
    promptsNo: [
      'Hva vil karakteren din mer enn noe annet akkurat nå?',
      'Hvorfor betyr dette så mye for dem?',
      'Hva skjer — med dem, eller noen de er glad i — hvis de ikke får det til?',
    ],
    fields: [{ key: 'goal', type: 'area' }],
  },
  {
    num: 'VII',
    title: 'Background and Family',
    titleNo: 'Bakgrunn og familie',
    prompts: ['Who is their family, and what is that relationship like?', 'Is there one event in the past that has shaped who they are today?'],
    promptsNo: ['Hvem er familien deres, og hvordan er forholdet?', 'Finnes det én hendelse i fortiden som har formet hvem de er?'],
    fields: [{ key: 'background', type: 'area' }],
  },
  {
    num: 'VIII',
    title: 'Relationships',
    titleNo: 'Forhold til andre',
    prompts: [],
    promptsNo: [],
    fields: [
      { key: 'close_friend', label: 'A close friend', labelNo: 'En nær venn', type: 'text' },
      { key: 'not_get_along', label: "Someone they don't get along with", labelNo: 'En de ikke kommer overens med', type: 'text' },
      { key: 'role_model', label: 'A role model', labelNo: 'Et forbilde', type: 'text' },
    ],
  },
  {
    num: 'IX',
    title: 'A Secret',
    titleNo: 'En hemmelighet',
    lede: "Something your character hasn't told (almost) anyone.",
    prompts: ['What is it, and why do they hide it?', 'What would happen if it came to light?'],
    promptsNo: ['Hva er det, og hvorfor skjuler de det?', 'Hva ville skjedd om det kom for en dag?'],
    fields: [{ key: 'secret', type: 'area' }],
  },
  {
    num: 'X',
    title: 'Voice and Habits',
    titleNo: 'Stemme og vaner',
    prompts: ['Do they have a favourite expression, or a distinctive way of speaking?', 'A habit or small tic they do without thinking about it?'],
    promptsNo: ['Har de et yndlingsuttrykk, eller en spesiell måte å snakke på?', 'En vane eller et lite triks de gjør uten å tenke over det?'],
    fields: [{ key: 'voice_habits', type: 'area' }],
  },
];

export const CHARTERS = {
  village: { label: 'Village Charter', sections: VILLAGE },
  shadow: { label: 'Shadow Charter', sections: SHADOW },
  villager: { label: 'Villager Charter', sections: VILLAGER },
};

export function allFields(type) {
  return CHARTERS[type].sections.flatMap((s) => s.fields.map((f) => ({ ...f, section: s })));
}
