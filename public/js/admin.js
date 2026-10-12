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
let feideEnabled = false;

const h = escapeHtml;

// Who sent a submission: the Feide name from the students table, or the
// typed name from the old name login.
function who(submittedBy) {
  const id = submittedBy || '';
  if (id.startsWith('feide:')) return data?.owners?.[id] || 'unknown student';
  return id.replace(/^(name|dev):/, '') || 'teacher';
}

// "Group: Kari, Ola · Group code: ABC234" for a village written by a group.
function groupLine(village) {
  const ids = data?.members?.[village.id] || [];
  if (ids.length < 2 && !village.join_code) return '';
  const names = ids.map((id) => who(id)).join(', ');
  const parts = [];
  if (ids.length) parts.push(`Group: ${h(names)}`);
  if (village.join_code) parts.push(`Group code: <strong>${h(village.join_code)}</strong>`);
  return `<p class="muted">${parts.join(' · ')}</p>`;
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
      ${
        feideEnabled
          ? `<a class="choice-btn feide-btn" href="/api/auth/login?next=/admin.html">Log in with Feide</a>
             <p class="muted">Or use the password.</p>`
          : ''
      }
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
  if (feideEnabled) {
    window.location.href = '/api/auth/logout';
    return;
  }
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
    <button data-view="councils" class="${view === 'councils' ? 'active' : ''}">Councils</button>
    <button data-view="world" class="${view === 'world' ? 'active' : ''}">The poison</button>
    <button data-view="students" class="${view === 'students' ? 'active' : ''}">Students</button>
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

// The poison of the evil villages: how far it has spread, and the controls.
function renderWorld() {
  const w = data.world;
  if (!w) {
    app.innerHTML = '<p class="admin-flash error">Could not load the poison. Reload the page.</p>';
    return;
  }
  const evil = data.villages.filter((v) => v.status === 'approved' && v.charter_type === 'shadow').length;
  const last = w.last_step_at ? new Date(w.last_step_at).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : 'never';
  const speeds = [1, 2, 5, 10, 20, 30, 60].map((m) => `<option value="${m}" ${m === w.speed_minutes ? 'selected' : ''}>every ${m} minute${m === 1 ? '' : 's'}</option>`).join('');
  app.innerHTML = `
    <p id="admin-flash" class="admin-flash" hidden></p>
    <section class="admin-settings">
      <h2>The poison</h2>
      <p class="muted">The evil villages spread poison across the map, one cell at a time. Good villages keep it away around them, and a student who solves a problem cleans around the villager's village. If the poison covers ${h(w.win_percent)}% of the map, the evil villages win. It only moves while it is <strong>running</strong>, and by default only on school days between 08:00 and 15:30.</p>
      <p><strong>${w.percent}%</strong> of the map is poisoned. Step ${w.step}. Last step: ${h(last)}. ${evil} approved evil village${evil === 1 ? '' : 's'}. ${w.result === 'evil' ? '<strong class="error">The poison has won.</strong> Reset it to start again.' : ''}</p>
      <div class="world-controls">
        <button class="small-btn" data-world-run="${w.paused ? 'start' : 'pause'}">${w.paused ? 'Start the poison' : 'Pause the poison'}</button>
        <button class="small-btn" data-world-step>Step now</button>
        <button class="small-btn danger" data-world-reset>Reset (clear all poison)</button>
      </div>
      <div class="world-controls">
        <label>Speed <select data-world-speed>${speeds}</select></label>
        <label>The evil villages win at <input type="number" min="10" max="100" step="5" value="${h(w.win_percent)}" data-world-win style="width:4.5rem"> % of the map</label>
        <label><input type="checkbox" data-world-hours ${w.school_hours_only ? 'checked' : ''}> Only in school hours</label>
      </div>
      <p class="muted">Status: ${w.paused ? 'paused' : 'running'}.</p>
    </section>
    <section class="admin-settings">
      <h2>Tasks that clean the poison</h2>
      <p class="muted">A student who answers the questions cleans the poison around where they stand, and fills the shield of their villages: <strong>5 of 5</strong> right gives a bigger clean and 3 poison steps of shield, <strong>4 of 5</strong> gives 2 steps. A village with no shield left does not keep the poison away. Write your own glossary below, one word a line, <code>norsk = english</code>. Leave it empty to use the built-in list of 100 words from 1st to 7th grade.</p>
      <div class="world-controls">
        <label><input type="checkbox" data-task-vocab ${data.settings?.task_kinds?.vocab === false ? '' : 'checked'}> Glossary questions</label>
        <label><input type="checkbox" data-task-math ${data.settings?.task_kinds?.math === false ? '' : 'checked'}> Maths questions</label>
      </div>
      <textarea data-task-words rows="8" style="width:100%;font-family:monospace" placeholder="hus = house">${h((data.settings?.task_words || []).map((x) => `${x.no} = ${x.en}`).join('\n'))}</textarea>
      <p><button class="small-btn" data-task-save>Save the tasks</button> <button class="small-btn" data-task-default>Put the built-in list (100 words) in the box</button></p>
    </section>`;

  const set = async (body, message) => {
    try {
      await api('POST', { action: 'world-set', ...body });
      await reload();
      flash(message);
    } catch (err) {
      if (err.message !== 'Logged out') flash(err.message, true);
    }
  };
  app.querySelector('[data-world-run]').addEventListener('click', (e) => set({ paused: e.target.dataset.worldRun === 'pause' }, w.paused ? 'The poison is running.' : 'The poison is paused.'));
  app.querySelector('[data-world-speed]').addEventListener('change', (e) => set({ speed_minutes: Number(e.target.value) }, 'Speed changed.'));
  app.querySelector('[data-world-win]').addEventListener('change', (e) => set({ win_percent: Number(e.target.value) }, 'Changed.'));
  app.querySelector('[data-world-hours]').addEventListener('change', (e) => set({ school_hours_only: e.target.checked }, 'Changed.'));
  app.querySelector('[data-task-default]').addEventListener('click', () => {
    const box = app.querySelector('[data-task-words]');
    if (box.value.trim() && !confirm('Replace what is in the box with the built-in list?')) return;
    box.value = data.default_words || '';
  });
  app.querySelector('[data-task-save]').addEventListener('click', async () => {
    try {
      const r = await api('POST', {
        action: 'task-set',
        vocab: app.querySelector('[data-task-vocab]').checked,
        math: app.querySelector('[data-task-math]').checked,
        words: app.querySelector('[data-task-words]').value,
      });
      await reload();
      flash(`Saved: ${r.words} word${r.words === 1 ? '' : 's'} in your glossary.`);
    } catch (err) {
      if (err.message !== 'Logged out') flash(err.message, true);
    }
  });
  app.querySelector('[data-world-step]').addEventListener('click', async () => {
    try {
      const r = await api('POST', { action: 'world-step' });
      await reload();
      flash(r.result && r.result.step ? `Step ${r.result.step}: ${r.result.percent}% poisoned.` : `Nothing happened: ${(r.result && r.result.skipped) || 'unknown'}.`);
    } catch (err) {
      if (err.message !== 'Logged out') flash(err.message, true);
    }
  });
  app.querySelector('[data-world-reset]').addEventListener('click', async () => {
    if (!confirm('Clear all the poison and start again? This cannot be undone.')) return;
    try {
      await api('POST', { action: 'world-reset' });
      await reload();
      flash('The poison is gone. It is paused until you start it.');
    } catch (err) {
      if (err.message !== 'Logged out') flash(err.message, true);
    }
  });
}

// What the villages have written in their councils, with a way to clear one.
function renderCouncils() {
  const nameOf = (id) => data.villages.find((v) => v.id === id)?.name || id;
  const cards = (data.councils || [])
    .map((c) => {
      const row = (label, value) => (value ? `<p><strong>${label}:</strong> ${h(value)}</p>` : '');
      const original = c.source_lang === 'no' && c.original ? `<details><summary>Norwegian original</summary>${row('Rule', c.original.government)}${row('God', c.original.god)}${row('Laws', c.original.laws)}</details>` : '';
      return `<article class="admin-card">
        <h3>${h(nameOf(c.tribe_id))}</h3>
        ${row('Rule', c.government)}${row('God', c.god)}${row('Laws', c.laws)}
        ${row('Allies', (c.allies || []).map(nameOf).join(', '))}${row('At war with', (c.enemies || []).map(nameOf).join(', '))}
        ${original}
        <button class="small-btn danger" data-clear-council="${h(c.tribe_id)}">Clear</button>
      </article>`;
    })
    .join('');
  app.innerHTML = `
    <p id="admin-flash" class="admin-flash" hidden></p>
    <section class="admin-settings">
      <h2>Councils</h2>
      <p class="muted">What each village's students have decided: how it is ruled, its god, its laws, and its allies and enemies. <strong>Clear</strong> removes the council of a village, and the students can write it again.</p>
      ${cards || '<p class="muted">No village has written a council yet.</p>'}
    </section>`;
  app.querySelectorAll('[data-clear-council]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.clearCouncil;
      if (!confirm(`Clear the council of ${nameOf(id)}?`)) return;
      try {
        await api('POST', { action: 'clear-council', tribe_id: id });
        await reload();
        flash('The council was cleared.');
      } catch (err) {
        if (err.message !== 'Logged out') flash(err.message, true);
      }
    })
  );
}

