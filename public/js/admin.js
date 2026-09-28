import { CHARTERS } from './charters.js';
import { escapeHtml } from './translate.js';
import { supabase } from './supabaseClient.js';
import { imageUrl, mediaUrl } from './content.js';

// Teacher admin page. Everything goes through /api/admin (service role on
// the server, guarded by the admin cookie); the browser only talks to
// Supabase directly to upload a file to a one-time signed upload URL.

const app = document.getElementById('admin-app');
const nav = document.getElementById('admin-nav');

const STATUSES = ['pending', 'approved', 'rejected', 'archived'];
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', archived: 'Archived' };
const MEDIA_KINDS = [
  ['shield', 'Shield / coat of arms'],
  ['drawing', 'Drawing'],
  ['song', 'Song'],
  ['image', 'Image'],
  ['other', 'Other'],
];
const MAP_IMAGE = '/assets/images/lore/overview-map.jpg';

let data = null;
let view = 'villages';
let filter = 'pending';
let selectedId = null;

const h = escapeHtml;

function who(submittedBy) {
  return (submittedBy || '').replace(/^(name|dev):/, '') || 'teacher';
}

function badge(status) {
  return `<span class="status-badge status-${h(status)}">${STATUS_LABEL[status] || h(status)}</span>`;
}

async function api(method, body) {
  const res = await fetch('/api/admin', {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    showLogin(data ? 'Your admin session ended - log in again.' : undefined);
    throw new Error('Logged out');
  }
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

function flash(message, isError = false) {
  const el = document.getElementById('admin-flash');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'admin-flash error' : 'admin-flash';
  el.hidden = false;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => (el.hidden = true), 5000);
}

async function run(action, successMessage) {
  try {
    await action();
    await reload();
    if (successMessage) flash(successMessage);
  } catch (err) {
    if (err.message !== 'Logged out') flash(err.message, true);
  }
}

// ---------- login ----------

function showLogin(message) {
  nav.innerHTML = '';
  app.innerHTML = `
    <div class="login-box">
      <h1>Teacher admin</h1>
      <form id="admin-login">
        <label for="admin-pw" class="muted">Password</label>
        <input id="admin-pw" type="password" autocomplete="current-password" required>
        <button type="submit" class="choice-btn">Log in</button>
      </form>
      <p id="admin-login-error" class="error" ${message ? '' : 'hidden'}>${h(message || '')}</p>
    </div>`;

  document.getElementById('admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('admin-login-error');
    errorEl.hidden = true;
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('admin-pw').value }),
    });
    if (!res.ok) {
      errorEl.textContent = res.status === 401 ? 'Wrong password.' : 'Could not log in.';
      errorEl.hidden = false;
      return;
    }
    await reload();
  });
}

async function logout() {
  await fetch('/api/admin/login', { method: 'DELETE', credentials: 'same-origin' });
  showLogin();
}

// ---------- data helpers ----------

async function reload() {
  data = await api('GET');
  render();
}

function records() {
  return view === 'villages' ? data.villages : data.villagers;
}

function villageName(id) {
  return data.villages.find((v) => v.id === id)?.name || id || '–';
}

function villageFields(v) {
  const t = v.territory || {};
  return {
    name: v.name,
    region_name: t.region_name || '',
    resource: v.resource || '',
    culture: v.culture || '',
    population: v.population ?? '',
    charter_type: v.charter_type,
    map_x: t.map_x ?? '',
    map_y: t.map_y ?? '',
    relations: v.relations || {},
    image: v.image || '',
  };
}

function villagerFields(c) {
  return {
    name: c.name,
    role: c.role || '',
    tribe_id: c.tribe_id,
    strengths: (c.strengths || []).join('\n'),
    weaknesses: (c.weaknesses || []).join('\n'),
    goal: c.goal || '',
    description: c.description || '',
    student_name: c.student_name || '',
    image: c.image || '',
  };
}

// ---------- rendering ----------

