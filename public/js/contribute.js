import { loadSubmissions, sendSubmission } from './api.js';
import { CHARTERS, allFields } from './charters.js';
import { escapeHtml } from './translate.js';

// Temporary page where students type in their village (one per group) and
// their own villager. Everything lands as "pending" until the teacher
// approves it on /admin.html. Drafts are kept in localStorage so a closed
// tab or an expired login never costs a student their writing.

const MAP_IMAGE = '/assets/images/lore/overview-map.jpg';
const STATUS_LABEL = { pending: 'Waiting for teacher', approved: 'Approved', rejected: 'Not approved', archived: 'Archived' };

let root;
let data;
let tab = 'village';
const editing = { village: null, villager: null };
const form = { village: {}, villager: {} };

function draftKey(kind) {
  return `contribute-draft-${kind}-${editing[kind]?.id || 'new'}`;
}

function saveDraft(kind) {
  try {
    localStorage.setItem(draftKey(kind), JSON.stringify(form[kind]));
  } catch {}
}

function loadDraft(kind) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(kind)) || 'null');
  } catch {
    return null;
  }
}

function clearDraft(kind) {
  try {
    localStorage.removeItem(draftKey(kind));
  } catch {}
}

function formFromSubmission(kind, sub) {
  if (kind === 'village') {
    const t = sub.territory || {};
    return {
      type: sub.charter_type || 'village',
      charter: { ...(sub.charter || {}) },
      map: Number.isFinite(t.map_x) && Number.isFinite(t.map_y) ? { x: t.map_x, y: t.map_y } : null,
    };
  }
  return { type: 'villager', charter: { ...(sub.charter || {}) }, tribe_id: sub.tribe_id || '' };
}

function startEditing(kind, sub) {
  editing[kind] = sub;
  form[kind] = loadDraft(kind) || formFromSubmission(kind, sub);
}

function startNew(kind) {
  editing[kind] = null;
  form[kind] = loadDraft(kind) || (kind === 'village' ? { type: 'village', charter: {}, map: null } : { type: 'villager', charter: {}, tribe_id: '' });
}

function pickInitialForms() {
  const pendingVillage = data.mine.villages.find((v) => v.status === 'pending');
  const pendingVillager = data.mine.villagers.find((v) => v.status === 'pending');
  pendingVillage ? startEditing('village', pendingVillage) : startNew('village');
  pendingVillager ? startEditing('villager', pendingVillager) : startNew('villager');
}

function renderSubmissionList() {
  const items = [
    ...data.mine.villages.map((v) => ({ kind: 'village', sub: v, label: v.charter_type === 'shadow' ? 'Shadow village' : 'Village' })),
    ...data.mine.villagers.map((v) => ({ kind: 'villager', sub: v, label: 'Villager' })),
  ];
  if (!items.length) return '<p class="muted">Nothing sent yet.</p>';
  return `<ul class="submission-list">${items
    .map(
      ({ kind, sub, label }) => `
      <li>
        <span><strong>${escapeHtml(sub.name)}</strong> <span class="muted">· ${label}</span></span>
        <span class="status-badge status-${escapeHtml(sub.status)}">${STATUS_LABEL[sub.status] || escapeHtml(sub.status)}</span>
        ${sub.status === 'pending' && data.open ? `<button class="small-btn" data-edit-kind="${kind}" data-edit-id="${escapeHtml(sub.id)}">Edit</button>` : ''}
      </li>`
    )
    .join('')}</ul>`;
}

function renderField(field, value) {
  const label = field.label
    ? `<span class="field-label">${escapeHtml(field.label)}${field.required ? ' *' : ''} <span class="no-help">${escapeHtml(field.labelNo || '')}</span></span>`
    : '';
  const input =
    field.type === 'text'
      ? `<input type="text" name="${field.key}" maxlength="${field.key === 'name' ? 60 : 200}" value="${escapeHtml(value || '')}">`
      : `<textarea name="${field.key}" rows="4" maxlength="2000">${escapeHtml(value || '')}</textarea>`;
  return `<label class="charter-field">${label}${input}</label>`;
}

function renderMapPicker(map) {
  const marker = map ? `style="left:${map.x}%;top:${map.y}%"` : 'hidden';
  return `
    <div class="charter-field">
      <span class="field-label">Click the map where your village is <span class="no-help">Klikk på kartet der landsbyen ligger</span></span>
      <div class="map-picker" id="map-picker">
        <img src="${MAP_IMAGE}" alt="Map of the world" draggable="false">
        <div class="map-marker" id="map-marker" ${marker}></div>
      </div>
    </div>`;
}

function renderSections(kind) {
  const f = form[kind];
  const sections = CHARTERS[f.type].sections;
  return sections
    .map(
      (s) => `
      <section class="charter-section">
        <div class="charter-head">
          <span class="charter-num">${s.num}</span>
          <div>
            <h3>${escapeHtml(s.title)}</h3>
            <p class="no-help">${escapeHtml(s.titleNo)}</p>
          </div>
        </div>
        ${s.lede ? `<p class="charter-lede">${escapeHtml(s.lede)}</p>` : ''}
        ${
          s.prompts.length
            ? `<ul class="charter-prompts">${s.prompts
                .map((p, i) => `<li>${escapeHtml(p)}<span class="no-help">${escapeHtml(s.promptsNo[i] || '')}</span></li>`)
                .join('')}</ul>`
            : ''
        }
        ${s.fields.map((field) => renderField(field, f.charter[field.key])).join('')}
        ${kind === 'village' && s.num === 'II' ? renderMapPicker(f.map) : ''}
      </section>`
    )
    .join('');
}

