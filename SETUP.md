# Oppsett – Stammespillet spillmotor

## Arkitektur

```
public/                 → statisk nettsted (HTML/CSS/vanilla JS, ingen build-steg)
netlify/functions/      → serverless-funksjoner (Node), kjører kun server-side
supabase/                → (referanse) skjema finnes i Supabase-prosjektet "stammespillet"
```

- **Innhold** (`tribes`, `characters`, `scenes`) leses direkte fra nettleseren
  via Supabase sin offentlige (publishable) nøkkel. Radene er lesbare for
  alle (RLS-policy `for select using (true)`), men kan kun endres av
  service-role-nøkkelen (dvs. ikke fra nettsiden).
- **Fremgang** (`progress`) har **ingen** klient-tilgang – RLS er skrudd på
  uten policyer, så verken den offentlige nøkkelen eller en innlogget elev
  kan lese/skrive direkte fra nettleseren. All lesing/skriving går via
  `netlify/functions/progress.js`, som:
  1. Verifiserer elevens innloggingssesjon (signert cookie, satt av
     Feide-innloggingen)
  2. Bruker den hemmelige `SUPABASE_SERVICE_ROLE_KEY` server-side til å
     lese/skrive kun den ene raden som hører til elevens Feide-ID

## Miljøvariabler (settes i Netlify: Project configuration → Environment variables)

