import { loadCouncils, saveCouncil, landPreview, landClaim, voteOnProposal, respondToClaim } from './api.js';
import { escapeHtml } from './translate.js';

// The "Council" tab on the Contribute page: the students who live in a village
// decide together how it is ruled, which god it believes in, its laws, and who
// its allies and enemies are. The residents choose one council leader, who is
// the only one who can save; the others see what the council has decided.
// Villages that are named as allies or enemies by another council are told here.

const TEXT = {
  en: {
    loading: 'Loading…',
    landTitle: 'Land',
    landLede: (cells, radius) => `Your village has ${cells} squares of land. Once a day the council can take free land that borders yours, ${radius} squares wide. The poison in it comes with it. Choose a direction.`,
    landSquares: (n) => `+${n} squares`,
    landTaken: (n) => `✓ Your village took ${n} squares of land.`,
    landProposed: '✓ The proposal has been sent. The villagers vote now.',
    landFrom: (name, n) => `Ask ${name} (+${n})`,
    claimsTitle: 'Land claims',
    claimAwaiting: (from, to, n) => `${from} asks ${to} for ${n} squares of land.`,
    claimAnswerBy: (when) => `The leader of the village answers before ${when}. No answer is a no.`,
    claimGive: 'Give the land',
    claimRefuse: 'No: culture battle',
    claimBattle: (from, to, n) => `Culture battle: ${from} against ${to} for ${n} squares of land.`,
    claimBattleEnds: (when) => `Everybody answers one set of tasks before ${when}. The village with the best average wins.`,
    claimTook: (a, b, need) => `Played so far: ${a} of ${need} needed from the claiming village, ${b} of ${need} from the defending village.`,
    claimPlay: 'Take part in the culture battle',
    claimPlayed: 'You have taken part. Your score counts for your village.',
    claimTransferred: (from, to, n) => `${from} got ${n} squares of land from ${to}.`,
    claimKept: (from, to) => `${to} kept its land. ${from} got nothing.`,
    claimFailed: 'Could not do that.',
    proposalTitle: 'The council votes',
    proposalSent: '✓ Sent to the villagers. They vote now.',
    voteIntro: (need, total) => `It passes when ${need} of ${total} villagers say yes.`,
    yes: 'Yes',
    no: 'No',
    counts: (yes, no, need) => `Yes: ${yes} · No: ${no} · ${need} yes needed`,
    timeLeft: (min) => (min > 0 ? `${min} min left` : 'Less than a minute left'),
    myYes: 'You voted yes.',
    myNo: 'You voted no.',
    passed: 'The proposal passed.',
    rejected: 'The proposal was voted down.',
    expired: 'The time ran out, so nothing changed.',
    voteFailed: 'Could not vote. Are you in the village?',
    saveProposal: 'Propose to the villagers',
    landNext: (when) => `You can take land again ${when}.`,
    landFailed: 'Could not take the land.',
    intro: 'You decide this together with everyone who lives in your village. Choose one council leader: only the leader can save, so you do not overwrite each other. Allies are friends. Enemies cannot visit your village, and you cannot visit them.',
    none: 'You get a seat in the council when your village, or a villager you wrote, has been approved by the teacher.',
    meetInVillage: 'The council meets in the village. When everyone who belongs to the village (the group that made it, and those who wrote a villager) is standing in the village in the game, a button appears for all of you to start the council. Here you can read what has been decided.',
    government: 'How is the village ruled?',
    governmentHelp: 'A king, a council of elders, the strongest, everybody together…',
    god: 'Which god or gods do they believe in?',
    laws: 'The most important laws',
    allies: 'Allies',
    enemies: 'Enemies',
    leader: 'Council leader',
    leaderHelp: 'The one from the village who presses save for the whole council.',
    you: ' (you)',
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
    landTitle: 'Land',
    landLede: (cells, radius) => `Landsbyen har ${cells} ruter land. Én gang om dagen kan rådet ta fritt land som grenser til deres, ${radius} ruter bredt. Giften i landet følger med. Velg en retning.`,
    landSquares: (n) => `+${n} ruter`,
    landTaken: (n) => `✓ Landsbyen tok ${n} ruter land.`,
    landProposed: '✓ Forslaget er sendt. Innbyggerne stemmer nå.',
    landFrom: (name, n) => `Spør ${name} (+${n})`,
    claimsTitle: 'Landkrav',
    claimAwaiting: (from, to, n) => `${from} ber ${to} om ${n} ruter land.`,
    claimAnswerBy: (when) => `Lederen i landsbyen svarer innen ${when}. Ikke noe svar er et nei.`,
    claimGive: 'Gi landet',
    claimRefuse: 'Nei: kulturkamp',
    claimBattle: (from, to, n) => `Kulturkamp: ${from} mot ${to} om ${n} ruter land.`,
    claimBattleEnds: (when) => `Alle svarer på ett sett oppgaver innen ${when}. Landsbyen med best snitt vinner.`,
    claimTook: (a, b, need) => `Spilt så langt: ${a} av ${need} som trengs fra landsbyen som krever, ${b} av ${need} fra landsbyen som forsvarer.`,
    claimPlay: 'Delta i kulturkampen',
    claimPlayed: 'Du har deltatt. Poengene dine teller for landsbyen.',
    claimTransferred: (from, to, n) => `${from} fikk ${n} ruter land fra ${to}.`,
    claimKept: (from, to) => `${to} beholdt landet sitt. ${from} fikk ingenting.`,
    claimFailed: 'Kunne ikke gjøre det.',
    proposalTitle: 'Rådet stemmer',
    proposalSent: '✓ Sendt til innbyggerne. De stemmer nå.',
    voteIntro: (need, total) => `Det vedtas når ${need} av ${total} innbyggere sier ja.`,
    yes: 'Ja',
    no: 'Nei',
    counts: (yes, no, need) => `Ja: ${yes} · Nei: ${no} · ${need} ja trengs`,
    timeLeft: (min) => (min > 0 ? `${min} min igjen` : 'Under ett minutt igjen'),
    myYes: 'Du stemte ja.',
    myNo: 'Du stemte nei.',
    passed: 'Forslaget ble vedtatt.',
    rejected: 'Forslaget ble nedstemt.',
    expired: 'Tiden gikk ut, så ingenting ble endret.',
    voteFailed: 'Kunne ikke stemme. Er du i landsbyen?',
    saveProposal: 'Foreslå for innbyggerne',
    landNext: (when) => `Dere kan ta land igjen ${when}.`,
    landFailed: 'Kunne ikke ta landet.',
    intro: 'Dette bestemmer dere sammen med alle som bor i landsbyen. Velg én rådsleder: bare lederen kan lagre, så dere ikke skriver over hverandre. Allierte er venner. Fiender kan ikke besøke landsbyen deres, og dere kan ikke besøke dem.',
    none: 'Du får plass i rådet når landsbyen din, eller en innbygger du har skrevet, er godkjent av læreren.',
    meetInVillage: 'Rådet møtes i landsbyen. Når alle som hører til landsbyen (gruppa som laget den, og de som har skrevet en innbygger) står i landsbyen i spillet, dukker det opp en knapp til alle for å starte rådet. Her kan du lese hva som er bestemt.',
    government: 'Hvordan styres landsbyen?',
    governmentHelp: 'En konge, et råd av eldre, den sterkeste, alle sammen …',
    god: 'Hvilken gud eller hvilke guder tror de på?',
    laws: 'De viktigste lovene',
    allies: 'Allierte',
    enemies: 'Fiender',
    leader: 'Rådsleder',
    leaderHelp: 'Den fra landsbyen som trykker lagre for hele rådet.',
    you: ' (deg)',
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
    const note = live && council.leader ? t.onlyLeader(h(council.leader.label)) : t.meetInVillage;
    return `<section class="charter-section council" data-council="${h(council.tribe_id)}">${head}
      ${live ? `<div class="council-proposal" data-proposal="${h(council.tribe_id)}"></div>` : ''}<p class="charter-lede">${note}</p>${readOnly(council, villages, t)}</section>`;
  }

  const chosenLeader = council.leader ? council.leader.pid : (council.people.find((p) => p.mine) || {}).pid;
  const leaderOptions = `<select name="leader">${council.people
    .map((p) => `<option value="${h(p.pid)}" ${p.pid === chosenLeader ? 'selected' : ''}>${h(p.label)}${p.mine ? t.you : ''}</option>`)
    .join('')}</select>`;
  return `<section class="charter-section council" data-council="${h(council.tribe_id)}">${head}
    <div class="council-proposal" data-proposal="${h(council.tribe_id)}"></div>
    <label class="charter-field"><span class="field-label">${t.leader}</span><span class="muted"> ${t.leaderHelp}</span>${leaderOptions}</label>
    <label class="charter-field"><span class="field-label">${t.government}</span><input type="text" name="government" maxlength="300" value="${h(value('government'))}" placeholder="${h(t.governmentHelp)}"></label>
    <label class="charter-field"><span class="field-label">${t.god}</span><input type="text" name="god" maxlength="300" value="${h(value('god'))}"></label>
    <label class="charter-field"><span class="field-label">${t.laws}</span><textarea name="laws" rows="4" maxlength="800">${h(value('laws'))}</textarea></label>
    <div class="charter-field"><span class="field-label">${t.allies}</span><div class="council-checks">${noOthers ? `<p class="muted">${t.noOthers}</p>` : checks('allies', villages, council.tribe_id, council.allies)}</div></div>
    <div class="charter-field"><span class="field-label">${t.enemies}</span><div class="council-checks">${noOthers ? '' : checks('enemies', villages, council.tribe_id, council.enemies)}</div></div>
    <div class="council-actions"><button type="button" class="choice-btn" data-save>${live ? t.saveProposal : t.save}</button> <span class="muted" data-status role="status"></span></div>
    <div class="charter-field council-land" data-land="${h(council.tribe_id)}"></div>
  </section>`;
}

