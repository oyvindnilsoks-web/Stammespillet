# Oppdrag til Claude Code: bygg spillmotoren (nettbasert versjon)

Lim gjerne denne filen rett inn som første melding til Claude Code i dette
prosjektet.

## Om spillet

Et tekstbasert valgspill for 7. trinn, engelskfaget. Spilleren velger en
elevutviklet karakter tilhørende en stamme, og tar seg gjennom scener med
valg som styrer fremgangen. Tekstbasert, med karakterbilder og innimellom
kart/landsbybilder generert i Midjourney. Lore, stammer og karakterer er
utviklet av elevene. Spillteksten skrives på engelsk av elevene, som ledd i
engelskfaget (se `KOMPETANSEMAL_7TRINN.md`).

## Teknisk plattform

- **Frontend:** nettside (HTML/CSS/JS, evt. enkelt rammeverk), hostet på
  **Netlify**.
- **Innlogging:** **Feide** (OIDC/Dataporten) via en intern Feide-tjeneste
  Steinkjer kommune selv setter opp og drifter (kommunen er både
  tjenestetilbyder og bruker) – brukes kun til å identifisere eleven og lagre
  fremgang. Ingen eksterne registreres, og ingen andre persondata skal
  lagres.
- **Lagring:** **Supabase** (Postgres) – innhold (scener/karakterer/stammer)
  og elevenes fremgang.
- Spillet skal IKKE pakkes som exe – dette er droppet til fordel for
  nettbasert løsning.

## Hva som allerede finnes i prosjektet

- `data/scenes/`, `data/characters/`, `data/tribes/` – JSON-filer med
  innhold (tomme maler + utfylt eksempel i hver mappe). Disse brukes som
  referanse for databaseskjemaet i Supabase, ikke som spillets faktiske
  datakilde i produksjon.
- `data/game_state_template.json` – felter til `progress`-tabellen i
  Supabase.
- `assets/images/characters|map|villages/` – mapper for Midjourney-bilder
  (lastes til Supabase Storage eller legges i nettsidens assets ved deploy).
- `KOMPETANSEMAL_7TRINN.md` – hvilke kompetansemål fra engelsk 7. trinn
  spillet og skriveprosessen dekker.

## Hva du skal bygge nå

1. **Supabase-oppsett:**
   - Tabeller: `scenes`, `characters`, `tribes`, `progress` (speiler feltene
     i JSON-malene/`game_state_template.json`).
   - `progress`-tabellen kobles til elevens Feide-ID (unik identifikator,
     ikke navn/fødselsdato).
2. **Feide-innlogging:**
   - Steinkjer kommune setter opp en egen intern Feide-tjeneste og er selv
     både tjenestetilbyder og bruker – ingen eksterne skal registreres. Dette
     ordnes internt av kommunen (ikke noe Claude Code trenger å registrere
     eller søke om).
   - Når kommunen har opprettet tjenesten og gitt deg client-ID/secret og
     redirect-URL, kobler du appen til denne via standard OIDC-flyt.
   - Ved innlogging: hent kun en unik elev-ID, ikke annen persondata.
3. **Spillmotor (nettside):**
   - Leser scene-, karakter- og stamme-data fra Supabase.
   - Viser tekst + bilde, valgknapper basert på `choices[]`, går til
     `next_scene` ved klikk.
   - Lagrer/laster fremgang til/fra Supabase, koblet til innlogget elev.
   - Enkel "stammeleksikon"-visning (stammer/karakterer fra Supabase).
4. Motoren skal virke generisk for et vilkårlig antall scene/karakter/
   stamme-rader – ikke hardkod innholdet fra eksempelfilene.
5. **Deploy til Netlify:**
   - Sett opp bygg og deploy (Netlify CLI eller Netlify MCP).
   - Sørg for at Feide-redirect-URL-er er riktig satt opp for
     produksjonsdomenet (avtales med kommunens interne Feide-tjeneste).
6. Test hele løpet i nettleser: innlogging → spilling → lagret fremgang →
   gjenåpning fortsetter riktig sted.

## Ikke gjør ennå

- Skriv ikke det faktiske spillinnholdet (scener/tekst) – det kommer etter at
  elevenes materiale er samlet inn og skrevet på engelsk. Bruk kun
  eksempelfilene til å teste at motoren virker.
- Ikke bygg exe/Electron-pakking – det er ikke lenger målet.
