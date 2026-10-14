// Hjelp-knappen (?) nederst til venstre på alle sider: elevguide, lærerveiledning og
// om prosjektet. Teksten er vanlig HTML og ligger her i filen. Ingenting hentes fra
// serveren, så knappen virker også før innlogging.

const STUDENT = `
<p class="help-lede">Du skriver på siden som heter <strong>Bidra</strong> (Contribute på engelsk). Gjør ett steg om gangen.</p>
<ol class="help-steps">
  <li><h4>Åpne spillet og logg inn</h4>
    <p>Trykk <span class="k">Log in with Feide</span> og logg inn med skolebrukeren din. Første gang kommer du til en side som heter <em>About the world</em>: trykk <span class="k">Continue to the game</span>. Sier læreren at du skal skrive navnet ditt i stedet, skriver du fornavnet og første bokstav i etternavnet, likt hver gang.</p></li>
  <li><h4>Sjekk navnet og velg språk</h4>
    <p>Øverst står det <strong>Logged in</strong> og ditt eget navn. Står det et annet navn, trykk <span class="k">Log out</span> og logg inn på nytt. Øverst til høyre på Bidra-siden velger du <span class="k">Norsk</span> (du skriver på norsk, og svarene oversettes til engelsk) eller <span class="k">English</span>.</p></li>
  <li><h4>Start landsbyen <span class="tag">Én i gruppa</span></h4>
    <p>Én i gruppa starter landsbyen og får gruppekoden. Trykk fanen <span class="k">Landsbyen vår</span>, velg <strong>Vanlig landsby</strong> (eller <strong>Skyggelandsby</strong> hvis dere er den onde landsbyen), skriv landsbyens navn og svar på delene. I del II klikker du på kartet der landsbyen ligger. Trykk <span class="k">Send til læreren</span>. Send med en gang navnet er skrevet, så kan de andre i gruppa bli med. Du kan bare være i <strong>én</strong> landsby.</p></li>
  <li><h4>Bli med i gruppa <span class="tag">De andre</span></h4>
    <p>Skriv gruppekoden (seks bokstaver og tall) under <strong>Bli med i gruppa</strong> og trykk <span class="k">Bli med</span>. Da er du med i landsbyen.</p></li>
  <li><h4>Skriv inn innbyggeren din <span class="tag">Alle</span></h4>
    <p>Trykk fanen <span class="k">Min innbygger</span>, velg landsbyen din, skriv navn, alder og jobb, velg pronomen (he, she eller it), skriv om utseende og personlighet, og velg en av de 60 figurene. Trykk <span class="k">Send til læreren</span>. Du kan bare lage <strong>én</strong> innbygger. Etterpå kan du endre den til læreren har godkjent den.</p></li>
  <li><h4>Se om læreren har godkjent</h4>
    <p>Under <strong>Mine innsendinger</strong> ser du <em>Venter på læreren</em>, <em>Godkjent</em> eller <em>Ikke godkjent</em>. Du kan trykke <span class="k">Rediger</span> så lenge den venter. Når den er godkjent, er den med i spillet. Bilder kan du legge til på landsbyen og innbyggeren når som helst.</p></li>
  <li><h4>Teksten din blir lagret</h4>
    <p>Mens du skriver, står det <strong>Lagret</strong> nederst. Lukket du siden ved en feil, kommer teksten tilbake når du logger inn igjen. Når du er ferdig: trykk <span class="k">Log out</span>, så du også logges ut av Feide.</p></li>
</ol>

<h3>Når spillet er i gang</h3>
<p>Når du trykker <span class="k">Play</span>, starter du inne i landsbyen din og kan møte de andre fra landsbyen. Gå ut nederst for å komme til kartet. Bruk piltastene eller WASD, eller trykk der du vil gå. Du kan svømme over havet og klatre over fjell, men sakte. Trykk <span class="k">F</span> eller knappen nede i hjørnet for fullskjerm.</p>
<ul class="help-list">
  <li><strong>Problemer:</strong> Hver innbygger har et problem. Du må finne en ting ute på kartet, eller snakke med en innbygger i en annen landsby. Trykk <span class="k">Problems</span> for å se hva du skal gjøre. Du får 75 XP for hvert løste problem.</li>
  <li><strong>Landsråd:</strong> Når alle i landsbyen er samlet inne i landsbyen, dukker det opp en knapp for å starte landsråd. Dere velger én rådsleder. Lederen foreslår hvordan landsbyen styres, venner, fiender og å ta land. Alle i landsbyen stemmer i 40 minutter, og forslaget vedtas når tre fjerdedeler sier ja.</li>
  <li><strong>Land:</strong> Alle landsbyer har et eget område ingen kan ta. Én gang i døgnet kan rådet foreslå å ta fritt land som grenser til deres. Har en annen landsby tatt land dere vil ha, kan dere be om det. Den landsbyen kan gi landet bort eller si nei, og da møtes landsbyene i en <strong>kulturkamp</strong>: alle svarer på gloser og regnestykker i 24 timer, og landsbyen med best snitt vinner. Giften i landet følger med. Flytter en landsby, får den bare standardområdet tilbake.</li>
  <li><strong>Giften:</strong> Den onde giften sprer seg fra de onde landsbyene. Løs gloseoppgaver og regnestykker for å rense den bort.</li>
  <li><strong>Snakke sammen:</strong> Står du nær en annen elev, trykker du <span class="k">T</span>. Du velger mellom ferdige setninger på engelsk. Du kan ikke skrive selv i spillet: alt du skriver, skriver du på Bidra-siden, og læreren godkjenner det først.</li>
  <li><strong>Duell:</strong> Møter du en annen elev, kan du utfordre hen til en gloseduell. Vinner du, får du XP.</li>
  <li><strong>XP og rang:</strong> XP tar deg opp en stige med 20 steg. De første stegene er vanskelige.</li>
  <li><strong>Artefakter:</strong> Tegn en ting på papir og skann den i fanen <span class="k">Artifact</span>. Du kan lage så mange du vil. Når læreren har godkjent den, ligger den i ryggsekken din (<span class="k">Backpack</span>) når du har høy nok rang.</li>
  <li><strong>Klanleksikon:</strong> Historien om verden, landsbyene og innbyggerne. Trykk <span class="k">Norsk</span> øverst for å lese det på norsk.</li>
</ul>

<h3>Hvis noe går galt</h3>
<table class="help-table">
  <thead><tr><th>Du ser dette</th><th>Gjør dette</th></tr></thead>
  <tbody>
    <tr><td>Du er logget ut / You are logged out.</td><td>Logg inn igjen med Feide. Teksten din er ikke borte.</td></tr>
    <tr><td>Teksten kan ikke lagres akkurat nå.</td><td>Trykk <span class="k">Send til læreren</span> før du lukker siden. Får du ikke sendt, spør læreren.</td></tr>
    <tr><td>Skriv et navn først.</td><td>Du har glemt navnet. Skriv det øverst i første del.</td></tr>
    <tr><td>Velg landsbyen din.</td><td>Velg landsbyen din i lista <strong>Landsbyen din</strong>.</td></tr>
    <tr><td>Ingen landsby har den koden.</td><td>Sjekk gruppekoden. Den har seks bokstaver og tall. Be den som startet landsbyen lese koden på nytt.</td></tr>
    <tr><td>Oversettelsen virker ikke akkurat nå.</td><td>Vent litt og prøv igjen. Teksten din er ikke borte. Går det ikke, velg <span class="k">English</span> eller spør læreren.</td></tr>
    <tr><td>Innsending er stengt akkurat nå.</td><td>Læreren har stengt for innsending. Teksten din er lagret. Vent til læreren sier fra.</td></tr>
    <tr><td>Du har allerede en landsby / en innbygger.</td><td>Alle har bare én av hver. Endre den du har under <strong>Mine innsendinger</strong>.</td></tr>
    <tr><td>Teksten min er borte!</td><td>Sjekk navnet øverst. Er det ditt eget? Har du sendt teksten, ligger den under <strong>Mine innsendinger</strong>. Har du ikke sendt den, kommer den tilbake når du åpner fanen igjen.</td></tr>
  </tbody>
</table>
<p class="muted">Står du fortsatt fast? Spør læreren.</p>`;

