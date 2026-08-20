# Lore-bibel: Utviskingen

Rammeverk for verdenen, klanene, hovedplottet og forgreiningene i
Stammespillet. Dette dokumentet er **lærerens skjelett** – det bestemmer
rammen, ikke detaljene. Elevene fyller inn navn, personligheter, dialoger og
scenetekst innenfor denne rammen.

Klanene har med vilje **ingen egennavn** her. De omtales etter hvor de bor og
hva de lever av. Navngiving er en av de første oppgavene elevene kan få –
da eier de det selv, samtidig som strukturen holder.

> **Merk om språk:** Selve spillteksten skal skrives på **engelsk** av elevene
> (se `KOMPETANSEMAL_7TRINN.md`). Dette dokumentet er på norsk fordi det er
> planleggingsverktøyet ditt. Nederst finner du en engelsk ordliste med de
> faste begrepene, slik at alle elevgruppene bruker de samme engelske ordene
> i spillet.

---

## 1. Verdenspremiss – kort

Verden blir mindre.

Ikke ødelagt slik en brann ødelegger, ikke oversvømt slik et flomvann tar.
Den blir **utvisket**. En dal som lå der i går ligger ikke der i dag, og det
finnes ingen ruiner, ingen aske, ingen grav – bare en flate uten farge, uten
lyd, uten lukt. Det som er verre: de som så det skje, husker det sjelden
etterpå. En mann kommer hjem fra jakt og finner at han ikke lenger vet hvor
han vokste opp. En kvinne synger en sang med et hull midt i.

Kraften har mange navn, men de fleste kaller den bare **Utviskingen**. Der
den har vært, kalles landet **Det Hvite**.

Fem klaner lever på det som er igjen. De er ikke venner. To av dem har en
gammel blodstrid, to andre har en avtale de begge mistenker den andre for å
bryte, og den femte snakker knapt med noen. De har alle mistet noe, og de
klandrer hverandre for det.

Og hver av de fem sitter – uten å vite det – på en femtedel av svaret.

---

## 2. Utviskingen: hvordan den fungerer

At kraften har *regler* er viktig. Uten regler blir det umulig for elevene å
skrive scener der valg betyr noe. Disse fem reglene er faste:

**Regel 1: Den tar tingen og minnet om tingen.**
Når et sted utviskes, forsvinner både stedet og det meste av det folk husket
om det. Derfor er verden full av mennesker som går rundt med hull i seg og
ikke vet det. Kart stemmer ikke. Slektstrær har grener som ender i ingenting.

**Regel 2: Det som er tungt husket, står imot.**
En gjenstand som mange mennesker husker sterkt nok, holder stand i kanten av
Det Hvite. Et sverd ingen har tenkt på i hundre år forsvinner. En sang alle
synger hver eneste vinter, gjør det ikke. Slike gjenstander kalles **ankre**.

**Regel 3: Den beveger seg mot kraft, ikke mot mennesker.**
Utviskingen søker steder der den gamle kraften – **Veven** – ligger tykt.
Byer, helligdommer, gruver. Dette er grunnen til at det nettopp er klanenes
viktigste steder som ryker først, og hvorfor folk tror kraften hater dem.
Den gjør ikke det. Den bryr seg ikke om dem i det hele tatt.

**Regel 4: Den har ikke hastverk.**
Utviskingen har holdt på i tre generasjoner. Den tar en dal, så ingenting på
et år, så en hel fjellside på en natt. Dette er hvorfor folk har rukket å
venne seg til den, og hvorfor de fleste tror den er et vær og ikke en vilje.

**Regel 5: Den kan forhandles med – men bare av dem som forstår hva den vil.**
Dette er hemmeligheten spillet handler om. Se punkt 4.

---

## 3. Verden før: Veven og det ene folket

Dette vet ingen i utgangspunktet. Det er sannheten spilleren graver fram
gjennom hele spillet, i biter, fra fem forskjellige kilder som hver har en
del av den – og som alle tar delvis feil.

