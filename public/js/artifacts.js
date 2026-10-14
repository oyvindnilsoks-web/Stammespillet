import { artifactList, artifactAdd, artifactDelete } from './api.js';
import { openPhoto, pngBase64 } from './scan.js';
import { mediaUrl } from './content.js';
import { escapeHtml } from './translate.js';

// The "Artifact" tab on the Contribute page: draw something on paper (a sword, a
// map, a lucky charm, a key), take a photo, and the game scans it: the paper goes
// away and the drawing is left. The teacher approves it and chooses the rank on the
// XP ladder where it unlocks, and then it lies in the backpack of everyone who
// reaches that rank.

const TEXT = {
  en: {
    loading: 'Loading…',
    intro: 'Draw an artifact on white paper: a sword, a key, a map, a lucky charm, something from your village. Take a photo of it with even light. The game scans it: the paper goes away and only your drawing is left. When the teacher has approved it, it unlocks in the backpack of every player who has climbed high enough on the XP ladder.',
    mine: 'Your artifacts',
    none: 'You have not sent any artifacts yet.',
    name: 'Name of the artifact',
    description: 'What is it? Who made it, and what can it do? (short)',
    photo: 'A photo of your drawing',
    strength: 'Take away more or less of the paper',
    preview: 'This is what is scanned:',
    send: 'Send to the teacher',
    sending: 'Sending…',
    sent: '✓ Sent. The teacher will look at it.',
    del: 'Take away',
    full: (n) => `You have ${n} artifacts, which is the most. Take one away to add another.`,
    status: { pending: 'Waiting for the teacher', approved: 'Approved', rejected: 'Not approved' },
    unlocks: (rank, name) => `Unlocks at rank ${rank} (${name})`,
    needName: 'Give the artifact a name.',
    needPhoto: 'Choose a photo of your drawing first.',
    noDrawing: 'We could not find a drawing in the photo. Use white paper, even light and darker lines, or change the slider.',
    failed: 'Could not send. Try again.',
    loadFailed: 'Could not load your artifacts.',
  },
  no: {
    loading: 'Laster …',
    intro: 'Tegn en artefakt på hvitt papir: et sverd, en nøkkel, et kart, en lykkebringer, noe fra landsbyen din. Ta bilde av den med jevnt lys. Spillet skanner den: papiret forsvinner, og bare tegningen din blir igjen. Når læreren har godkjent den, låses den opp i ryggsekken til alle spillere som har kommet høyt nok på XP-stigen.',
    mine: 'Artefaktene dine',
    none: 'Du har ikke sendt inn noen artefakter ennå.',
    name: 'Navn på artefakten',
    description: 'Hva er det? Hvem laget den, og hva kan den gjøre? (kort)',
    photo: 'Et bilde av tegningen din',
    strength: 'Fjern mer eller mindre av papiret',
    preview: 'Dette blir skannet:',
    send: 'Send til læreren',
    sending: 'Sender …',
    sent: '✓ Sendt. Læreren ser på den.',
    del: 'Ta bort',
    full: (n) => `Du har ${n} artefakter, som er maks. Ta bort en for å legge til en ny.`,
    status: { pending: 'Venter på læreren', approved: 'Godkjent', rejected: 'Ikke godkjent' },
    unlocks: (rank, name) => `Låses opp på trinn ${rank} (${name})`,
    needName: 'Gi artefakten et navn.',
    needPhoto: 'Velg et bilde av tegningen først.',
    noDrawing: 'Vi fant ikke noen tegning i bildet. Bruk hvitt papir, jevnt lys og mørkere streker, eller flytt glidebryteren.',
    failed: 'Kunne ikke sende. Prøv igjen.',
    loadFailed: 'Kunne ikke hente artefaktene dine.',
  },
};

const h = escapeHtml;