function renderNav() {
  const pendingVillages = data.villages.filter((v) => v.status === 'pending').length;
  const pendingVillagers = data.villagers.filter((c) => c.status === 'pending').length;
  const count = (n) => (n ? ` <span class="count-badge">${n}</span>` : '');
  nav.innerHTML = `
    <button data-view="villages" class="${view === 'villages' ? 'active' : ''}">Villages${count(pendingVillages)}</button>
    <button data-view="villagers" class="${view === 'villagers' ? 'active' : ''}">Villagers${count(pendingVillagers)}</button>
    <button data-view="settings" class="${view === 'settings' ? 'active' : ''}">Settings</button>
    <a href="#" id="admin-logout">Log out</a>`;
  nav.querySelectorAll('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => {
      view = btn.dataset.view;
      selectedId = null;
      render();
    })
  );
  nav.querySelector('#admin-logout').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

function render() {
  renderNav();
  if (view === 'settings') {
    renderSettings();
    return;
  }

  const all = records();
  const shown = filter === 'all' ? all : all.filter((r) => r.status === filter);
  if (selectedId && !all.some((r) => r.id === selectedId)) selectedId = null;

  const chips = [...STATUSES, 'all']
    .map((s) => {
      const n = s === 'all' ? all.length : all.filter((r) => r.status === s).length;
      return `<button class="filter-chip ${filter === s ? 'active' : ''}" data-filter="${s}">${s === 'all' ? 'All' : STATUS_LABEL[s]} (${n})</button>`;
    })
    .join('');

  const list = shown.length
    ? shown
        .map(
          (r) => `
        <li class="${r.id === selectedId ? 'selected' : ''}" data-id="${h(r.id)}">
          <strong>${h(r.name)}</strong>
          <span class="muted">${
            view === 'villages'
              ? r.charter_type === 'shadow' ? 'Shadow village' : 'Village'
              : h(villageName(r.tribe_id))
          } · ${h(who(r.submitted_by))}</span>
          ${badge(r.status)}
        </li>`
        )
        .join('')
    : '<li class="muted">Nothing here.</li>';

  app.innerHTML = `
    <p id="admin-flash" class="admin-flash" hidden></p>
    <div class="filter-row">${chips}</div>
    <div class="admin-layout">
      <ul class="admin-list">${list}</ul>
      <div class="admin-detail" id="admin-detail">
        ${selectedId ? '' : `<p class="muted">Choose a ${view === 'villages' ? 'village' : 'villager'} from the list.</p>`}
      </div>
    </div>`;

  app.querySelectorAll('[data-filter]').forEach((btn) =>
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      render();
    })
  );
  app.querySelectorAll('.admin-list [data-id]').forEach((li) =>
    li.addEventListener('click', () => {
      selectedId = li.dataset.id;
      render();
    })
  );

  if (selectedId) {
    const record = all.find((r) => r.id === selectedId);
    if (view === 'villages') renderVillageDetail(record);
    else renderVillagerDetail(record);
  }
}

function statusButtons(table, record) {
  const buttons = [
    ['approved', 'Approve'],
    ['rejected', 'Reject'],
    ['archived', 'Archive'],
    ['pending', 'Back to pending'],
  ]
    .filter(([s]) => s !== record.status)
    .map(([s, label]) => `<button class="small-btn" data-status="${s}">${label}</button>`)
    .join('');
  return `<div class="status-actions">${buttons}<button class="small-btn danger" data-delete>Delete</button></div>`;
}

function wireStatusButtons(table, record) {
  const detail = document.getElementById('admin-detail');
  detail.querySelectorAll('[data-status]').forEach((btn) =>
    btn.addEventListener('click', () =>
      run(
        () => api('POST', { action: 'set-status', table, id: record.id, status: btn.dataset.status }),
        `${record.name}: ${STATUS_LABEL[btn.dataset.status]}`
      )
    )
  );
  detail.querySelector('[data-delete]').addEventListener('click', () => {
    if (!confirm(`Delete "${record.name}" for good? This cannot be undone. (Archive hides it instead.)`)) return;
    run(() => api('POST', { action: 'delete', table, id: record.id }), `Deleted ${record.name}`);
  });
}

function renderAnswers(type, charter) {
  const def = CHARTERS[type];
  const known = new Set();
  const sections = def.sections
    .map((s) => {
      const rows = s.fields
        .map((f) => {
          known.add(f.key);
          const value = charter[f.key];
          if (!value) return '';
          return `<div class="answer">${f.label ? `<span class="answer-label">${h(f.label)}</span>` : ''}<p>${h(value)}</p></div>`;
        })
        .join('');
      return rows ? `<div class="answer-section"><h4>${s.num}. ${h(s.title)}</h4>${rows}</div>` : '';
    })
    .join('');
  const extra = Object.entries(charter)
    .filter(([k]) => !known.has(k))
    .map(([k, v]) => `<div class="answer"><span class="answer-label">${h(k)}</span><p>${h(v)}</p></div>`)
    .join('');
  const body = sections + (extra ? `<div class="answer-section"><h4>Other answers</h4>${extra}</div>` : '');
  return body || '<p class="muted">No answers stored (added by the teacher, or from the old paper sheets).</p>';
}