For lenge siden var de fem klanene **ett folk**. De bodde tettere, de bygget
større, og de hadde noe de kalte **Veven** – en kraft i verden som lot dem
strekke ting lenger enn de burde nå. De fikk korn til å vokse i stein. De
holdt en by oppe som var for tung for grunnen den sto på. De fikk en elv til
å renne oppover.

De trodde de brukte Veven. De **lånte** av den.

Alt som ble bygget med Veven ble bygget på kreditt, og prisen var ikke gull.
Prisen var **det som var der fra før**: en fjellside her, en innsjø der, et
minne, et navn, en slekt. Små beløp. Ingen merket det på flere hundre år.

Så ble lånet for stort, og verden begynte å kreve inn.

Utviskingen er ikke en fiende. Den er ikke ond, den er ikke sint, den vil
ikke noe med menneskene. **Den er en regning.**

Det ene folket forsto dette da det var for sent å betale. De gjorde det
eneste de rakk: de delte den opprinnelige avtalen – bindingen mellom folket
og Veven – i fem deler, og ga én til hver gruppe. Så spredte de seg til fem
forskjellige landskap, så langt fra hverandre som de kom, slik at ingen
enkelt person skulle kunne bruke hele avtalen alene.

Og for at ingen skulle friste seg til å prøve, sørget de for at de fem
gruppene skulle **mislike hverandre**.

Det virket. Det har virket i tre hundre år. Klanene hater hverandre helt
utmerket, og ingen av dem husker hvorfor.

---

## 4. Kartet

Verden som er igjen er omtrent på størrelse med et lite land. Rundt kantene,
og i en voksende flekk i sørøst, ligger Det Hvite.

Bruk gjerne et rutenett på 1000 × 1000 for `territory.map_x` / `map_y` i
`tribes`-tabellen, slik eksempeldataene gjør.

```
        NORD
   ┌─────────────────────────────────────────────┐
   │  ▲▲▲ HØYLANDET (180,180)                    │
   │  ▲ fjellklanen                              │
   │   ▲▲                    ╬ VEIKRYSSET        │
   │     ▲▲                    (700,250)         │
   │       ╲                   handelsklanen     │
 V │        ╲ Den døde elva                      │ Ø
 E │         ╲                                   │ S
 S │          ▓▓▓ BYEN (520,400)                 │ T
 T │          ▓ byklanen                         │
   │                              ♣♣♣ SKOGEN     │
   │      ≈≈≈ DELTAET               (760,700)    │
   │      ≈ vannklanen              skogklanen   │
   │        (300,620)                  ░░░░      │
   │                                 ░░ DET ░░   │
   │                                ░░ HVITE ░░  │
   └─────────────────────────────────────────────┘
        SØR
```

Fire ting kartet må formidle:

- **Den døde elva** renner fra Høylandet ned mot Deltaet – eller gjorde det.
  Fjellklanen demmet den opp for to generasjoner siden. Deltaet tørker.
  Dette er blodstriden.
- **Byen ligger i midten.** Alle veier går gjennom den, og byklanen tar betalt
  for det. Dette er den andre konflikten.
- **Skogen ligger nærmest Det Hvite.** Skogklanen bor nærmere Utviskingen enn
  noen andre – og overlever. Ingen vet hvordan. Alle vil vite.
- **Handelsklanen har ingen farge på kartet.** De har et veikryss med en
  stasjon, men det er ikke deres land. Ingenting er deres land.

---

## 5. De fem klanene

Hver klan er bygget etter samme mal, slik at elevgruppene får sammenlignbare
oppgaver: **et landskap, en ressurs, en måte å huske på, en styrke, en
svakhet, en indre konflikt, og et anker.**

Legg spesielt merke til *måten å huske på*. Det er den viktigste
designideen i hele verdenen: alle fem klanene bevarer fortiden, men på fem
helt ulike måter, og hver måte har gjort dem til den de er.

---

