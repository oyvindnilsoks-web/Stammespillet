import { loadCouncils, saveCouncil } from './api.js';
import { escapeHtml } from './translate.js';

// The "Council" tab on the Contribute page: the students who live in a village
// decide together how it is ruled, which god it believes in, its laws, and who
// its allies and enemies are. The residents choose one council leader, who is
// the only one who can save; the others see what the council has decided.
// Villages that are named as allies or enemies by another council are told here.

const TEXT = {
  en: {
    loading: 'Loading…',
    intro: 'You decide this together with everyone who lives in your village. Choose one council leader: only the leader can save, so you do not overwrite each other. Allies are friends. Enemies cannot visit your village, and you cannot visit them.',
    none: 'You get a seat in the council when your village, or a villager you wrote, has been approved by the teacher.',
    meetInVillage: 'The council meets in the village. When all the villagers are standing in the village in the game, a button appears for all of you to start the council. Here you can read what has been decided.',
    government: 'How is the village ruled?',
    governmentHelp: 'A king, a council of elders, the strongest, everybody together…',
    god: 'Which god or gods do they believe in?',
    laws: 'The most important laws',
    allies: 'Allies',
    enemies: 'Enemies',
    leader: 'Council leader',
    leaderHelp: 'The villager whose student presses save for the whole council.',
    you: ' (you)',
    noVillagers: 'Nobody can be leader before a villager of this village has been approved.',
    onlyLeader: (name) => `Only the council leader, <strong>${name}</strong>, can change the council. Talk to them if something should change.`,
    nothingYet: 'Nothing decided yet.',
    noOthers: 'There are no other villages yet.',
    save: 'Save the council',
    saving: 'Saving…',
    saved: '✓ Saved',
    failed: 'Could not save. Try again.',
    translateFailed: 'The translation did not work. Press save again.',
    loadFailed: 'Could not load the councils.',
    messages: 'News from other villages',
    ally: (from, to) => `<strong>${from}</strong> has made <strong>${to}</strong> an ally.`,
    enemy: (from, to) => `<strong>${from}</strong> has declared <strong>${to}</strong> an enemy. You cannot visit each other.`,
  },
  no: {
    loading: 'Laster …',
    intro: 'Dette bestemmer dere sammen med alle som bor i landsbyen. Velg én rådsleder: bare lederen kan lagre, så dere ikke skriver over hverandre. Allierte er venner. Fiender kan ikke besøke landsbyen deres, og dere kan ikke besøke dem.',
    none: 'Du får plass i rådet når landsbyen din, eller en innbygger du har skrevet, er godkjent av læreren.',
    meetInVillage: 'Rådet møtes i landsbyen. Når alle innbyggerne står i landsbyen i spillet, dukker det opp en knapp til alle for å starte rådet. Her kan du lese hva som er bestemt.',
    government: 'Hvordan styres landsbyen?',
    governmentHelp: 'En konge, et råd av eldre, den sterkeste, alle sammen …',
    god: 'Hvilken gud eller hvilke guder tror de på?',
    laws: 'De viktigste lovene',
    allies: 'Allierte',
    enemies: 'Fiender',
    leader: 'Rådsleder',
    leaderHelp: 'Innbyggeren hvis elev trykker lagre for hele rådet.',
    you: ' (deg)',
    noVillagers: 'Ingen kan bli leder før en innbygger fra landsbyen er godkjent.',
    onlyLeader: (name) => `Bare rådslederen, <strong>${name}</strong>, kan endre rådet. Snakk med dem hvis noe skal endres.`,
    nothingYet: 'Ingenting er bestemt ennå.',
    noOthers: 'Det finnes ingen andre landsbyer ennå.',
    save: 'Lagre rådet',
    saving: 'Lagrer …',
    saved: '✓ Lagret',
    failed: 'Kunne ikke lagre. Prøv igjen.',
    translateFailed: 'Oversettelsen virket ikke. Trykk lagre igjen.',
    loadFailed: 'Kunne ikke hente rådene.',
    messages: 'Nytt fra andre landsbyer',
    ally: (from, to) => `<strong>${from}</strong> har gjort <strong>${to}</strong> til alliert.`,
    enemy: (from, to) => `<strong>${from}</strong> har erklært <strong>${to}</strong> som fiende. Dere kan ikke besøke hverandre.`,
  },
};

const h = escapeHtml;

function checks(name, villages, selfId, chosen) {
  const others = villages.filter((v) => v.id !== selfId);
  return others
    .map((v) => `<label class="council-check"><input type="checkbox" name="${name}" value="${h(v.id)}" ${chosen.includes(v.id) ? 'checked' : ''}> ${h(v.name)}</label>`)
    .join('');
}

function names(ids, villages) {
  return ids.map((id) => villages.find((v) => v.id === id)?.name).filter(Boolean);
}

// What the council has decided, for those who may not change it.
function readOnly(council, villages, t) {
  const row = (label, value) => (value ? `<p><strong>${label}:</strong> ${h(value)}</p>` : '');
  const body = [
    row(t.government, council.government),
    row(t.god, council.god),
    row(t.laws, council.laws),
    row(t.allies, names(council.allies, villages).join(', ')),
    row(t.enemies, names(council.enemies, villages).join(', ')),
  ].join('');
  return body || `<p class="muted">${t.nothingYet}</p>`;
}

