# Oppdrag til Claude Code: fullfør spilldesignet (oppfølging)

Lim denne inn som en ny melding til Claude Code i det samme
`stammespillet`-prosjektet. Motoren, innlogging (Feide/dev-login) og
fremgangslagring er allerede bygget og testet lokalt mot ekte Supabase –
dette oppdraget dekker KUN de fire tingene som manglet fra det opprinnelige
oppdraget: sideplott, galleri, rulletekst og musikk. Ikke rør eksisterende,
testet funksjonalitet mer enn nødvendig for å koble på det nye.

## 1. Sideplott-støtte

- Legg til et `plot`-felt på `scenes`-tabellen i Supabase (`text`, verdi
  `"main"` eller en stamme-id), default `"main"`.
- Oppdater innholdshenting/spill-logikken (`public/js/content.js` og/eller
  `game.js`) slik at sideplott-scener (koblet til en stamme via `plot`) kan
  nås fra hovedplott-scener via vanlige valg, men motoren skal ikke anta at
  alle scener ligger på hovedlinjen – en spiller skal kunne nå en
  `is_ending: true`-scene uten å ha vært innom noe sideplott.
- Ingen ny UI kreves – dette er i hovedsak datamodellering og at motoren
  håndterer forgreininger som allerede understøttes generisk.

## 2. Galleri / krønike-seksjon

- Legg til `population` (int) på `tribes`-tabellen, og `student_name`
  (text) på `characters`-tabellen (brukes også i punkt 3).
- Ny visning i appen (egen "view" fra `main.js`, nås via en knapp/meny i
  `index.html` – ikke en del av selve fortellingen): viser ALT visuelt
  materiale samlet – karakterbilder, stammesymboler/landsbybilder, kartet.
  Rent nedskrollbart galleri, ingen valg, ingen kobling til
  spillfremgangen.
- Hent bildene fra de samme `image`-feltene som allerede brukes i scenene.
  Om det finnes løse skisser uten tilknytning til en spesifikk
  karakter/stamme, er en enkel `gallery_extra`-liste (array av bilde-URLer)
  et grunnlagsforslag – valgfritt, kan droppes hvis det compliserer for
  mye nå.

## 3. Rulletekst (credits)

- Vis en credits-skjerm når spilleren når en scene med `is_ending: true`.
- Innhold:
  - For hver av de 5 stammene: list de 5 karakterenes `student_name` og
    `role`.
  - En statisk, hardkodet liste for kartlagerteamet (5 navn – fylles inn
    manuelt av Øyvind i koden, trenger ingen egen databasetabell for kun
    5 faste navn).
  - Avslutt med en enkel linje, f.eks. "Made by [klassenavn], [år]".
- En ryddig, rullbar liste holder – ingen krav om animasjon.

## 4. Musikk

- Ny mappe `public/assets/audio/`.
- Enkel `<audio>`-avspilling: ett generelt bakgrunnsspor er nok å starte
  med; egne spor per stamme (spilles av når spilleren er i scener knyttet
  til den stammen) kan legges til om det ikke kompliserer for mye – ellers
  holder ett spor for hele spillet nå, og det kan utvides senere.
- Eget, litt større spor til rulletekst-skjermen (punkt 3).
- Tydelig mute/volum-kontroll i grensesnittet. Trenger ikke lagres i
  Supabase – ren klient-tilstand for økten er nok.
- Selve lydfilene skaffer Øyvind selv (royaltyfrie/CC-lisensierte spor) og
  legger i `public/assets/audio/` – ikke noe Claude Code skal generere.

## Ikke gjør

- Ikke rør eksisterende, testet funksjonalitet (auth-flyten, progress.js,
  kjerne-scenevisningen) mer enn nødvendig for å koble på det nye.
- Ikke legg inn ekte spillinnhold ennå – fortsatt kun eksempeldata, som
  før.
- Ikke deploy til produksjon selv om det nå er teknisk mulig – det venter
  til Netlify-byggekredittene er ordnet (se README, "Gjenstår").