### 5.1 Fjellklanen – de som hugger (`tribe_fjell`)

**Landskap:** Høyplatåer og bratte daler, over tregrensa. Bor inne i
fjellet: haller sprengt og hugget ut av stein, ganger som går nedover i
generasjoner. Kaldt, tørt, trygt.

**Ressurs:** Malm, stein – og **dybde**. De kan gå lenger ned enn noen andre
kan gå noe sted, og de tror, uten bevis, at Utviskingen ikke rekker helt ned.

**Måte å huske på: de hugger det i stein.** Alt av betydning blir meislet inn
i veggene. Arkivet deres er selve fjellet, kilometervis av det. En
fjellklan-begravelse er ikke en grav, det er en innskrift. Konsekvensen er at
de husker uvanlig godt – og at de er ute av stand til å endre en historie når
den først står i stein.

**Styrke:** Ankeret deres er det eldste av de fem, og det står nedgravd i noe
Utviskingen så langt ikke har turt å ta.

**Svakhet:** Trege, sta, mistenksomme mot alt utenfra. Og: **de demmet opp
elva.** De gjorde det for å drive gruvene sine, de vet at det tørket ut
Deltaet, og de har aldri sagt unnskyld – fordi en unnskyldning ville måtte
hugges i stein, og da ville den stå der for alltid.

**Indre konflikt:** De unge vil åpne **den dypeste sjakten** igjen. Den ble
forseglet for hundre år siden, og innskriften som forklarer hvorfor, er den
eneste i hele fjellet som er slipt bort. De eldste forbyr det og vil ikke si
hvorfor. (De vet ikke hvorfor. De husker bare at de skal si nei.)

**Anker: Den første steinen.** En hugget helle som er eldre enn klanen, med
et språk ingen lenger leser.

---

### 5.2 Vannklanen – de som synger (`tribe_vann`)

**Landskap:** Et delta der elva møter havet, eller gjorde det. Landsbyen er
båter surret sammen til en flytende by, og kan flyttes på en natt. Nå ligger
halvparten av båtene på tørr leire.

**Ressurs:** Fisk, salt, og **veiene over vann**. Så lenge det finnes vann,
kommer de fram dit ingen andre kommer.

**Måte å huske på: de synger det.** Ingenting skrives ned. De navngir de
døde, de tapte stedene og de gamle avtalene i sanger som synges hver vinter,
i kor, av alle. Konsekvensen er at minnene deres er levende og fleksible –
de endrer seg litt for hver generasjon, akkurat som en sang gjør – og at et
minne dør i samme øyeblikk som den siste som kan verset, dør.

**Styrke:** Bevegelige. Når Utviskingen kommer, er de den eneste klanen som
bare kan dra.

**Svakhet:** Hjemmet deres holder på å tørke ut, og de vet nøyaktig hvem sin
skyld det er. De er sinte, de har vært sinte i to generasjoner, og sinnet er
nå en del av identiteten deres.

**Indre konflikt:** Bli og kjempe for Deltaet, eller slippe taket og bli et
folk som bare bor på havet? De gamle vil bli. De unge peker på leirbunnen og
spør hva de egentlig blir for.

**Anker: Den lange sangen.** En sang så gammel at ingen levende kan hele.
Hver familie kan sin del. Ingen har noen gang sunget den sammen, fordi
familiene ikke er på talefot.

---

### 5.3 Byklanen – de som skriver (`tribe_by`)

**Landskap:** Den eneste byen som er igjen, bygget oppå og inni ruinene av
noe mye større. Halvparten av bygningene er tomme. De bruker steiner fra den
gamle byen til å lappe den nye.

**Ressurs:** Kunnskap, lov, organisasjon – og **infrastruktur**. Veier, broer,
lager, en fungerende skriftkultur. Alle veier går gjennom byen, og byklanen
tar toll.