Netlify har egne verdier per «deploy context». Produksjonsnettstedet bruker
**Production**. Testadressen `https://test--stammespillet.netlify.app`
(`netlify deploy --alias test`) bruker **Branch deploys**, ikke Deploy Previews.
Hemmelige verdier (`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`FEIDE_CLIENT_SECRET`, `DEEPL_API_KEY`, `ADMIN_PASSWORD`) legges inn i
Netlify-grensesnittet med «Contains secret values» og limes aldri inn i chat
eller filer i repoet.

| Variabel | Påkrevd | Beskrivelse |
|---|---|---|
| `SUPABASE_URL` | Ja | `https://rdqodrcrfakgvgwkmejj.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Supabase → Project settings → API → `service_role` (hemmelig, aldri i frontend-kode) |
| `SESSION_SECRET` | Ja | Tilfeldig streng (min. 32 tegn) som signerer innloggingscookien. F.eks. `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Ja | Passord (min. 12 tegn) til `/admin.html`. Læreren kan i tillegg logge inn med Feide hvis brukeren er markert `is_admin` i tabellen `students` |
| `FEIDE_ISSUER` | For Feide | `https://auth.dataporten.no` |
| `FEIDE_CLIENT_ID` | For Feide | Klient-ID fra Feide Kundeportal (egen per konfigurasjon: Test og Produksjon) |
| `FEIDE_CLIENT_SECRET` | For Feide | Klienthemmelighet (en UUID) fra samme konfigurasjon |
| `FEIDE_REDIRECT_URI` | For Feide | Må være lik «Redirect URI til etter innlogging» i portalen, f.eks. `https://stammespillet.netlify.app/api/auth/callback`. Opprinnelsen (domenet) brukes også som adresse etter utlogging |
| `DEEPL_API_KEY` | For norsk skriving | DeepL-nøkkel. Nøkler som slutter på `:fx` bruker gratis-API. Uten nøkkel skjules språkvalget «Norsk» på Contribute-siden |
| `ALLOW_NAME_LOGIN` | Nei | Sett til `false` når alle elever logger inn med Feide. Da vises ikke navneskjemaet, og `/api/auth/name-login` svarer 403. Ellers på |
| `ENABLE_DEV_LOGIN` | Nei (kun testing) | `true` åpner `/dev-login.html`. **Skal stå `false` i produksjon** (er satt til `false` siden 2026-10-12) |

Nettleseren leser ikke databasen selv. All lesing og skriving går gjennom
Netlify-funksjonene (`/api/content`, `/api/submit`, `/api/draft`,
`/api/progress`, `/api/admin`) med tjenestenøkkelen, og tabellene er stengt for
den offentlige nøkkelen (`anon`). Eneste unntak er filopplasting til lagring,
som går via en engangs-URL fra serveren.

## Feide

Tjenesten «Stammespillet» er registrert i Feide Kundeportal (kunde.feide.no) som
OpenID Connect, konfidensiell klient, med scope `openid profile` og
attributtet `userinfo-name`. Vi bruker authorization code + PKCE (S256) og
henter navnet fra userinfo-endepunktet. Det finnes en konfigurasjon per miljø:

- **Test** (`https://test--stammespillet.netlify.app/api/auth/callback`, med
  testbrukere). Settes for Branch deploys og Deploy Previews.
- **Produksjon** (`https://stammespillet.netlify.app/api/auth/callback`).
  Settes for Production.

Slik slår du på Feide i produksjon:

1. Lag konfigurasjonen «Produksjon» i portalen (egen klient-ID og hemmelighet,
   redirect-URI og utloggings-URI `https://stammespillet.netlify.app/`,
   begrenset til Steinkjer kommune).
2. Sett `FEIDE_ISSUER`, `FEIDE_CLIENT_ID`, `FEIDE_CLIENT_SECRET` og
   `FEIDE_REDIRECT_URI` for **Production**.
3. Deploy på nytt (`npx netlify deploy --prod`) så funksjonene får verdiene.
   Knappen «Log in with Feide» dukker da opp av seg selv.
4. Prøv innlogging, utlogging og `/admin.html` med en ekte bruker.
5. Når alle elever kommer inn med Feide: sett `ALLOW_NAME_LOGIN=false` og
   deploy igjen.

Hva som lagres om en elev: Feide-ID (`sub`, lagres som `feide:<sub>`) og navn,
i tabellen `students`. Navnet vises bare for eleven selv («Logged in (…)») og for
læreren i admin. Det blir aldri sendt til andre elever, og nettleseren leser
aldri tabellen. Elevens tekster, utkast og spillfremdrift henger på samme ID.

Feil under innlogging vises som en kort kode, for eksempel
`(code: token_401_invalid_client)`. Koden inneholder aldri hemmeligheter eller
persondata. Detaljene står i funksjonsloggen i Netlify.

## Skjema og database

Alle endringer i databasen ligger som SQL i `supabase/migrations/` (de er
allerede kjørt mot prosjektet). Tabeller som bare funksjonene bruker
(`students`, `drafts`, `village_members`, `progress`, `settings`) har RLS på,
ingen policyer og ingen rettigheter for `anon`/`authenticated`.

- `students`: én rad per Feide-bruker (`user_id`, `display_name`, `is_admin`).
  Læreren gjøres til admin med `update public.students set is_admin = true where user_id = 'feide:…'`.
- `drafts`: usendt tekst fra Contribute-siden, per elev og innsending.
- `tribes`/`characters`: `charter` er svarene på engelsk, `charter_original` er
  elevens egen norske tekst hvis `source_lang = 'no'`. `submitted_by` er eieren.
- `village_members` og `tribes.join_code`: gruppekoden som lar flere elever
  skrive i samme landsby til læreren har godkjent den.

## Testing uten Feide (nå)

1. `npm install`
2. Sett minst `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`
   og `ENABLE_DEV_LOGIN=true` i en lokal `.env`-fil (se `.env.example`)
3. `npx netlify dev` – åpner siden lokalt med funksjonene kjørende
4. Siden sender deg til `/dev-login.html` siden `FEIDE_ISSUER` ikke er satt –
   skriv inn en vilkårlig test-id og logg inn
5. Velg karakter (eksempeldata: "Erik Nordmyr"), spill gjennom eksempelscenene,
   sjekk at "Stammeleksikon" viser stammen, lukk fanen og åpne siden på nytt
   for å bekrefte at fremgangen ble husket

## Deploy til Netlify

```bash
npx netlify init      # kobler mappen til et Netlify-nettsted (første gang)
npx netlify deploy --prod
```

Sett miljøvariablene over i Netlify-nettstedets innstillinger før første
produksjonsdeploy. Husk å be kommunen registrere den endelige
`https://<produksjonsdomene>/api/auth/callback` som redirect-URI hos
Feide-tjenesten.

## Innhold i produksjon

`data/`-mappen er kun referanse for skjemaet. Faktisk innhold (stammer,
karakterer, scener) settes inn i Supabase-tabellene `tribes`, `characters`,
`scenes` – enten via Supabase sitt Table Editor, eller via SQL/migrasjon når
elevenes ferdigskrevne tekster er klare. Motoren er generisk og krever ingen
kodeendring for å legge til flere stammer/karakterer/scener.

## Utskriftsark

Arkene til å skrive på papir ligger på `/ark.html` (`?ark=village`, `?ark=villager`, `?ark=shadow`). De leses fra `public/js/charters.js`, så de er alltid like skjemaene på nettsiden. Ingen innlogging trengs.
