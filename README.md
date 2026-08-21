# Stammespillet ("The Unmaking")

Spillets tittel i grensesnittet er **"The Unmaking"** – hele elevopplevelsen
(knapper, tekst, meldinger, innhold) er på engelsk, siden dette er
engelskfagets prosjekt. "Stammespillet" brukes fortsatt som prosjektnavn i
dokumentasjon og repo.

Tekstbasert valgspill for 7. trinn (engelskfaget). Spilleren velger en
elevutviklet karakter tilhørende en stamme, og tar seg gjennom scener med
valg som styrer fremgangen. Lore, stammer og karakterer er utviklet av
elevene; spillteksten skrives på engelsk som ledd i engelskfaget (se
`docs/KOMPETANSEMAL_7TRINN.md`).

Nettbasert: hostet på **Netlify**, med **Feide**-innlogging (kun for å
identifisere eleven og lagre fremgang) og **Supabase** som lagring for
innhold og elevfremgang.

## Status per nå

**Spillmotoren er bygget og testet lokalt, men ikke deployet til
produksjon ennå.** Se punktene under.

### Ferdig og verifisert
- Supabase-database opprettet med skjema for `tribes`, `characters`,
  `scenes`, `progress` + RLS-policyer, seedet med eksempeldataene fra
  `data/` for testing.
- Spillmotor (`public/`): leser innhold generisk fra Supabase (ingen
  hardkoding av eksempeldataene), viser scene-tekst/bilde/valg, regner ut
  hvilken scene som er "start-scenen" for en stamme automatisk, håndterer
  "consequences" som flagg, og har en enkel klan-leksikon-visning
  ("Clan Lexicon"). Hele grensesnittet er på engelsk.
- **De 5 rammeverk-klanene fra lore-bibelen** (Mountain/Water/City/Trader/
  Forest Clan) er lagt inn i `tribes`-tabellen med ressurs, kultur og
  forhold til hverandre – synlige i Clan Lexicon og Gallery. Navnene er
  placeholder (elevene skal navngi klanene selv). De to opprinnelige
  test-stammene (Nordmyr/Solvang, med spillbare karakterer og scener) ligger
  fortsatt i tabellen for motor-testing, nå også oversatt til engelsk.
- Innlogging (`netlify/functions/auth-*.js`): standard OIDC med PKCE mot
  Feide, med automatisk fallback til en tydelig merket testinnlogging
  (`dev-login.html`) så lenge Feide ikke er konfigurert ennå.
- Fremgangslagring (`netlify/functions/progress.js`): lagrer/laster
  elevens `current_scene`, `chosen_character`, `flags`, `visited_tribes` i
  Supabase, bak en signert sesjonscookie.
- **Hele løpet er testet lokalt** (`netlify dev`): testinnlogging → velge
  karakter → spille gjennom scener → lukke/gjenåpne siden → fremgangen
  hentes riktig tilbake. Verifisert med ekte kall mot Supabase-prosjektet.
- Netlify-nettsted opprettet (`stammespillet`, se IDer under), med
  miljøvariabler for Supabase og sesjon satt.
- **Sideplott**: `scenes.plot` (`'main'` eller en stamme-id) skiller
  hovedplott fra valgfrie sidehistorier. Sideplott-scener nås via vanlige
  valg fra hovedplottet, og motoren regner kun ut "start-scenen" for en
  stamme blant `plot='main'`-scener – en spiller kan alltid nå en
  `is_ending`-scene uten å ha vært innom noe sideplott. Testet med en
  eksempel-sidehistorie (`scene_005`) som løper tilbake inn i hovedplottet.
- **Galleri** (`public/js/gallery.js`): egen visning (nav-knapp "Galleri")
  med alle karakterbilder og stammebilder samlet, gruppert per stamme med
  innbyggertall (`tribes.population`). Ingen kobling til spillfremgangen.
- **Rulletekst** (`public/js/credits.js`): vises når en `is_ending`-scene
  nås ("Vis rulletekst"-knapp). Lister `student_name` + `role` for hver
  karakter per stamme (hentet fra Supabase, ikke hardkodet), et hardkodet
  kartlagerteam og en avslutningslinje. **Kartlagerteamets 5 navn og
  klassenavnet er placeholder-verdier (`[Navn 1]` osv.) i toppen av
  `credits.js` – må fylles inn manuelt.**