function renderForm() {
  const kind = tab;
  const f = form[kind];
  const isEditing = !!editing[kind];

  let top = '';
  if (kind === 'village') {
    top = `
      <p class="muted">One person per group writes the village. <span class="no-help">Én i gruppa skriver inn landsbyen.</span></p>
      <div class="type-switch">
        <label><input type="radio" name="charter-type" value="village" ${f.type === 'village' ? 'checked' : ''}> Village Charter</label>
        <label><input type="radio" name="charter-type" value="shadow" ${f.type === 'shadow' ? 'checked' : ''}> Shadow Charter <span class="no-help">(den onde landsbyen)</span></label>
      </div>`;
  } else {
    const options = data.villages
      .map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === f.tribe_id ? 'selected' : ''}>${escapeHtml(v.name)}${v.status === 'pending' ? ' (waiting for teacher)' : ''}</option>`)
      .join('');
    top = `
      <p class="muted">Everyone writes their own villager. <span class="no-help">Alle skriver sin egen innbygger.</span></p>
      <label class="charter-field">
        <span class="field-label">Your village * <span class="no-help">Landsbyen din</span></span>
        <select name="tribe_id"><option value="">Choose your village…</option>${options}</select>
      </label>
      ${data.villages.length ? '' : '<p class="error">No villages yet — your group has to send in the village first.</p>'}`;
  }

  root.querySelector('#contribute-form').innerHTML = `
    ${isEditing ? `<p class="editing-note">Editing: <strong>${escapeHtml(editing[kind].name)}</strong></p>` : ''}
    ${top}
    ${renderSections(kind)}
    <div class="submit-row">
      <button class="choice-btn" id="send-btn" ${data.open ? '' : 'disabled'}>${isEditing ? 'Save changes' : 'Send to teacher'}</button>
      <span id="send-status" class="muted" role="status"></span>
    </div>`;

  wireForm(kind);
}

function wireForm(kind) {
  const formEl = root.querySelector('#contribute-form');

  formEl.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'charter-type') return;
    if (t.name === 'tribe_id') form[kind].tribe_id = t.value;
    else if (t.name) form[kind].charter[t.name] = t.value;
    saveDraft(kind);
  });

  formEl.querySelectorAll('input[name="charter-type"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      form.village.type = radio.value;
      saveDraft('village');
      renderPage();
    });
  });

  const picker = formEl.querySelector('#map-picker');
  if (picker) {
    picker.addEventListener('click', (e) => {
      const rect = picker.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      form.village.map = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
      const marker = picker.querySelector('#map-marker');
      marker.style.left = `${form.village.map.x}%`;
      marker.style.top = `${form.village.map.y}%`;
      marker.hidden = false;
      saveDraft('village');
    });
  }

  formEl.querySelector('#send-btn').addEventListener('click', () => send(kind));
}

async function send(kind) {
  const f = form[kind];
  const statusEl = root.querySelector('#send-status');
  const btn = root.querySelector('#send-btn');

  if (!(f.charter.name || '').trim()) {
    statusEl.textContent = 'Please write a name first.';
    return;
  }
  if (kind === 'villager' && !f.tribe_id) {
    statusEl.textContent = 'Please choose your village.';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = 'Sending…';
  try {
    // Only send answers for the chosen sheet - switching Village/Shadow
    // back and forth would otherwise leave the other sheet's answers behind.
    const charter = {};
    for (const field of allFields(f.type)) {
      if (f.charter[field.key]) charter[field.key] = f.charter[field.key];
    }
    const payload = { type: f.type, id: editing[kind]?.id, charter };
    if (kind === 'village') payload.map = f.map;
    else payload.tribe_id = f.tribe_id;
    const { id } = await sendSubmission(payload);

    clearDraft(kind);
    data = await loadSubmissions();
    const list = kind === 'village' ? data.mine.villages : data.mine.villagers;
    const saved = list.find((s) => s.id === id);
    if (saved) startEditing(kind, saved);
    renderPage();
    root.querySelector('#send-status').textContent = 'Sent! Your teacher will look at it.';
  } catch (err) {
    btn.disabled = false;
    statusEl.textContent = err.message;
  }
}

function renderPage() {
  root.innerHTML = `
    <div class="contribute">
      <h2>Contribute</h2>
      <p>Write your answers in <strong>English</strong>. The grey text is Norwegian help. Your writing is saved on this computer while you type.</p>
      ${data.open ? '' : '<p class="error">Sending is closed right now. <span class="no-help">Innsending er stengt akkurat nå.</span></p>'}
      <section class="my-submissions">
        <h3>My submissions</h3>
        ${renderSubmissionList()}
      </section>
      <div class="contribute-tabs" role="tablist">
        <button class="lore-tab ${tab === 'village' ? 'active' : ''}" data-tab="village">Our village</button>
        <button class="lore-tab ${tab === 'villager' ? 'active' : ''}" data-tab="villager">My villager</button>
      </div>
      <div id="contribute-form"></div>
    </div>`;

  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      renderPage();
    });
  });

  root.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.editKind;
      const list = kind === 'village' ? data.mine.villages : data.mine.villagers;
      const sub = list.find((s) => s.id === btn.dataset.editId);
      if (!sub) return;
      startEditing(kind, sub);
      tab = kind;
      renderPage();
    });
  });

  renderForm();
}

export async function renderContribute(container) {
  root = container;
  root.innerHTML = '<p>Loading…</p>';
  try {
    data = await loadSubmissions();
  } catch (err) {
    root.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    return;
  }
  pickInitialForms();
  renderPage();
}