**Måte å huske på: de arkiverer det.** Et enormt papirarkiv, tusenvis av
hyller, et helt embetsverk av arkivarer med rang og tittel. Konsekvensen er
at de husker mer detaljert enn noen andre – og at et minne hos dem kan
**forfalskes**, noe ingen av de andre fire klanenes metoder tillater.

**Styrke:** Flest folk, best organisert, og de har kartet over verden.

**Svakhet:** Arkivet har hull. Utviskingen har spist deler av det, akkurat som
alt annet. Og ledelsen har begynt å **fylle hullene med oppdiktede oppføringer**
for at ingen skal få panikk. Byklanens stolthet hviler nå på papir som lyver.

**Indre konflikt:** De yngre arkivarene har oppdaget forfalskningene. De vet
ikke om de skal avsløre sine egne, eller om løgnen faktisk er det eneste som
holder byen rolig.

**Anker: Det sanne kartet.** Det siste ærlige kartet over verden før den
begynte å krympe. Det viser steder som ikke finnes lenger – og som ingen
lenger husker at har funnes.

---

### 5.4 Handelsklanen – de som skylder (`tribe_handel`)

**Landskap:** Ingen. Veier, karavaner, vertshus i veikryss. De eier
stasjonen ved veikrysset, men de kaller den ikke hjem.

**Ressurs:** Varer, offisielt. I virkeligheten **informasjon og passasje**. De
er de eneste som snakker med alle fem klanene, fordi de er de eneste alle
fem trenger.

**Måte å huske på: de fører regnskap.** Hver tjeneste, hvert løfte, hver
opplysning blir ført inn i en bok med dato og motpart. Ingenting er gratis,
ikke engang mellom søsken. Konsekvensen er at de har den mest presise
oversikten over hva som faktisk har skjedd mellom klanene – og at de er ute
av stand til å gi noe bort uten å notere det.

**Styrke:** De kommer inn overalt. De vet hvem som hater hvem og nøyaktig
hvor mye.

**Svakhet:** Ingen stoler på dem. De har tjent penger på tre generasjoners
sammenbrudd, og alle vet det. Når det blir knapt, er de de første som får
skylda.

**Indre konflikt:** En gammel gjeld forfaller – en så stor at den vil ruinere
klanen. En fraksjon vil betale den ved å selge det eneste de har som er verdt
nok: **stedet der skogklanen holder hemmeligheten sin.**

**Anker: Boken over ubetalte gjeld.** Den eldste hovedboken. Helt bakerst,
på den første siden, står det en oppføring med en skyldner som ikke er en
person, og et beløp som ikke er et tall.

---

### 5.5 Skogklanen – de som glemmer (`tribe_skog`)

**Landskap:** Dyp, gammel skog helt inntil kanten av Det Hvite. Ingen
permanente bygg. Leire som flyttes, stier som gros igjen med vilje.

**Ressurs:** Urter, medisin, jakt – og **nærhet**. De bor nærmere Utviskingen
enn noe annet menneske, og de dør ikke av det. De andre fire klanene vil
desperat vite hvorfor.

**Måte å huske på: de glemmer med vilje.** Dette er kjernen deres. De tror –
og de har delvis rett – at Utviskingen trekkes mot det som holdes fast. Så de
har gjort seg selv lette. De navngir ikke steder. De forteller ikke
slektshistorier. En gang i året går de gjennom en seremoni der de legger ned
et minne og går fra det.

**Styrke:** De forstår kraften bedre enn noen andre, av ren erfaring.

**Svakhet:** De har glemt så mye at de har mistet seg selv. De vet ikke lenger
hvor de kom fra eller hvorfor de begynte med dette. De er få, og de blir
færre, og de kan ikke lenger huske om de alltid har vært så få.

**Indre konflikt:** En gruppe unge vil **begynne å huske igjen**. De er lei av
å være et folk uten fortid. De eldste sier at det vil drepe dem alle. Ingen
kan bevise noe, fordi beviset er glemt.