function renderMediaList(owner) {
  const items = data.media.filter((m) => m[owner.column] === owner.id);
  if (!items.length) return '<p class="muted">No media yet.</p>';
  return `<ul class="admin-media-list">${items
    .map((m) => {
      const url = mediaUrl(m.storage_path);
      const type = m.mime_type || '';
      let preview = '';
      if (url && type.startsWith('image/')) preview = `<img src="${h(url)}" alt="">`;
      else if (url && type.startsWith('audio/')) preview = `<audio controls preload="none" src="${h(url)}"></audio>`;
      else if (url) preview = `<a href="${h(url)}" target="_blank" rel="noopener">Open file</a>`;
      const kindLabel = MEDIA_KINDS.find(([k]) => k === m.kind)?.[1] || m.kind;
      return `
        <li>
          <div><strong>${h(m.title || kindLabel)}</strong> <span class="muted">· ${h(kindLabel)}</span></div>
          ${preview}
          ${m.body ? `<p class="media-body">${h(m.body)}</p>` : ''}
          <div class="status-actions">
            ${url && type.startsWith('image/') ? `<button class="small-btn" data-main-image="${h(url)}">Use as main image</button>` : ''}
            <button class="small-btn danger" data-delete-media="${h(m.id)}">Delete</button>
          </div>
        </li>`;
    })
    .join('')}</ul>`;
}

function mediaUploadForm() {
  return `
    <form class="media-upload" id="media-upload">
      <label>Type
        <select name="kind">${MEDIA_KINDS.map(([k, label]) => `<option value="${k}">${label}</option>`).join('')}</select>
      </label>
      <label>Title <input type="text" name="title" maxlength="120" placeholder="e.g. The Song of the Wave"></label>
      <label>Text (lyrics, description) <textarea name="body" rows="3" maxlength="8000"></textarea></label>
      <label>File (image, sound, PDF) <input type="file" name="file" accept="image/*,audio/*,application/pdf"></label>
      <button type="submit" class="choice-btn">Add</button>
      <span class="muted" id="upload-status"></span>
    </form>`;
}

async function uploadMedia(owner, formEl) {
  const statusEl = formEl.querySelector('#upload-status');
  const file = formEl.file.files[0];
  const body = formEl.body.value;
  if (!file && !body.trim()) {
    statusEl.textContent = 'Choose a file or write some text.';
    return;
  }
  if (file && file.size > 50 * 1024 * 1024) {
    statusEl.textContent = 'The file is bigger than 50 MB.';
    return;
  }

  await run(async () => {
    let storagePath = null;
    if (file) {
      statusEl.textContent = 'Uploading…';
      const { path, token } = await api('POST', { action: 'upload-url', filename: file.name });
      const { error } = await supabase.storage.from('media').uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      storagePath = path;
    }
    await api('POST', {
      action: 'add-media',
      [owner.column]: owner.id,
      kind: formEl.kind.value,
      title: formEl.title.value,
      body,
      storage_path: storagePath,
      mime_type: file ? file.type : null,
    });
  }, 'Media added');
}

function wireMedia(owner, saveMainImage) {
  const detail = document.getElementById('admin-detail');
  const formEl = detail.querySelector('#media-upload');
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    uploadMedia(owner, formEl);
  });
  detail.querySelectorAll('[data-delete-media]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (!confirm('Delete this media for good?')) return;
      run(() => api('POST', { action: 'delete-media', id: btn.dataset.deleteMedia }), 'Media deleted');
    })
  );
  detail.querySelectorAll('[data-main-image]').forEach((btn) =>
    btn.addEventListener('click', () => run(() => saveMainImage(btn.dataset.mainImage), 'Main image updated'))
  );
}