- **Musikk** (`public/js/audio.js`): ett generelt bakgrunnsspor, valgfrie
  stamme-spesifikke spor (faller automatisk tilbake til det generelle
  hvis filen mangler), eget spor til rulletekst-skjermen, og en
  mute/volum-kontroll i toppmenyen. Ren klient-tilstand, ingenting lagres
  i Supabase. **Selve lydfilene er ikke lagt inn ennå** – se
  `public/assets/audio/LEGG_LYD_HER.txt`.
- **Introvideo** (`public/js/intro.js`): vises automatisk første gang en
  elev logger inn (før karaktervalg), og kan spilles av på nytt når som
  helst via "Se introen" i menyen. "Sett som sett"-tilstanden lagres i
  `progress.flags.seen_intro` – ingen databaseendring var nødvendig.
  Bevares ved omspilling ("Spill igjen"), så videoen tvinges ikke fram
  på nytt. Bygges inn via `youtube-nocookie.com` (unlisted YouTube-video,
  ingen sporingscookies). **Video-ID-en er ikke lagt inn ennå** – se
  `INTRO_VIDEO_ID` øverst i `intro.js`.
- **World Lore** (`public/js/lore.js`): egen visning (nav-knapp
  "World Lore") med to faner – "Chronicle of the Clans" og novellen "The
  Long Song" – hentet som markdown fra `public/docs/` og rendret med en
  liten, egenbygd markdown-renderer (`public/js/markdown.js`). Ren
  bakgrunnslesning, ikke koblet til Supabase eller spillfremgang. Har
  plassholder-illustrasjon for novellen og et ekte, komprimert verdenskart
  som forside for krøniken (`public/assets/images/lore/`). Begge
  dokumentene er ferdige og på engelsk (novellen dekker akt I–VI, fram til
  "— End —"). Rendereren gjenkjenner overskrifter i "The Long Song"
  heuristisk (korte linjer uten avsluttende tegnsetting), siden
  kildefilens overskrift-markering ble borte i en eksport – ingen `#`-tegn
  å støtte seg på lenger i den filen.
  **Merk:** "Chronicle of the Clans" (`docs/WORLD_LORE_EN.md`) er en
  forkortet, elevvennlig engelsk oversettelse av den norske
  `docs/LORE_BIBEL.md` (avsnitt 1–3, 5–8 – uten lærernotatene i avsnitt
  12–14). Den norske originalen er fortsatt ditt planleggingsverktøy og
  vises ikke til elevene.
- **Klikk-for-oversettelse** (`public/js/translate.js`): alle engelske ord i
  scenetekst og i World Lore-dokumentene er klikkbare – et klikk viser en
  norsk oversettelse i en liten boks, hentet fra den gratis
  MyMemory-oversettelses-APIen (ingen nøkkel/konto trengs, kun enkeltord
  sendes, ingen elevdata). Resultater caches i nettleseren. Koblet på via
  én delegert lytter på `#app` i `main.js`, så den virker uansett hvilken
  visning som er aktiv.

### Gjenstår
1. **Deploy til produksjon** – blokkert av at Netlify-kontoen har nådd
   grensen for bygge-kreditter denne perioden. Koden er klar; deploy kan
   kjøres så snart kreditter/plan er ordnet (se "Deploy" under).
2. **Ekte Feide-oppkobling** – venter på at Steinkjer kommune setter opp
   sin interne Feide-tjeneste og gir `issuer`-URL + client-ID/secret.
   Motoren er allerede bygget for standard OIDC discovery, så dette er kun
   miljøvariabler, ingen kodeendring (se `SETUP.md`).
3. **Faktisk spillinnhold** – kun eksempeldata er lagt inn, bevisst, for å
   teste motoren (se "Ikke gjør ennå" i `docs/briefs/01_initial_brief.md`). Ekte
   stammer/karakterer/scener legges inn i Supabase-tabellene når elevenes
   engelske tekster er klare.
4. **Lydfiler og kartlagerteam-navn** – legg ekte spor i
   `public/assets/audio/` og fyll inn navnene i `MAP_TEAM`/`CLASS_NAME`
   øverst i `public/js/credits.js`.