**Anker: Det tomme navnet.** Navnet på det aller første som ble tatt. De
lærte seg det bort med vilje – ikke fordi det var farlig å vite, men fordi
det gjorde for vondt. Det finnes fortsatt, som et hull med akkurat riktig
fasong.

---

## 6. Konfliktene – fire nivåer

Spillet skal ha konflikt på flere plan samtidig. Det gjør at et valg kan
løse noe på ett nivå og gjøre vondt verre på et annet – som er nettopp det
som gjør et valgspill interessant.

**Nivå 1 – inni klanen (generasjon).**
Alle fem klanene har den samme grunnkonflikten i ulik form: *de unge vil
endre noe, de eldste forbyr det, og de eldste har glemt begrunnelsen.* Dette
er spillerens nærmeste konflikt, og den elevene kjenner seg best igjen i.

**Nivå 2 – mellom to klaner (blodstriden).**
**Fjell mot vann.** Demningen. Konkret, gammel, personlig, uløst. Begge sider
har rett: fjellklanen ville dødd uten gruvene, vannklanen dør på grunn av
dem.

**Nivå 3 – mellom allianser (blokkene).**
- **Fjell + by** er i allianse. Gammel pakt: stein og malm den ene veien,
  korn, lov og beskyttelse den andre. De liker ikke hverandre, men de trenger
  hverandre, og begge er redde for å bli stående alene.
- **Vann + handel** er i allianse. Rent praktisk: vannklanen frakter,
  handelsklanen selger. Begge mistenker den andre for å skumme fløten, og
  begge har rett.
- **Skogklanen står utenfor.** Begge blokkene frir til dem, fordi begge tror
  skogklanen sitter på overlevelsens hemmelighet. Det gjør de også.

**Nivå 4 – alle mot Utviskingen.**
Som ingen av dem forstår, og som ingen av dem kan gjøre noe med alene. Dette
nivået finnes fra første scene, men spilleren – og klanene – ser det ikke før
sent.

> **Poenget med strukturen:** Spilleren kan ikke løse nivå 4 uten å ha gjort
> noe med nivå 2 og 3. Og hvert forsøk på å løse nivå 2 og 3 koster noe på
> nivå 1. Det er hele spillet.

---

## 7. Ankrene og fragmentene

De fem ankrene er ikke fem nøkler til fem låser. De er **fem femtedeler av én
avtale**, skrevet ned på fem uforenlige måter – i stein, i sang, på kart, i
regnskap og i et bevisst tomrom.

Dette er sentralt, både narrativt og pedagogisk: **de fem klanene kan ikke
løse dette hver for seg, fordi ingen av dem kan lese de andres metode.**
Fjellklanen kan ikke synge. Vannklanen skriver ikke. Skogklanen har med vilje
glemt. De må sitte i samme rom og stole på hverandre – noe de har brukt tre
hundre år på ikke å gjøre.

I spillet samler spilleren **fragmenter** (bruk flagget `fragmenter`, 0–5).
Hvert fragment gir én bit av sannheten. Hvor mange fragmenter spilleren har
med seg inn i siste akt, bestemmer hvilke slutter som er tilgjengelige.

---

## 8. Hovedplottstruktur

Fem akter. Scenene i hovedhandlingen får `plot = "main"` i `scenes`-tabellen.
Sideplottene får `plot = "<tribe_id>"`.

### Akt 1 – Sprekken

Spilleren er hjemme i sin egen klan. En kort, konkret hverdagsscene som
etablerer karakteren, klanen og livet – og så skjer det: **noe rett i
nærheten blir utvisket.** Ikke hele landsbyen. En låve, en båt, en gang, en
stemme i koret som plutselig ikke er der.

Spilleren ser det. Det gjør ingen andre.

> **Forgreiningspunkt A – Hva gjør du med det du så?**
> - **Fortell det til de eldste.** → Du blir trodd, men de bagatelliserer det.
>   Du får autoritet, men også en ordre om å tie. `mot +1`
> - **Hold det for deg selv og undersøk alene.** → Du får et forsprang og en
>   ledetråd ingen andre har. `list +1`
> - **Fortell det til noen på din egen alder.** → Du får en alliert som følger
>   deg gjennom hele spillet. `tillit_<egen klan> +1`