const TEACHER = `
<p class="help-lede">Kort om hvordan <strong>The Game of Tribes</strong> fungerer for deg som lærer. Alt styres fra <strong>/admin.html</strong>.</p>

<h3>Slik går det til</h3>
<ol class="help-steps">
  <li><h4>Elevene skriver på Bidra</h4>
    <p>De logger inn med Feide. Én i gruppa starter landsbyen (vanlig eller skyggelandsby) og får en gruppekode. De andre blir med med koden. Hver elev lager <strong>én</strong> innbygger og er med i <strong>én</strong> landsby. De kan skrive på norsk, og teksten oversettes til engelsk med DeepL. Den norske originalteksten beholdes.</p></li>
  <li><h4>Du godkjenner</h4>
    <p>I admin ser du alle innsendinger. Godkjenner du en landsby eller innbygger, kommer den med i spillet. Elevene kan endre så lenge den venter. Bilder kan de legge til når som helst, også etter godkjenning, og de vises med en gang. Du kan slette bilder i admin. Du kan stenge og åpne for innsending.</p></li>
  <li><h4>Elevene spiller</h4>
    <p>Hver elev spiller som sin egen godkjente innbygger og starter inne i egen landsby. Kartet har sjø og fjell man kan svømme og klatre over. Innbyggerne har problemer elevene må løse, og elevene kan snakke med hverandre med ferdige setninger. Det er aldri mulig å skrive fritekst til andre i spillet.</p></li>
</ol>

<h3>Det du styrer i admin</h3>
<ul class="help-list">
  <li><strong>Villages og Villagers:</strong> godkjenn, avvis, rediger, slett, tildel eier og se pictures.</li>
  <li><strong>Councils:</strong> se hva landsrådene har bestemt, og tøm et råd så elevene kan skrive det på nytt.</li>
  <li><strong>The poison:</strong> start, pause, steg nå, fart, skoletid (08:00 til 15:30 på skoledager) og hvor mange prosent av kartet som gir seier til de onde. <em>Reset</em> fjerner all gift. <em>Reset the land</em> setter alle landsbyer tilbake til bare hjemmeområdet og lukker åpne landkrav. Giften starter pauset.</li>
  <li><strong>Oppgavene</strong> som renser giften (gloser og regning): velg typer og endre ordlisten. Det følger med en ordliste på 100 ord for 1. til 7. trinn.</li>
  <li><strong>Artifacts:</strong> godkjenn tegnede artefakter og velg hvilken rang som låser dem opp i ryggsekken. Elevene kan lage så mange de vil.</li>
  <li><strong>Students:</strong> se XP og rang, og slett en elev (innbyggere og utkast slettes, gruppelandsbyer blir stående).</li>
</ul>

<h3>Regler og spillmekanikk</h3>
<ul class="help-list">
  <li><strong>Landsråd:</strong> alle i landsbyen må stå inne i landsbyen samtidig, og én starter rådet. Rådet er åpent i 40 minutter. Rådslederen foreslår endringer (styreform, gud, lover, venner, fiender, ny leder, å ta land). Alle stemmer, og det vedtas med tre fjerdedeler. Venner og fiender får beskjed. Fiender kan ikke besøke hverandre.</li>
  <li><strong>Land:</strong> hver landsby har et hjemmeområde ingen kan ta. Én gang i døgnet kan rådet ta fritt land som grenser til deres (5 ruter, eller 7 med mye skjold). Land en annen landsby har tatt, kan det spørres om. Lederen i den landsbyen svarer innen 24 timer. Ja flytter landet. Nei, eller ikke noe svar, gir kulturkamp i 24 timer der minst halvparten fra hver landsby må delta, og best snitt per spiller vinner. Uavgjort går til forsvareren. Giften følger med landet. Flytter en landsby på kartet, mister den landet den har tatt. De onde landsbyene kan ikke ta land, bare spre gift.</li>
  <li><strong>XP og rang:</strong> 20 steg, bratt fra start. XP fås fra gloseduellene (30 per seier) og fra løste problemer (75). Tallene ligger i koden og er enkle å endre.</li>
  <li><strong>Klanleksikon:</strong> biografier om innbyggerne, korte tekster om landsbyene og verdenshistorien skrives av Claude og oppdateres hver mandag cirka 08:10 av en planlagt oppgave, så lenge Claude-appen er åpen. Elevene kan lese det på norsk.</li>
</ul>

<h3>Personvern</h3>
<ul class="help-list">
  <li>Elevenes navn vises aldri til andre elever. De kjenner hverandre bare på innbyggerens navn.</li>
  <li>Innlogging skjer med Feide. Alle data ligger i Supabase, og nettleseren leser ingenting direkte.</li>
  <li>Elevene må trykke <span class="k">Log out</span> på felles PC-er. Da logges de også ut av Feide.</li>
</ul>

<h3>Tips til første time</h3>
<ol class="help-list">
  <li>Gjør gruppene ferdige først: én starter landsbyen, resten blir med med koden.</li>
  <li>Godkjenn landsbyene før dere skriver innbyggerne.</li>
  <li>Start gjerne giften først når elevene har spilt en stund.</li>
</ol>`;