5. **Introvideo-ID** – fyll inn `INTRO_VIDEO_ID` øverst i
   `public/js/intro.js` når videoen er lastet opp som "unlisted" på
   YouTube.

## Arkitektur

```
public/                    → statisk nettsted (HTML/CSS/vanilla JS, ingen build-steg,
                              Supabase JS hentes fra esm.sh CDN)
  index.html                  spillets hovedside (SPA, view-bytte i JS)
  dev-login.html               testinnlogging (kun aktiv når ENABLE_DEV_LOGIN=true)
  css/style.css
  assets/audio/                bakgrunnsmusikk (LEGG_LYD_HER.txt forklarer filnavn/konvensjon)
  js/
    config.js                  Supabase URL + offentlig (RLS-beskyttet) nøkkel
    supabaseClient.js
    api.js                      wrappers rundt /api/session, /api/progress, /api/auth/*
    content.js                  generisk henting av tribes/characters/scenes
    game.js                     scene-rendering, valg, "entry scene"-logikk (kun plot='main'), consequences
    lexicon.js                  stammeleksikon-visning
    gallery.js                  galleri-visning (alle bilder, gruppert per stamme)
    intro.js                    introvideo (YouTube unlisted, vises første gang, INTRO_VIDEO_ID fylles inn her)
    credits.js                  rulletekst ved is_ending (MAP_TEAM/CLASS_NAME fylles inn her)
    audio.js                    bakgrunnsmusikk + mute/volum-kontroll
    main.js                     app-oppstart / view-styring

netlify/functions/          → serverless-funksjoner (Node), kjører kun server-side
  auth-login.js                 starter Feide OIDC (PKCE) – faller tilbake til dev-login
                                 hvis FEIDE_ISSUER ikke er satt
  auth-callback.js              bytter code → tokens, verifiserer id_token, setter sesjon
  auth-logout.js
  auth-dev-login.js             testinnlogging, kun aktiv med ENABLE_DEV_LOGIN=true
  session.js                    returnerer innloggingsstatus (uten å eksponere feide_id)
  progress.js                   GET/POST fremgang – eneste vei inn til `progress`-tabellen
  _lib/                          delte hjelpefunksjoner (cookies, JWT-sesjon, OIDC discovery,
                                 Supabase service-role-klient)

data/                        → (kun referanse) JSON-maler/eksempler som viser skjemaet
assets/images/               → (kun referanse) mapper for Midjourney-bilder
netlify.toml                 → build/redirects-oppsett
SETUP.md                     → miljøvariabler, Feide-oppkobling, lokal testing, deploy
```

**Innhold** (`tribes`/`characters`/`scenes`) leses direkte fra nettleseren
med en offentlig, RLS-beskyttet Supabase-nøkkel (kun lesetilgang).
**Fremgang** (`progress`) har ingen klient-tilgang i det hele tatt – RLS er
skrudd på uten policyer, så all lesing/skriving går via
`netlify/functions/progress.js`, som verifiserer elevens sesjon og bruker
en hemmelig service-role-nøkkel server-side. Kun `sub`-claimen fra Feide
sin id_token brukes som elev-ID (prefikset `feide:`) – ingen navn,
fødselsdato eller annen persondata hentes eller lagres.

## Nøkkelressurser

| Ressurs | Verdi |
|---|---|
| Supabase-prosjekt | `stammespillet` (ref `rdqodrcrfakgvgwkmejj`), org "Øyvinds ogs", region eu-west-1 |
| Supabase URL | `https://rdqodrcrfakgvgwkmejj.supabase.co` |
| Netlify-nettsted | `stammespillet` (id `151f419c-de4a-4c3c-b6e3-981594752180`) |
| Produksjons-URL | `https://stammespillet.netlify.app` (ikke deployet ennå) |

Merk: det finnes fra før en annen, urelatert Supabase-app i samme konto
("pokestops"/"catches"/"settings") – **stammespillet bruker sitt eget,
separate Supabase-prosjekt**, ikke denne.

## Kom i gang lokalt

```bash
npm install
npx netlify dev --port 8888
```

Åpne `http://localhost:8888`. Siden sender deg automatisk til
`/dev-login.html` når `FEIDE_ISSUER` ikke er satt – skriv inn en
vilkårlig test-id for å logge inn og teste hele løpet.

Se [`SETUP.md`](SETUP.md) for full liste over miljøvariabler,
`.env.example`, hvordan koble på ekte Feide, og deploy-kommandoer.