Akt 1 er kort. Alle tre veier fører videre til akt 2 – men de gir spilleren
ulikt utgangspunkt, og elevene kan skrive små forskjeller inn i senere scener
basert på flaggene.

### Akt 2 – Utsendingen

Klanen sender spilleren ut. Grunnen varierer med klan (fjellklanen sender en
budbringer, vannklanen sender en forhandler, byklanen sender en arkivar,
handelsklanen sender en kremmer, skogklanen sender noen de kan avse).

Dette er første gang spilleren møter en annen klan, og første gang hen
oppdager at de andres versjon av historien ikke stemmer med hens egen.

> **Forgreiningspunkt B – Hvilken blokk oppsøker du først?**
> - **Fjell + by** → Du får tilgang til Det sanne kartet tidlig, som gjør
>   resten av reisen lettere. Men vann + handel blir mistenksomme.
>   `tillit_fjell +1`, `tillit_by +1`, `tillit_vann −1`
> - **Vann + handel** → Du får vite hvor de andre ankrene er, mye tidligere.
>   Men du blir stemplet som illojal av fjell + by.
>   `tillit_vann +1`, `tillit_handel +1`, `tillit_fjell −1`

> **Forgreiningspunkt C – Skogklanen.**
> Før eller siden må spilleren til skogen. Der får hen vite hva
> skogklanen faktisk gjør – og at handelsklanen er i ferd med å selge det.
> - **Advar skogklanen.** → De åpner seg for deg. `tillit_skog +2`,
>   `tillit_handel −2`
> - **Si ingenting.** → Du beholder handelsklanens vennskap og et
>   forhandlingskort. `list +1`
> - **Advar dem, men be om Det tomme navnet som betaling.** → Du får
>   fragmentet, men de vet nå hva du er. `fragmenter +1`, `tillit_skog −1`

### Akt 3 – Ankrene

Den lengste akten, og den som tåler mest elevinnhold. Spilleren reiser mellom
klanene og prøver å få tak i ankrene. Hvert anker krever at spilleren gjør
noe for klanen som eier det – og det er her **sideplottene henger på**
(se punkt 9).

> **Forgreiningspunkt D – Blodstriden.**
> For å få både fjellklanens og vannklanens anker, må spilleren forholde seg
> til demningen.
> - **Megle.** Vanskeligst. Krever `tillit_fjell` og `tillit_vann` over et
>   visst nivå. Gir begge ankrene og åpner den beste slutten.
> - **Velg side.** Enklest. Gir det ene ankeret og lukker det andre.
> - **Utnytt striden.** Du spiller dem mot hverandre og stjeler ankeret i
>   forvirringen. Gir ankeret raskt, men `tillit` faller hos begge, og det får
>   følger i akt 5.

### Akt 4 – Samlingen

Spilleren har (noen av) fragmentene og forstår nå sannheten: Utviskingen er
en regning, klanene var ett folk, og delingen var med vilje.

Nå skal hen få fem klaner som har hatet hverandre i tre hundre år, til å
møtes.

> **Forgreiningspunkt E – Hvem forteller du sannheten til?**
> - **Alle, åpent.** → Kaos, men ærlig. Noen klaner nekter å tro deg.
>   Hvilke, avhenger av `tillit`-flaggene.
> - **Bare de du stoler på.** → Du beholder kontrollen, men bygger møtet på
>   en utelatelse – og det kommer fram i akt 5.
> - **Ingen. Du prøver å gjøre det alene.** → Fører mot de mørkere sluttene.

### Akt 5 – Valget

Se punkt 10.

---

## 9. Sideplott

Ett per klan, `plot = "<tribe_id>"`. Hvert sideplott er en selvstendig liten
historie som **gir ett fragment og utdyper klanen**, men som spilleren kan
hoppe over.