const ABOUT = `
<p class="help-lede"><strong>The Game of Tribes</strong> er et rollespill som er laget av elevene på <strong>7. trinn ved Egge barneskole</strong> i Steinkjer.</p>
<p>Elevene har funnet på alt som finnes i spillet: landsbyene, innbyggerne, skyggelandsbyene, lovene og historiene. De har tegnet artefaktene og skrevet problemene innbyggerne sliter med. Klassen har også bestemt hvem som er venner og fiender, og hvem som tar land fra hvem.</p>
<p>Spillet er laget for å øve engelsk: elevene skriver, leser og snakker engelsk sammen, og lærer gloser mens de renser den onde giften fra kartet.</p>
<h3>Læringsmål nådd</h3>
<p>Spillet gir elevene arbeid med disse kompetansemålene i engelsk etter 7. trinn (LK20, ENG01-06). Målene er gjengitt med egne ord. Hvor godt hvert mål er nådd for hver elev, vurderer læreren.</p>
<table class="help-table"><thead><tr><th>Kompetansemål i engelsk, etter 7. trinn</th><th>Slik øver elevene i spillet</th><th>Dekning</th></tr></thead><tbody><tr><td>Bruke enkle strategier i språklæring og kommunikasjon</td><td>Klikk på et ord for å få oversettelse og opplesing. Elevene kan skrive på norsk og få teksten oversatt til engelsk.</td><td>Godt</td></tr><tr><td>Bruke digitale ressurser og ordbøker</td><td>Innebygd ordliste med 100 gloser for 1. til 7. trinn, oversettelse og opplesing, og Norsk-knappen i Klanleksikon.</td><td>Godt</td></tr><tr><td>Prøve ut ord, uttrykk og uttale i lek og rollespill</td><td>Hele spillet er et rollespill der hver elev spiller innbyggeren sin. Tekstene kan leses opp.</td><td>Godt</td></tr><tr><td>Lytte til og forstå ord og uttrykk</td><td>Innbyggernes svar og problemer er skrevet for elevene og kan leses opp.</td><td>Godt</td></tr><tr><td>Uttrykke seg forståelig med variert ordforråd og høflighetsuttrykk</td><td>Ferdige setninger som «Hello!», «How are you?», «Thank you!» og «Goodbye», og gloseduellene.</td><td>Godt</td></tr><tr><td>Starte, holde i gang og avslutte samtaler</td><td>Samtalene mellom elever på kartet og i landsbyen: hilse, spørre, svare og si farvel.</td><td>Godt</td></tr><tr><td>Se likheter mellom engelsk og andre språk</td><td>Norske og engelske ord side om side i gloser og oversettelser.</td><td>Delvis</td></tr><tr><td>Følge regler for rettskriving</td><td>Glose- og regneoppgavene sjekker stavemåten, og elevene får svar med en gang.</td><td>Godt</td></tr><tr><td>Lese og videreformidle innhold fra ulike tekster</td><td>Elevene leser problemene og må bringe svar mellom innbyggere. De leser også historien og biografiene i Klanleksikon.</td><td>Godt</td></tr><tr><td>Skrive sammenhengende tekster, også sammensatte, tilpasset mottaker</td><td>De skriver om landsbyen og innbyggeren sin, og lager tegninger og artefakter som hører til teksten.</td><td>Godt</td></tr><tr><td>Bearbeide egne tekster etter tilbakemelding</td><td>Elevene kan rette teksten til læreren har godkjent den. Læreren gir bare godkjent eller ikke godkjent i spillet, så tilbakemeldingen må gis muntlig.</td><td>Delvis</td></tr><tr><td>Utforske levemåter og tradisjoner, identitet og tilhørighet</td><td>Elevene finner på tradisjoner, mat, klær, lover og styreform for landsbyen sin og møter de andres. Landsbyene er oppdiktede, ikke virkelige samfunn.</td><td>Delvis</td></tr></tbody></table>
<p><strong>Også tverrfaglig:</strong> <em>Matematikk</em> (regnestykkene som renser giften), <em>samfunnsfag og demokrati og medborgerskap</em> (landsråd, avstemning med tre fjerdedels flertall, allianser og avtaler mellom landsbyer) og <em>digitale ferdigheter</em> (skrive, tegne, skanne og samarbeide på nett).</p>
<p class="muted"><a href="https://www.udir.no/lk20/eng01-06/kompetansemaal-og-vurdering/kv3" target="_blank" rel="noopener">Kompetansemålene hos Utdanningsdirektoratet</a></p>
<h3>Hvordan det er laget</h3>
<p>Læreren har laget spillet sammen med elevene, og har fått hjelp av Claude (en AI fra Anthropic) til å skrive programmet og tekstene i Klanleksikonet. Elevenes egne tekster er det som bestemmer innholdet.</p>
<h3>Bygget med</h3>
<ul class="help-list">
  <li>Phaser for 2D-spillet, Supabase og Netlify for data og nettside.</li>
  <li>DeepL for oversettelse mellom norsk og engelsk.</li>
  <li>Figurer og byggesteiner fra Kenney (CC0).</li>
  <li>Innlogging med Feide.</li>
</ul>
<p class="muted">Steinkjer kommune · Egge barneskole</p>`;