export async function renderArtifacts(host, { lang }) {
  const t = TEXT[lang === 'no' ? 'no' : 'en'];
  host.innerHTML = `<p>${t.loading}</p>`;
  let data;
  try {
    data = await artifactList();
  } catch {
    host.innerHTML = `<p class="error">${t.loadFailed}</p>`;
    return;
  }
  const names = data.ladder ? data.ladder.names : [];
  const rows = data.mine.length
    ? data.mine
        .map(
          (a) => `<li class="artifact-row">
            <img class="artifact-img" src="${h(mediaUrl(a.storage_path))}" alt="">
            <div><strong>${h(a.name)}</strong><br><span class="muted">${h(t.status[a.status] || a.status)}${a.status === 'approved' ? ` · ${h(t.unlocks(a.rank_required, names[a.rank_required - 1] || ''))}` : ''}</span><br>${h(a.description)}</div>
            <button class="small-btn danger" data-delete="${h(a.id)}">${t.del}</button></li>`
        )
        .join('')
    : `<li class="muted">${t.none}</li>`;
  const form = `<div class="artifact-form">
          <label class="charter-field"><span class="field-label">${t.name}</span><input type="text" id="artifact-name" maxlength="40"></label>
          <label class="charter-field"><span class="field-label">${t.description}</span><textarea id="artifact-description" rows="3" maxlength="200"></textarea></label>
          <label class="charter-field"><span class="field-label">${t.photo}</span><input type="file" id="artifact-photo" accept="image/*"></label>
          <div id="artifact-scan" hidden>
            <label class="charter-field"><span class="field-label">${t.strength}</span><input type="range" id="artifact-strength" min="15" max="110" value="45"></label>
            <p class="muted">${t.preview}</p>
            <div class="artifact-preview" id="artifact-preview"></div>
          </div>
          <p class="council-actions"><button class="choice-btn" id="artifact-send" disabled>${t.send}</button> <span class="muted" id="artifact-status" role="status"></span></p>
        </div>`;
  host.innerHTML = `<p class="charter-lede">${t.intro}</p><h3>${t.mine}</h3><ul class="artifact-list">${rows}</ul>${form}`;

  host.querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await artifactDelete(button.dataset.delete);
      } finally {
        renderArtifacts(host, { lang });
      }
    })
  );
  const status = host.querySelector('#artifact-status');
  const send = host.querySelector('#artifact-send');
  const strength = host.querySelector('#artifact-strength');
  const preview = host.querySelector('#artifact-preview');
  let photo = null;
  let scanned = null;

  const rescan = () => {
    if (!photo) return;
    scanned = photo.scan(Number(strength.value));
    preview.innerHTML = '';
    if (!scanned) {
      status.textContent = t.noDrawing;
      send.disabled = true;
      return;
    }
    status.textContent = '';
    scanned.canvas.className = 'artifact-canvas';
    preview.appendChild(scanned.canvas);
    send.disabled = false;
  };

  host.querySelector('#artifact-photo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    host.querySelector('#artifact-scan').hidden = !file;
    photo = null;
    scanned = null;
    send.disabled = true;
    if (!file) return;
    try {
      photo = await openPhoto(file);
    } catch {
      status.textContent = t.noDrawing;
      return;
    }
    rescan();
  });
  strength.addEventListener('input', rescan);

  send.addEventListener('click', async () => {
    const name = host.querySelector('#artifact-name').value.trim();
    if (!name) {
      status.textContent = t.needName;
      return;
    }
    if (!scanned) {
      status.textContent = t.needPhoto;
      return;
    }
    send.disabled = true;
    status.textContent = t.sending;
    try {
      await artifactAdd({ name, description: host.querySelector('#artifact-description').value, data: pngBase64(scanned.canvas) });
      status.textContent = t.sent;
      setTimeout(() => renderArtifacts(host, { lang }), 900);
    } catch (err) {
      status.textContent = err.message || t.failed;
      send.disabled = false;
    }
  });
}