> **Viktig teknisk regel:** Motoren krever at spilleren skal kunne nå en
> `is_ending`-scene **uten** å ha vært innom noe sideplott. Sideplottene skal
> derfor aldri stenge hovedveien – de skal berike den, og åpne de beste
> sluttene. Dette er allerede bygget inn i `findEntryScene`, som kun regner
> med `plot = "main"`-scener.

**Fjellklanen – Den dypeste sjakten.**
De unge åpner sjakten uansett hva de eldste sier. Nede i mørket står det en
innskrift i en håndskrift som er identisk med spillerens egen. Den er
tusen år gammel.

**Vannklanen – Skipet som kom tilbake.**
En båt som forsvant for tretti år siden legger til kai. Mannskapet er
uendret, samme alder, og de kjenner igjen folk som er blitt gamle. De har
seilt gjennom Det Hvite og kommet ut igjen – men de kan ikke huske en eneste
ting fra turen, og en av dem mangler navn.

**Byklanen – Arkivaren som løy.**
Spilleren oppdager forfalskningene. Sporet leder oppover i systemet, og
stopper hos noen spilleren har grunn til å beskytte. Valget er om løgnen skal
ut i lyset midt under en krise.

**Handelsklanen – Ruten som ikke fører noe sted.**
En gammel handelsrute i hovedboken går til et sted som ikke finnes. Følger
spilleren den, kommer hen til kanten av Det Hvite – og møter noen som
fortsatt driver et vertshus der, for kunder som ikke lenger finnes.

**Skogklanen – Barnet som ikke ble født.**
En kvinne i skogklanen sørger over et barn. Ingen andre husker at hun noen
gang var gravid. Hun husker det ikke selv – hun vet det bare. Dette er
sideplottet som mest direkte forklarer hva Utviskingen gjør med mennesker,
og det bør skrives med omtanke.

---

## 10. Sluttene

Fem slutter (`is_ending = true`). Hvilke som er tilgjengelige, styres av
`fragmenter`, `sannhet` og `tillit`-flaggene.

**1. Gjenoppbyggingen** *(krever 5 fragmenter og høy tillit hos minst 4 klaner)*
De fem ankrene leses sammen, og avtalen kan skrives om. Verden reddes – men
regningen må betales med noe. Spilleren velger hva som skal gis bort og
glemmes for alltid. Den beste slutten, og den dyreste.

**2. Delingen** *(krever 3–4 fragmenter og at klanene faktisk møttes)*
Regningen betales ikke i sin helhet, men fordeles på fem. Alle fem klanene
gir fra seg noe – litt land, litt historie, litt av seg selv. Verden blir
mindre og fattigere, men den blir stående, og for første gang på tre hundre
år står de fem sammen.

**3. Trossen** *(alltid tilgjengelig)*
Spilleren nekter. Ingen avtale, ingen betaling. Klanene graver seg ned og
møter Utviskingen med det de har. Ingen løsning – men et folk som velger å
møte slutten stående. Denne slutten skal alltid være mulig å nå, uansett hvor
lite spilleren har fått til.

**4. Frøet** *(alltid tilgjengelig)*
Spilleren aksepterer at verden er tapt, og bruker det hen har til å bevare
én ting gjennom det som kommer – et anker, en sang, et barn, et navn.
Verden ender. Noe overlever. Bittersøt.

**5. Kravet** *(krever 5 fragmenter og lav tillit)*
Spilleren tar hele avtalen for seg selv, eller for sin egen klan. Veven kan
brukes igjen – av én. Verden slutter å krympe. Nå er det spilleren som
sender regningen. Den mørke slutten, og den skal føles ubehagelig, ikke
kul.

---

## 11. Teknisk: flagg og konsekvenser

Foreslåtte nøkler i `consequences`-objektet på hvert valg, som lagres i
`progress.flags`:

| Flagg | Betydning |
|---|---|
| `mot` | Motige, direkte valg |
| `list` | Listige, indirekte valg |
| `visdom` | Valg der spilleren lytter eller undersøker |
| `tillit_fjell` | Fjellklanens tillit |
| `tillit_vann` | Vannklanens tillit |
| `tillit_by` | Byklanens tillit |
| `tillit_handel` | Handelsklanens tillit |
| `tillit_skog` | Skogklanens tillit |
| `fragmenter` | Antall innsamlede fragmenter (0–5) |
| `sannhet` | Hvor mye av sannheten spilleren kjenner (0–3) |

Eksempel på et valg slik det ser ut i `scenes.choices`:

```json
{
  "text": "Warn the forest clan about the deal",
  "next_scene": "scene_skog_012",
  "consequences": { "tillit_skog": 2, "tillit_handel": -2, "mot": 1 }
}
```

Motoren legger sammen tallene per nøkkel. Negative tall trekker fra. Elevene
trenger bare å forstå «dette valget gir +1 mot og −2 tillit hos
handelsklanen» – resten håndterer motoren.

---

## 12. Engelsk ordliste

Spillteksten skrives på engelsk. For at fem elevgrupper skal skrive samme
verden, må de bruke samme engelske begreper. Denne lista er fast:

| Norsk | Engelsk (bruk denne i spillet) |
|---|---|
| Utviskingen | **the Unmaking** |
| Det Hvite | **the Blank** |
| Veven | **the Weave** |
| anker / ankre | **anchor / anchors** |
| fragment | **fragment** |
| Fjellklanen | **the Mountain Clan** |
| Vannklanen | **the Water Clan** |
| Byklanen | **the City Clan** |
| Handelsklanen | **the Trader Clan** |
| Skogklanen | **the Forest Clan** |
| Den første steinen | **the First Stone** |
| Den lange sangen | **the Long Song** |
| Det sanne kartet | **the True Map** |
| Boken over ubetalte gjeld | **the Ledger of Unpaid Debts** |
| Det tomme navnet | **the Empty Name** |
| Den døde elva | **the Dead River** |

Når elevene gir klanene egne navn, erstatter navnet ordet «Clan» – f.eks.
«the Stoneborn» i stedet for «the Mountain Clan». Behold da en fast engelsk
form gjennom hele spillet.

---

## 13. Slik bruker du dette med elevene

**Det du har bestemt (ikke opp til diskusjon):**
Utviskingen og de fem reglene, at klanene var ett folk, de fem ankrene og de
fem måtene å huske på, kartet med demningen og blokkene, aktstrukturen og de
fem sluttene.

**Det elevene bestemmer:**
Klanens navn, utseende, klær, mat, skikker, seremonier, ordtak, arkitektur.
Alle karakterene. All dialog. Alle sceneteksten. Detaljene i sideplottet
sitt. Hvordan konfliktene faktisk føles innenfra.

Det er langt mer enn nok kreativ frihet – og fordi rammen står, vil de fem
gruppenes arbeid faktisk passe sammen når det settes inn i Supabase.

**Forslag til rekkefølge:**
1. Les verdenspremisset (punkt 1–2) høyt for hele klassen. Ikke røp punkt 3.
2. Del i fem grupper. Hver gruppe trekker en klan.
3. Gruppene navngir klanen sin og fyller ut stammeskjemaet (`forms/`).
4. Hver elev lager sin karakter innenfor klanen.
5. **Først nå** røper du sannheten i punkt 3 for klassen samlet. Reaksjonen
   der er halve poenget med opplegget.
6. Gruppene skriver sitt sideplott og sin del av hovedplottet – på engelsk.

**Et råd:** Hold igjen på punkt 3. At de fem gruppene sitter og bygger opp
gjensidig fiendskap i to uker, og så får vite at de alltid har vært det samme
folket, er en langt sterkere opplevelse enn å vite det fra dag én. Det er
også den enkleste veien inn i refleksjonssamtalen om identitet og kulturell
tilhørighet (kompetansemål 16).