function card(council, villages, lang, t, translation, live) {
  // A council written in Norwegian is edited in Norwegian.
  const useOriginal = lang === 'no' && translation && council.source_lang === 'no' && council.original;
  const value = (key) => (useOriginal ? council.original[key] : council[key]) || '';
  const noOthers = villages.filter((v) => v.id !== council.tribe_id).length === 0;
  const head = `<div class="charter-head"><div><h3>${h(council.name || '')}</h3></div></div>`;

  // On the Contribute page the council is only read. In the game, while the
  // council meets, the leader can write it and the others read it live.
  if (!live || !council.can_edit) {
    const note = live && council.leader ? t.onlyLeader(h(council.leader.name)) : t.meetInVillage;
    return `<section class="charter-section council" data-council="${h(council.tribe_id)}">${head}
      <p class="charter-lede">${note}</p>${readOnly(council, villages, t)}</section>`;
  }

  const chosenLeader = council.leader ? council.leader.id : (council.villagers.find((v) => v.mine) || {}).id;
  const leaderOptions = council.villagers.length
    ? `<select name="leader">${council.villagers
        .map((v) => `<option value="${h(v.id)}" ${v.id === chosenLeader ? 'selected' : ''}>${h(v.name)}${v.mine ? t.you : ''}</option>`)
        .join('')}</select>`
    : `<p class="muted">${t.noVillagers}</p>`;
  return `<section class="charter-section council" data-council="${h(council.tribe_id)}">${head}
    <label class="charter-field"><span class="field-label">${t.leader}</span><span class="muted"> ${t.leaderHelp}</span>${leaderOptions}</label>
    <label class="charter-field"><span class="field-label">${t.government}</span><input type="text" name="government" maxlength="300" value="${h(value('government'))}" placeholder="${h(t.governmentHelp)}"></label>
    <label class="charter-field"><span class="field-label">${t.god}</span><input type="text" name="god" maxlength="300" value="${h(value('god'))}"></label>
    <label class="charter-field"><span class="field-label">${t.laws}</span><textarea name="laws" rows="4" maxlength="800">${h(value('laws'))}</textarea></label>
    <div class="charter-field"><span class="field-label">${t.allies}</span><div class="council-checks">${noOthers ? `<p class="muted">${t.noOthers}</p>` : checks('allies', villages, council.tribe_id, council.allies)}</div></div>
    <div class="charter-field"><span class="field-label">${t.enemies}</span><div class="council-checks">${noOthers ? '' : checks('enemies', villages, council.tribe_id, council.enemies)}</div></div>
    <div class="council-actions"><button type="button" class="choice-btn" data-save ${council.villagers.length ? '' : 'disabled'}>${t.save}</button> <span class="muted" data-status role="status"></span></div>
  </section>`;
}

export async function renderCouncil(host, options) {
  const { lang, translation, tribeId = null, live = false } = options;
  clearInterval(host._councilTimer);
  const t = TEXT[lang === 'no' ? 'no' : 'en'];
  host.innerHTML = `<p>${t.loading}</p>`;
  let data;
  try {
    data = await loadCouncils();
  } catch {
    host.innerHTML = `<p class="error">${t.loadFailed}</p>`;
    return;
  }
  if (tribeId) data.councils = data.councils.filter((c) => c.tribe_id === tribeId);
  if (!data.councils.length) {
    host.innerHTML = `<p>${t.none}</p>`;
    return;
  }
  const notices = !live && (data.notices || []).length
    ? `<section class="council-news"><h3>${t.messages}</h3><ul>${data.notices.map((n) => `<li>${(n.kind === 'enemy' ? t.enemy : t.ally)(h(n.from_name), h(n.to_name))}</li>`).join('')}</ul></section>`
    : '';
  host.innerHTML = `${notices}<p class="charter-lede">${t.intro}</p>${data.councils.map((c) => card(c, data.villages, lang, t, data.translation, live)).join('')}`;

  // While the council meets, those who cannot write it see the leader's changes.
  if (live && !data.councils.some((c) => c.can_edit)) {
    host._councilTimer = setInterval(() => {
      if (!host.isConnected) clearInterval(host._councilTimer);
      else renderCouncil(host, options);
    }, 6000);
  }

  // A village is an ally or an enemy, not both: ticking one clears the other.
  host.addEventListener('change', (e) => {
    const box = e.target;
    if (!(box instanceof HTMLInputElement) || box.type !== 'checkbox' || !box.checked) return;
    const other = box.name === 'allies' ? 'enemies' : 'allies';
    box.closest('[data-council]').querySelectorAll(`input[name="${other}"]`).forEach((o) => {
      if (o.value === box.value) o.checked = false;
    });
  });

  host.querySelectorAll('[data-save]').forEach((button) =>
    button.addEventListener('click', async () => {
      const section = button.closest('[data-council]');
      const status = section.querySelector('[data-status]');
      const val = (name) => section.querySelector(`[name="${name}"]`).value;
      const ticked = (name) => [...section.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
      button.disabled = true;
      status.textContent = t.saving;
      try {
        await saveCouncil({
          tribe_id: section.dataset.council,
          lang: lang === 'no' && data.translation ? 'no' : 'en',
          leader_character_id: section.querySelector('[name="leader"]')?.value || null,
          government: val('government'),
          god: val('god'),
          laws: val('laws'),
          allies: ticked('allies'),
          enemies: ticked('enemies'),
        });
        status.textContent = t.saved;
        // Handing over the leadership: show the council as the new leader's.
        const before = data.councils.find((c) => c.tribe_id === section.dataset.council);
        const chosen = section.querySelector('[name="leader"]')?.value;
        if (before && before.leader && chosen && before.leader.id !== chosen) setTimeout(() => renderCouncil(host, options), 600);
      } catch (err) {
        status.textContent = err.code === 'translation_unavailable' ? t.translateFailed : err.message || t.failed;
      } finally {
        button.disabled = false;
      }
    })
  );
}