const PAGES = {
  student: { title: 'Elevguide', text: 'Slik skriver du landsbyen og innbyggeren din, og slik spiller du.', icon: '📖', html: STUDENT },
  teacher: { title: 'Lærerveiledning', text: 'Hva du styrer, reglene i spillet og personvern.', icon: '🧭', html: TEACHER },
  about: { title: 'Om prosjektet', text: 'Et spill laget av elevene på 7. trinn ved Egge barneskole.', icon: '🏰', html: ABOUT },
};

export function mountHelp() {
  if (document.getElementById('help-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'help-fab';
  fab.type = 'button';
  fab.className = 'help-fab';
  fab.setAttribute('aria-label', 'Hjelp');
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = '<span class="help-fab-ring" aria-hidden="true"></span><span class="help-fab-mark" aria-hidden="true">?</span>';
  const modal = document.createElement('div');
  modal.className = 'help-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Hjelp');
  document.body.append(fab, modal);

  const close = () => {
    if (modal.hidden) return;
    modal.classList.remove('open');
    setTimeout(() => {
      modal.hidden = true;
      modal.innerHTML = '';
    }, 180);
    fab.focus();
  };

  const showMenu = () => {
    modal.innerHTML = `<div class="help-panel">
        <div class="help-head"><h2>Hjelp</h2><button type="button" class="small-btn" data-close>Lukk</button></div>
        <p class="muted">Hva vil du lese?</p>
        <div class="help-cards">${Object.entries(PAGES)
          .map(
            ([key, p], i) => `<button type="button" class="help-card" data-page="${key}" style="--i:${i}">
              <span class="help-card-icon" aria-hidden="true">${p.icon}</span>
              <span><strong>${p.title}</strong><br><span class="muted">${p.text}</span></span>
            </button>`
          )
          .join('')}</div>
      </div>`;
  };

  const showPage = (key) => {
    const p = PAGES[key];
    modal.innerHTML = `<div class="help-panel wide">
        <div class="help-head"><button type="button" class="small-btn" data-back>← Tilbake</button><h2>${p.title}</h2><button type="button" class="small-btn" data-close>Lukk</button></div>
        <div class="help-body">${p.html}</div>
      </div>`;
    modal.querySelector('.help-body').scrollTop = 0;
  };

  const open = () => {
    showMenu();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.querySelector('[data-close]')?.focus();
  };

  fab.addEventListener('click', () => (modal.hidden ? open() : close()));
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) return close();
    if (e.target.closest('[data-back]')) return showMenu();
    const card = e.target.closest('[data-page]');
    if (card) showPage(card.dataset.page);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
}