## Deploy

Koden og Netlify-nettstedet er klare. Når bygge-kreditter/plan er ordnet:

```bash
npx netlify link --id 151f419c-de4a-4c3c-b6e3-981594752180
npx netlify deploy --prod
```

Husk å be Steinkjer kommune registrere
`https://stammespillet.netlify.app/api/auth/callback` (eller endelig
produksjonsdomene) som redirect-URI hos Feide-tjenesten før den kobles på.

## Mappestruktur for innhold (`data/`)

```
stammespillet/
├── data/
│   ├── scenes/          → én JSON-fil per scene (tekst + valg)
│   ├── characters/      → én JSON-fil per elevkarakter
│   ├── tribes/           → én JSON-fil per stamme
│   └── game_state_template.json  → mal for lagret fremgang
└── assets/
    └── images/
        ├── characters/  → Midjourney-bilder av karakterene
        ├── map/          → verdenskart / regionkart
        └── villages/     → landsbybilder per stamme
```

Disse JSON-filene er kun referanse for databaseskjemaet i Supabase – de
brukes ikke direkte av spillet i produksjon. Hver mappe under `data/` har
en `_template.json` (tom mal) og en `_eksempel.json` (fylt ut, til å vise
hvordan feltene brukes). Det faktiske innholdet settes inn i
Supabase-tabellene `tribes`, `characters`, `scenes` (Table Editor eller
SQL) når elevenes ferdigskrevne tekster er klare – motoren er generisk og
krever ingen kodeendring for å legge til flere rader.

## Slik fylles det ut

- **Stamme** (`tribes/` → Supabase-tabellen `tribes`): navn, plassering på
  kartet, ressurs, kultur, forhold til andre stammer, hvilke karakterer som
  hører til, `population` (innbyggertall, vises i galleriet).
- **Karakter** (`characters/` → `characters`): navn, stamme,
  styrker/svakheter, mål, beskrivelse (brukes også som Midjourney-prompt),
  bildefil, `student_name` (eleven bak karakteren – vises i rulletekst).
- **Scene** (`scenes/` → `scenes`): tekst, hvilket bilde som vises, og
  valgene spilleren får – hvert valg peker på neste scene-id og kan sette
  "consequences" som senere scener kan lese av. `plot` er `'main'` for
  hovedhistorien, eller en stamme-id for en valgfri sidehistorie knyttet
  til den stammen (nås via et vanlig valg fra en hovedplott-scene).

## Bilder

Legg Midjourney-bildene i riktig undermappe under `assets/images/` (og
tilsvarende `public/assets/images/` for at nettsiden skal finne dem), med
filnavn som matcher `image`-feltet i JSON-filen/databaseraden (se
`LEGG_BILDER_HER.txt` i hver mappe). De samme bildene vises automatisk i
galleriet.

## Musikk

Legg lydfiler i `public/assets/audio/` – se
`public/assets/audio/LEGG_LYD_HER.txt` for filnavnkonvensjon
(`background.mp3`, `credits.mp3`, valgfritt `tribes/<tribe_id>.mp3`).
Kartlagerteamets navn og klassenavnet til avslutningslinjen i rulleteksten
fylles inn øverst i `public/js/credits.js` (`MAP_TEAM`, `CLASS_NAME`).

## Fremdriftsplan

Se [`docs/FREMDRIFTSPLAN.md`](docs/FREMDRIFTSPLAN.md) for hvordan prosjektet
er fordelt over 14 uker (uke 38–51), med høstferie og planleggingsdager
tatt hensyn til.

## Kompetansemål

Se [`docs/KOMPETANSEMAL_7TRINN.md`](docs/KOMPETANSEMAL_7TRINN.md) for
hvilke kompetansemål fra engelsk 7. trinn (LK20, ENG01-06) prosjektet
dekker, og hvor i arbeidet de dekkes.

## Oppdrag (brief-historikk)

Oppdragene som er gitt til Claude Code underveis ligger i
[`docs/briefs/`](docs/briefs/), i rekkefølge:

- [`01_initial_brief.md`](docs/briefs/01_initial_brief.md) – det
  opprinnelige oppdraget: bygg spillmotoren, koble på Feide og Supabase,
  deploy til Netlify.