// The students who have logged in with Feide, and a way to remove one of
// them with everything they wrote (for a request to delete their data).
function renderStudents() {
  const students = [...(data.students || [])].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'nb'));
  const xpBy = new Map((data.xp || []).map((x) => [x.user_id, x]));
  const xpText = (id) => {
    const x = xpBy.get(id);
    return x ? `${x.xp} (${x.wins}-${x.losses}-${x.draws})` : '–';
  };
  const membersOf = (id) => Object.values(data.members || {}).filter((ids) => ids.includes(id)).length;
  const rows = students
    .map((s) => {
      const villages = data.villages.filter((v) => v.submitted_by === s.user_id).length;
      const villagers = data.villagers.filter((c) => c.submitted_by === s.user_id).length;
      const last = s.last_login ? new Date(s.last_login).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '–';
      return `
        <tr>
          <td><strong>${h(s.display_name || 'Unnamed student')}</strong>${s.is_admin ? ' <span class="status-badge status-approved">admin</span>' : ''}</td>
          <td>${h(last)}</td>
          <td>${villages} started, ${membersOf(s.user_id)} in groups</td>
          <td>${villagers}</td>
          <td>${h(xpText(s.user_id))}</td>
          <td>${s.is_admin ? '' : `<button class="small-btn danger" data-delete-student="${h(s.user_id)}">Delete</button>`}</td>
        </tr>`;
    })
    .join('');
  app.innerHTML = `
    <p id="admin-flash" class="admin-flash" hidden></p>
    <section class="admin-settings">
      <h2>Students</h2>
      <p class="muted">Everyone who has logged in with Feide. <strong>Delete</strong> removes the student and what they wrote: their villagers, unsent drafts, group memberships and game progress. A village they started is deleted too, unless other students' villagers or group members depend on it. Then it stays without a link to the student. This cannot be undone. The student can still log in again and start from nothing.</p>
      ${
        rows
          ? `<div class="table-scroll"><table class="student-table">
              <thead><tr><th>Name</th><th>Last login</th><th>Villages</th><th>Villagers</th><th>XP (W-L-D)</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`
          : '<p class="muted">Nobody has logged in with Feide yet.</p>'
      }
    </section>`;

  app.querySelectorAll('[data-delete-student]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteStudent;
      const student = (data.students || []).find((s) => s.user_id === id);
      const name = student?.display_name || 'this student';
      if (!confirm(`Delete ${name} and everything they wrote? This cannot be undone.`)) return;
      try {
        const r = await api('POST', { action: 'delete-student', user_id: id });
        await reload();
        flash(
          `Deleted ${name}: ${r.deletedVillagers} villager(s) and ${r.deletedVillages} village(s) removed${r.keptVillages ? `, ${r.keptVillages} group village(s) kept without a link to them` : ''}.`
        );
      } catch (err) {
        if (err.message !== 'Logged out') flash(err.message, true);
      }
    })
  );
}