// A proposal from the council leader: what it says, the votes so far, and the buttons.
function proposalHtml(p, t) {
  if (!p) return '';
  const items = p.summary.map((s) => `<li>${h(s)}</li>`).join('');
  if (p.status !== 'open') {
    return `<div class="proposal result ${h(p.status)}"><strong>${t[p.status] || ''}</strong>${p.note ? ` <span class="muted">${h(p.note)}</span>` : ''}<ul>${items}</ul></div>`;
  }
  const minutes = Math.max(0, Math.ceil((new Date(p.closes_at) - Date.now()) / 60000));
  const mine = p.my_vote === true ? t.myYes : p.my_vote === false ? t.myNo : '';
  return `<div class="proposal"><strong>${t.proposalTitle}</strong><ul>${items}</ul>
    <p class="muted">${t.voteIntro(p.need, p.total)} ${t.counts(p.yes, p.no, p.need)} · ${t.timeLeft(minutes)}</p>
    <div class="vote-row"><button type="button" class="choice-btn" data-vote="yes" data-pid="${p.id}">${t.yes}</button> <button type="button" class="small-btn" data-vote="no" data-pid="${p.id}">${t.no}</button> <span class="muted" data-vote-status role="status">${mine}</span></div></div>`;
}

// The land claims that concern the villages in this window: a question for the leader of the
// village that is asked, the culture battle, and what was decided.
function claimsHtml(claims, t, lang) {
  if (!claims || !claims.length) return '';
  const when = (iso) => new Date(iso).toLocaleString(lang === 'no' ? 'nb-NO' : 'en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const items = claims
    .map((c) => {
      const from = h(c.claimant_name);
      const to = h(c.target_name);
      if (c.status === 'awaiting') {
        return `<li class="claim"><strong>${t.claimAwaiting(from, to, c.squares)}</strong> <span class="muted">${t.claimAnswerBy(when(c.respond_by))}</span>
          ${c.can_respond ? `<div class="vote-row"><button type="button" class="choice-btn" data-claim-answer="yes" data-claim="${c.id}">${t.claimGive}</button> <button type="button" class="small-btn" data-claim-answer="no" data-claim="${c.id}">${t.claimRefuse}</button></div>` : ''}</li>`;
      }
      if (c.status === 'battle') {
        const play = c.my_side ? (c.played ? `<span class="muted">${t.claimPlayed}</span>` : `<button type="button" class="choice-btn" data-claim-play="${c.id}">${t.claimPlay}</button>`) : '';
        return `<li class="claim"><strong>${t.claimBattle(from, to, c.squares)}</strong> <span class="muted">${t.claimBattleEnds(when(c.battle_ends))} ${t.claimTook(c.claimant_players, c.target_players, c.claimant_needed)}</span>${play ? `<div class="vote-row">${play}</div>` : ''}</li>`;
      }
      const text = c.status === 'transferred' ? t.claimTransferred(from, to, c.squares) : t.claimKept(from, to);
      return `<li class="claim result ${h(c.status)}"><strong>${text}</strong> <span class="muted">${h(c.note || '')}</span></li>`;
    })
    .join('');
  return `<section class="council-claims-box"><h3>${t.claimsTitle}</h3><ul class="claims">${items}</ul></section>`;
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
  host.innerHTML = `${notices}${live ? '<div data-claims></div>' : ''}<p class="charter-lede">${t.intro}</p>${data.councils.map((c) => card(c, data.villages, lang, t, data.translation, live)).join('')}`;

  // The proposal of the leader, shown to everybody while the council meets. The votes are
  // fetched again every few seconds without redrawing the form (the leader may be typing).
  const drawProposals = () =>
    host.querySelectorAll('[data-proposal]').forEach((box) => {
      const council = data.councils.find((c) => c.tribe_id === box.dataset.proposal);
      box.innerHTML = proposalHtml(council && council.proposal, t);
    });
  const drawClaims = () => {
    const box = host.querySelector('[data-claims]');
    if (box) box.innerHTML = claimsHtml(data.land_claims, t, lang);
  };
  drawProposals();
  drawClaims();
  if (live) {
    clearInterval(host._proposalTimer);
    const seen = new Map(data.councils.map((c) => [c.tribe_id, c.proposal ? c.proposal.status : null]));
    host._proposalTimer = setInterval(async () => {
      if (!host.isConnected) return clearInterval(host._proposalTimer);
      try {
        const fresh = await loadCouncils();
        data.councils.forEach((c) => {
          const f = fresh.councils.find((x) => x.tribe_id === c.tribe_id);
          if (!f) return;
          c.proposal = f.proposal;
          // Land that was voted through is on the map now.
          if (f.proposal && f.proposal.kind === 'land' && f.proposal.status === 'passed' && seen.get(c.tribe_id) === 'open') window.dispatchEvent(new Event('land-changed'));
          seen.set(c.tribe_id, f.proposal ? f.proposal.status : null);
        });
        data.land_claims = fresh.land_claims;
        drawProposals();
        drawClaims();
      } catch {
        // The next try will do.
      }
    }, 4000);
  }
  host._data = data;
  host._t = t;
  host._lang = lang;
  if (!host._claimBound) {
    host._claimBound = true;
    host.addEventListener('click', async (e) => {
      const answer = e.target.closest('[data-claim-answer]');
      const play = e.target.closest('[data-claim-play]');
      if (play) {
        window.dispatchEvent(new CustomEvent('culture-battle', { detail: { claimId: Number(play.dataset.claimPlay) } }));
        return;
      }
      if (!answer) return;
      answer.closest('.claim').querySelectorAll('button').forEach((b) => (b.disabled = true));
      try {
        await respondToClaim(Number(answer.dataset.claim), answer.dataset.claimAnswer === 'yes');
        const fresh = await loadCouncils();
        host._data.land_claims = fresh.land_claims;
        window.dispatchEvent(new Event('land-changed'));
      } catch (err) {
        answer.closest('.claim').insertAdjacentHTML('beforeend', `<p class="error">${h(err.message || host._t.claimFailed)}</p>`);
        return;
      }
      host.querySelector('[data-claims]').innerHTML = claimsHtml(host._data.land_claims, host._t, host._lang);
    });
  }
  if (!host._voteBound) {
    host._voteBound = true;
    host.addEventListener('click', async (e) => {
      const button = e.target.closest('[data-vote]');
      if (!button) return;
      const box = button.closest('[data-proposal]');
      const current = host._data;
      const council = box && current.councils.find((c) => c.tribe_id === box.dataset.proposal);
      if (!council) return;
      box.querySelectorAll('button').forEach((b) => (b.disabled = true));
      try {
        const r = await voteOnProposal(council.tribe_id, Number(button.dataset.pid), button.dataset.vote === 'yes');
        council.proposal = r.proposal;
        if (r.proposal.kind === 'land' && r.proposal.status === 'passed') window.dispatchEvent(new Event('land-changed'));
      } catch (err) {
        const status = box.querySelector('[data-vote-status]');
        if (status) status.textContent = err.message || host._t.voteFailed;
        box.querySelectorAll('button').forEach((b) => (b.disabled = false));
        return;
      }
      box.innerHTML = proposalHtml(council.proposal, host._t);
    });
  }

  // While the council meets, those who cannot write it see the leader's changes.
  if (live && !data.councils.some((c) => c.can_edit)) {
    host._councilTimer = setInterval(() => {
      if (!host.isConnected) clearInterval(host._councilTimer);
      else renderCouncil(host, options);
    }, 6000);
  }

  // A village is an ally or an enemy, not both: ticking one clears the other.
  // And at most two of each: when two are ticked, the others cannot be ticked.
  const limitTicks = (section) => {
    for (const name of ['allies', 'enemies']) {
      const boxes = [...section.querySelectorAll(`input[name="${name}"]`)];
      const full = boxes.filter((b) => b.checked).length >= 2;
      boxes.forEach((b) => (b.disabled = full && !b.checked));
    }
  };
  host.querySelectorAll('[data-council]').forEach(limitTicks);
  host.addEventListener('change', (e) => {
    const box = e.target;
    if (!(box instanceof HTMLInputElement) || box.type !== 'checkbox') return;
    const section = box.closest('[data-council]');
    if (box.checked) {
      const other = box.name === 'allies' ? 'enemies' : 'allies';
      section.querySelectorAll(`input[name="${other}"]`).forEach((o) => {
        if (o.value === box.value) o.checked = false;
      });
    }
    limitTicks(section);
  });

  // The land: how much each direction would give, for the leader while the council meets.
  host.querySelectorAll('[data-land]').forEach(async (box) => {
    const id = box.dataset.land;
    const draw = async (message = '') => {
      let p;
      try {
        p = await landPreview(id);
      } catch {
        return;
      }
      const head = `<span class="field-label">${t.landTitle}</span>`;
      if (!p.can) {
        const when = p.next_at ? t.landNext(new Date(p.next_at).toLocaleString(lang === 'no' ? 'nb-NO' : 'en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })) : h(p.reason || '');
        box.innerHTML = `${head}<p class="muted">${message || when}</p>`;
        return;
      }
      box.innerHTML = `${head}<p class="muted">${message || t.landLede(p.cells, p.radius)}</p><div class="land-dirs">${p.options
        .map((o) => `<span class="land-dir"><button type="button" class="small-btn" data-dir="${h(o.dir)}" ${o.cells < 6 ? 'disabled' : ''}>${h(o.label)} <span class="muted">${o.cells < 6 ? '–' : t.landSquares(o.cells)}</span></button>${o.contest ? ` <button type="button" class="small-btn contest" data-dir="${h(o.dir)}" data-mode="contest">${h(t.landFrom(o.contest.target_name, o.contest.cells))}</button>` : ''}</span>`)
        .join('')}</div>`;
    };
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-dir]');
      if (!b) return;
      box.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        const r = await landClaim(id, b.dataset.dir, b.dataset.mode || 'free');
        window.dispatchEvent(new Event('land-changed'));
        await draw(t.landProposed);
      } catch (err) {
        await draw(err.message || t.landFailed);
      }
    });
    draw();
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
          leader_pid: section.querySelector('[name="leader"]')?.value || null,
          government: val('government'),
          god: val('god'),
          laws: val('laws'),
          allies: ticked('allies'),
          enemies: ticked('enemies'),
        });
        status.textContent = live ? t.proposalSent : t.saved;
        data = await loadCouncils().then((d) => (tribeId ? { ...d, councils: d.councils.filter((c) => c.tribe_id === tribeId) } : d)).catch(() => data);
        drawProposals();
        // Handing over the leadership: show the council as the new leader's.
        const before = data.councils.find((c) => c.tribe_id === section.dataset.council);
        const chosen = section.querySelector('[name="leader"]')?.value;
        if (before && before.leader && chosen && before.leader.pid !== chosen) setTimeout(() => renderCouncil(host, options), 600);
      } catch (err) {
        status.textContent = err.code === 'translation_unavailable' ? t.translateFailed : err.message || t.failed;
      } finally {
        button.disabled = false;
      }
    })
  );
}
