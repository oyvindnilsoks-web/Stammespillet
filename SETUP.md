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

## Miljøvariabler (settes i Netlify: Site settings → Environment variables)

| Variabel | Påkrevd | Beskrivelse |
|---|---|---|
| `SUPABASE_URL` | Ja | `https://rdqodrcrfakgvgwkmejj.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Hentes fra Supabase-dashbordet → Project settings → API → `service_role` (hemmelig, aldri i frontend-kode) |
| `SESSION_SECRET` | Ja | Tilfeldig streng (min. 32 tegn) brukt til å signere innloggingscookien. Generer f.eks. med `openssl rand -base64 32` |
| `ENABLE_DEV_LOGIN` | Nei (kun testing) | Sett til `true` for å teste hele løpet uten ekte Feide. **Skal IKKE stå `true` i produksjon** når ekte elever bruker spillet |
| `FEIDE_ISSUER` | Når Feide er klar | OIDC issuer-URL fra kommunens Feide-tjeneste, f.eks. `https://feide.steinkjer.kommune.no` |
| `FEIDE_CLIENT_ID` | Når Feide er klar | Client-ID fra kommunen |
| `FEIDE_CLIENT_SECRET` | Når Feide er klar | Client-secret fra kommunen (hemmelig) |
| `FEIDE_REDIRECT_URI` | Valgfri | Overstyrer redirect-URI. Standard er `https://<produksjonsdomene>/api/auth/callback`, som må registreres hos kommunens Feide-tjeneste |

`SUPABASE_URL` og en offentlig nøkkel er allerede lagt inn direkte i
`public/js/config.js` – det er trygt fordi RLS beskytter innholdet (kun
lesetilgang, og ingen tilgang til `progress`).

## Slik kobler du på ekte Feide (når kommunen har satt opp tjenesten)

1. Be kommunen om: `issuer`-URL, `client_id`, `client_secret`, og bekreft
   redirect-URI-en de skal registrere: `https://<domene>/api/auth/callback`
2. Legg `FEIDE_ISSUER`, `FEIDE_CLIENT_ID`, `FEIDE_CLIENT_SECRET` inn som
   miljøvariabler i Netlify
3. Sett `ENABLE_DEV_LOGIN` til `false` (eller fjern variabelen)
4. Deploy på nytt (`netlify deploy --prod` eller push til hoved-branch)
5. Test hele løpet: "Logg inn med Feide" → velg karakter → spill → lukk
   fanen → åpne siden igjen → skal fortsette der du slapp

Motoren bruker standard OIDC discovery (`/.well-known/openid-configuration`)
og PKCE (authorization code + code_verifier), så den skal fungere mot enhver
spec-kompatibel Feide/Dataporten-tjeneste uten kodeendringer – kun
miljøvariablene over trengs.

Kun `sub`-claimen fra Feide sin id_token brukes (prefikset `feide:` og lagt i
en signert, httpOnly sesjonscookie). Ingen navn, fødselsdato, e-post eller
annen persondata hentes, vises eller lagres.

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