function renderVillageDetail(v) {
  const f = villageFields(v);
  const others = data.villages.filter((o) => o.id !== v.id && o.status !== 'rejected');
  const relationRows = others
    .map((o) => {
      const current = f.relations[o.id] || '';
      const opts = ['', 'allied', 'rival', 'neutral']
        .map((r) => `<option value="${r}" ${r === current ? 'selected' : ''}>${r || '–'}</option>`)
        .join('');
      return `<label class="relation-row"><span>${h(o.name)}</span><select data-relation="${h(o.id)}">${opts}</select></label>`;
    })
    .join('');
  const members = data.villagers.filter((c) => c.tribe_id === v.id);
  const marker = f.map_x !== '' && f.map_y !== '' ? `style="left:${Number(f.map_x)}%;top:${Number(f.map_y)}%"` : 'hidden';

  document.getElementById('admin-detail').innerHTML = `
    <div class="detail-head">
      <h2>${h(v.name)}</h2>
      ${badge(v.status)}
      <p class="muted">${v.charter_type === 'shadow' ? 'Shadow Charter' : 'Village Charter'} · sent by ${h(who(v.submitted_by))}</p>
    </div>
    ${statusButtons('tribes', v)}

    <div class="detail-columns">
      <section>
        <h3>Shown in the game</h3>
        <form id="village-form" class="admin-form">
          <label>Name <input name="name" maxlength="60" value="${h(f.name)}"></label>
          <label>Region <input name="region_name" maxlength="80" value="${h(f.region_name)}"></label>
          <label>Resource <input name="resource" maxlength="300" value="${h(f.resource)}"></label>
          <label>Culture (short summary) <textarea name="culture" rows="4" maxlength="2000">${h(f.culture)}</textarea></label>
          <label>Population <input name="population" type="number" min="0" value="${h(f.population)}"></label>
          <label>Sheet type
            <select name="charter_type">
              <option value="village" ${f.charter_type !== 'shadow' ? 'selected' : ''}>Village</option>
              <option value="shadow" ${f.charter_type === 'shadow' ? 'selected' : ''}>Shadow (the evil village)</option>
            </select>
          </label>
          <label>Main image
            <input name="image" maxlength="500" value="${h(f.image)}" placeholder="Use a picture from Media below">
          </label>
          ${f.image ? `<img class="admin-main-image" src="${h(imageUrl(f.image))}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="charter-field">
            <span class="field-label">Map position (click the map)</span>
            <div class="map-picker admin-map" id="admin-map">
              <img src="${MAP_IMAGE}" alt="Map" draggable="false">
              <div class="map-marker" id="admin-map-marker" ${marker}></div>
            </div>
            <input type="hidden" name="map_x" value="${h(f.map_x)}">
            <input type="hidden" name="map_y" value="${h(f.map_y)}">
          </div>
          ${relationRows ? `<fieldset class="relations"><legend>Relations to other villages</legend>${relationRows}</fieldset>` : ''}
          <button type="submit" class="choice-btn">Save</button>
        </form>

        <h3>Media (shields, drawings, songs…)</h3>
        ${renderMediaList({ column: 'tribe_id', id: v.id })}
        ${mediaUploadForm()}

        <h3>Villagers (${members.length})</h3>
        ${
          members.length
            ? `<ul class="plain-list">${members.map((c) => `<li>${h(c.name)} ${badge(c.status)}</li>`).join('')}</ul>`
            : '<p class="muted">No villagers yet.</p>'
        }
      </section>

      <section>
        <h3>The students' answers</h3>
        ${renderAnswers(v.charter_type === 'shadow' ? 'shadow' : 'village', v.charter || {})}
      </section>
    </div>`;

  const formEl = document.getElementById('village-form');
  const mapEl = document.getElementById('admin-map');
  mapEl.addEventListener('click', (e) => {
    const rect = mapEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 100;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 100;
    formEl.map_x.value = x;
    formEl.map_y.value = y;
    const marker = document.getElementById('admin-map-marker');
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.hidden = false;
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const relations = {};
    formEl.querySelectorAll('[data-relation]').forEach((sel) => {
      if (sel.value) relations[sel.dataset.relation] = sel.value;
    });
    const fields = {
      name: formEl.name.value,
      region_name: formEl.region_name.value,
      resource: formEl.resource.value,
      culture: formEl.culture.value,
      population: formEl.population.value,
      charter_type: formEl.charter_type.value,
      image: formEl.image.value,
      map_x: formEl.map_x.value,
      map_y: formEl.map_y.value,
      relations,
    };
    run(() => api('POST', { action: 'save-village', id: v.id, fields }), 'Saved');
  });

  wireStatusButtons('tribes', v);
  wireMedia({ column: 'tribe_id', id: v.id }, (url) =>
    api('POST', { action: 'save-village', id: v.id, fields: { ...villageFields(v), image: url } })
  );
}

function renderVillagerDetail(c) {
  const f = villagerFields(c);
  const villageOptions = data.villages
    .map((v) => `<option value="${h(v.id)}" ${v.id === f.tribe_id ? 'selected' : ''}>${h(v.name)} (${STATUS_LABEL[v.status]})</option>`)
    .join('');

  document.getElementById('admin-detail').innerHTML = `
    <div class="detail-head">
      <h2>${h(c.name)}</h2>
      ${badge(c.status)}
      <p class="muted">${h(villageName(c.tribe_id))} · sent by ${h(who(c.submitted_by))}</p>
    </div>
    ${statusButtons('characters', c)}

    <div class="detail-columns">
      <section>
        <h3>Shown in the game</h3>
        <form id="villager-form" class="admin-form">
          <label>Name <input name="name" maxlength="60" value="${h(f.name)}"></label>
          <label>Role <input name="role" maxlength="120" value="${h(f.role)}"></label>
          <label>Village <select name="tribe_id">${villageOptions}</select></label>
          <label>Strengths (one per line) <textarea name="strengths" rows="3">${h(f.strengths)}</textarea></label>
          <label>Weaknesses (one per line) <textarea name="weaknesses" rows="3">${h(f.weaknesses)}</textarea></label>
          <label>Goal <textarea name="goal" rows="3" maxlength="2000">${h(f.goal)}</textarea></label>
          <label>Description <textarea name="description" rows="4" maxlength="2000">${h(f.description)}</textarea></label>
          <label>Student name (credits) <input name="student_name" maxlength="80" value="${h(f.student_name)}"></label>
          <label>Portrait
            <input name="image" maxlength="500" value="${h(f.image)}" placeholder="Use a picture from Media below">
          </label>
          ${f.image ? `<img class="admin-main-image" src="${h(imageUrl(f.image))}" alt="" onerror="this.style.display='none'">` : ''}
          <button type="submit" class="choice-btn">Save</button>
        </form>

        <h3>Media (portrait, drawings…)</h3>
        ${renderMediaList({ column: 'character_id', id: c.id })}
        ${mediaUploadForm()}
      </section>

      <section>
        <h3>The student's answers</h3>
        ${renderAnswers('villager', c.charter || {})}
      </section>
    </div>`;

  const formEl = document.getElementById('villager-form');
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = {
      name: formEl.name.value,
      role: formEl.role.value,
      tribe_id: formEl.tribe_id.value,
      strengths: formEl.strengths.value,
      weaknesses: formEl.weaknesses.value,
      goal: formEl.goal.value,
      description: formEl.description.value,
      student_name: formEl.student_name.value,
      image: formEl.image.value,
    };
    run(() => api('POST', { action: 'save-villager', id: c.id, fields }), 'Saved');
  });

  wireStatusButtons('characters', c);
  wireMedia({ column: 'character_id', id: c.id }, (url) =>
    api('POST', { action: 'save-villager', id: c.id, fields: { ...villagerFields(c), image: url } })
  );
}

function renderSettings() {
  const open = data.settings.submissions_open !== false;
  app.innerHTML = `
    <p id="admin-flash" class="admin-flash" hidden></p>
    <section class="admin-settings">
      <h2>Settings</h2>
      <label class="toggle-row">
        <input type="checkbox" id="setting-open" ${open ? 'checked' : ''}>
        <span>Students can send in villages and villagers <span class="muted">(the Contribute page)</span></span>
      </label>
      <p class="muted">When this is off, students can still see what they sent, but cannot send or change anything.</p>
    </section>`;

  document.getElementById('setting-open').addEventListener('change', (e) =>
    run(
      () => api('POST', { action: 'set-setting', key: 'submissions_open', value: e.target.checked }),
      e.target.checked ? 'Sending is open' : 'Sending is closed'
    )
  );
}

reload().catch((err) => {
  if (err.message !== 'Logged out') showLogin();
});