function render() {
  renderNav();
  if (view === 'settings') {
    renderSettings();
    return;
  }
  if (view === 'students') {
    renderStudents();
    return;
  }
  if (view === 'councils') {
    renderCouncils();
    return;
  }
  if (view === 'world') {
    renderWorld();
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
  return `<div class="status-actions">${buttons}<button class="small-btn danger" data-delete>Delete</button></div>${ownerControl(record)}`;
}

// Students who have logged in with Feide, for the owner drop-down.
function studentOptions(current) {
  return Object.entries(data.owners || {})
    .filter(([id]) => id.startsWith('feide:'))
    .map(([id, name]) => ({ id, label: name || `Unnamed student (${id.slice(6, 12)})` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nb'))
    .map((s) => `<option value="${h(s.id)}" ${s.id === current ? 'selected' : ''}>${h(s.label)}</option>`)
    .join('');
}

function ownerControl(record) {
  const options = studentOptions(record.submitted_by);
  if (!options) return '<p class="muted">No student has logged in with Feide yet, so there is nobody to assign this to.</p>';
  return `
    <div class="owner-row">
      <label>Owner
        <select data-owner-select><option value="">Choose a student…</option>${options}</select>
      </label>
      <button class="small-btn" data-assign-owner>Assign</button>
      <span class="muted">Now: ${h(who(record.submitted_by))}</span>
    </div>`;
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
  detail.querySelector('[data-assign-owner]')?.addEventListener('click', () => {
    const select = detail.querySelector('[data-owner-select]');
    if (!select.value) {
      flash('Choose a student first.', true);
      return;
    }
    const label = select.options[select.selectedIndex].text;
    run(() => api('POST', { action: 'set-owner', table, id: record.id, owner: select.value }), `${record.name} now belongs to ${label}`);
  });
  detail.querySelector('[data-delete]').addEventListener('click', () => {
    if (!confirm(`Delete "${record.name}" for good? This cannot be undone. (Archive hides it instead.)`)) return;
    run(() => api('POST', { action: 'delete', table, id: record.id }), `Deleted ${record.name}`);
  });
}

function renderAnswers(type, charter, original) {
  const def = CHARTERS[type];
  const known = new Set();
  const sections = def.sections
    .map((s) => {
      const rows = s.fields
        .map((f) => {
          known.add(f.key);
          const value = charter[f.key];
          if (!value) return '';
          const said = original && original[f.key] && f.key !== 'name' && original[f.key] !== value ? original[f.key] : '';
          return `<div class="answer">${f.label ? `<span class="answer-label">${h(f.label)}</span>` : ''}<p>${h(value)}</p>${said ? `<p class="answer-original"><span class="muted">Norwegian original:</span> ${h(said)}</p>` : ''}</div>`;
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
      ${groupLine(v)}
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
        ${v.source_lang === 'no' ? '<p class="muted">Written in Norwegian by the students, translated to English when they sent it.</p>' : ''}
        ${renderAnswers(v.charter_type === 'shadow' ? 'shadow' : 'village', v.charter || {}, v.charter_original)}
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
        ${c.source_lang === 'no' ? '<p class="muted">Written in Norwegian by the student, translated to English when it was sent.</p>' : ''}
        ${renderAnswers('villager', c.charter || {}, c.charter_original)}
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

// A teacher whose Feide user is marked as admin gets straight in; anyone else
// sees the login screen (with the Feide button when Feide is set up).
async function start() {
  try {
    const session = await fetch('/api/session', { credentials: 'same-origin' })
      .then((r) => r.json())
      .catch(() => ({}));
    feideEnabled = Boolean(session.feideEnabled);
    if (session.authenticated) {
      await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feide: true }),
      });
    }
    await reload();
  } catch (err) {
    if (err.message !== 'Logged out') showLogin();
  }
}

start();
