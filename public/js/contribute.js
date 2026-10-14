import { loadSubmissions, sendSubmission, joinVillage, addVillageImage, addVillagerImage, deleteVillageImage, loadDrafts, putDraft, removeDraft } from './api.js';
import { mediaUrl } from './content.js';
import { figurePortrait, ensureFigures, FIGURE_COUNT } from './play/figures.js';
import { renderCouncil } from './council.js';
import { renderArtifacts } from './artifacts.js';
import { CHARTERS, allFields } from './charters.js';
import { escapeHtml } from './translate.js';

// Temporary page where students type in their village (one per group) and
// their own villager. Everything lands as "pending" until the teacher
// approves it on /admin.html.
//
// A student can write in English or in Norwegian (the choice at the top). A
// Norwegian text is translated to English by the server when it is sent; the
// student can read the English version afterwards but not change it.
//
// Unsent text is never lost. Every keystroke is saved in the browser at once,
// and about a second and a half later also on the server, so the text follows
// the student to another computer. If the network or the login drops, the
// browser copy is still there and is pushed to the server when it can be.

const MAP_IMAGE = '/assets/images/lore/overview-map.jpg';
const PUSH_DELAY_MS = 1500;
const RETRY_DELAY_MS = 10000;
const LANG_KEY = 'contribute-lang';

// Every sentence the page shows. In English the Norwegian help is shown in
// grey next to it; in Norwegian only the Norwegian is shown.
const TEXT = {
  en: {
    title: 'Contribute',
    intro: 'Write your answers in <strong>English</strong>. The grey text is Norwegian help. Your writing is saved while you type, so you can continue on another computer.',
    closed: 'Sending is closed right now. <span class="no-help">Innsending er stengt akkurat nå.</span>',
    mySubmissions: 'My submissions',
    nothingSent: 'Nothing sent yet.',
    status: { pending: 'Waiting for teacher', approved: 'Approved', rejected: 'Not approved', archived: 'Archived' },
    kinds: { village: 'Village', shadow: 'Shadow village', villager: 'Villager' },
    edit: 'Edit',
    haveVillage: (name, approved) => `You already have a village: <strong>${name}</strong>. Everybody is in one village only, the one you started or the one you joined. ${approved ? 'The teacher has approved it. Ask your teacher if something should change.' : 'You can change it until the teacher has approved it: press Edit under My submissions.'}`,
    haveVillager: (name, approved) => `You have already made your villager, <strong>${name}</strong>. ${approved ? 'The teacher has approved it, so it is part of the game now. Ask your teacher if something should change.' : 'You can change it until the teacher has approved it: press Edit under My submissions.'}`,
    tabVillage: 'Our village',
    tabVillager: 'My villager',
    tabCouncil: 'Council',
    tabArtifact: 'Artifact',
    oneWrites: 'One person per group writes the village. <span class="no-help">Én i gruppa skriver inn landsbyen.</span>',
    typeVillage: 'Village Charter',
    typeShadow: 'Shadow Charter <span class="no-help">(den onde landsbyen)</span>',
    everyoneWrites: 'Everyone writes their own villager. <span class="no-help">Alle skriver sin egen innbygger.</span>',
    yourVillage: 'Your village * <span class="no-help">Landsbyen din</span>',
    choose: 'Choose your village…',
    waiting: ' (waiting for teacher)',
    noVillages: 'No villages yet — your group has to send in the village first.',
    editing: 'Editing:',
    restored: (button) =>
      `Your unsent text was brought back. Remember to press <strong>${button}</strong> when you are done. <span class="no-help">Teksten du ikke har sendt ennå er hentet tilbake.</span>`,
    send: 'Send to teacher',
    save: 'Save changes',
    mapLabel: 'Click the map where your village is <span class="no-help">Klikk på kartet der landsbyen ligger</span>',
    needName: 'Please write a name first.',
    needVillage: 'Please choose your village.',
    sending: 'Sending…',
    sent: 'Sent! Your teacher will look at it.',
    translationDown: 'The translation does not work right now. Try again in a minute.',
    loggedOutMessage: 'You are logged out. Log in again - your text is saved.',
    englishVersion: 'English version',
    loading: 'Loading…',
    groupCode: 'Group code',
    groupCodeHelp: 'Give this code to the others in your group. They enter it under "Join your group" and can then write in this village with you.',
    joinTitle: 'Join your group',
    joinHelp: 'Has someone in your group already started the village? Enter the group code to join it.',
    joinPlaceholder: 'Group code',
    joinButton: 'Join',
    joining: 'Joining…',
    joined: (name) => `You joined ${name}.`,
    joinNoCode: 'Write the group code first.',
    relationsTitle: 'Friends and enemies',
    relationsHelp: 'Choose at most two allies and two enemies from the other villages. Enemies cannot visit each other. Later, the village council decides this by voting.',
    alliesLabel: 'Allies (friends)',
    enemiesLabel: 'Enemies',
    relationsNone: 'There are no other villages yet.',
    picturesTitle: 'Pictures',
    picturesHelp: 'Add pictures of famous places and other things in your village. Drawings work best. Please do not upload photos of people.',
    picturesFirst: 'Press Send to teacher first. Then you can add pictures here.',
    picChoose: 'Choose a picture',
    picCaption: 'What is it? For example: The Old Bridge',
    picAdd: 'Add picture',
    picDelete: 'Delete',
    picDeleteAsk: 'Delete this picture?',
    picAdding: 'Adding…',
    picAdded: 'Picture added.',
    picDeleted: 'Picture deleted.',
    picNoFile: 'Choose a picture first.',
    picCannotRead: 'This picture could not be read. Try a JPEG or PNG.',
    picLocked: 'The teacher has looked at this village, so pictures can no longer be changed.',
    figureTitle: 'Your villager in the game',
    figureHelp: 'Choose the figure you play as in the game. When your teacher has approved the villager, you walk around as it, and other students meet it as a character. If you do not choose, the game picks one for you.',
    figureLabel: 'Figure',
    portraitTitle: 'A drawing of your villager',
    portraitHelp: 'Draw your villager on paper and take a picture of it. Everyone sees the drawing when the teacher has approved your villager.',
    portraitFirst: 'Press Send to teacher first. Then you can add the drawing here.',
    portraitAdd: 'Add drawing',
    portraitReplace: 'Replace drawing',
    portraitLocked: 'The teacher has looked at this villager, so the drawing can no longer be changed.',
    draft: {
      saving: 'Saving…',
      saved: (time) => `✓ Saved ${time}`,
      offline: '✓ Saved on this computer. It is saved online when the connection is back.',
      offlineNoStorage: "This browser can't save your text and there is no connection - send it before you close the page!",
      loggedOut: 'You are logged out. Log in again to keep saving.',
      failed: 'Could not save online.',
      kept: ' Your text is kept on this computer.',
      keptNot: ' Send it before you close the page!',
    },
  },
  no: {
    title: 'Bidra',
    intro: 'Skriv svarene dine på <strong>norsk</strong>. De blir oversatt til engelsk når du sender. Teksten lagres mens du skriver, så du kan fortsette på en annen PC.',
    closed: 'Innsending er stengt akkurat nå.',
    mySubmissions: 'Mine innsendinger',
    nothingSent: 'Ingenting er sendt ennå.',
    status: { pending: 'Venter på læreren', approved: 'Godkjent', rejected: 'Ikke godkjent', archived: 'Arkivert' },
    kinds: { village: 'Landsby', shadow: 'Skyggelandsby', villager: 'Innbygger' },
    edit: 'Rediger',
    haveVillage: (name, approved) => `Du har allerede en landsby: <strong>${name}</strong>. Alle er med i én landsby, den du startet eller den du ble med i. ${approved ? 'Læreren har godkjent den. Spør læreren hvis noe skal endres.' : 'Du kan endre den til læreren har godkjent den: trykk Rediger under Mine innsendinger.'}`,
    haveVillager: (name, approved) => `Du har allerede laget innbyggeren din, <strong>${name}</strong>. ${approved ? 'Læreren har godkjent den, så den er med i spillet nå. Spør læreren hvis noe skal endres.' : 'Du kan endre den til læreren har godkjent den: trykk Rediger under Mine innsendinger.'}`,
    tabVillage: 'Landsbyen vår',
    tabVillager: 'Min innbygger',
    tabCouncil: 'Rådet',
    tabArtifact: 'Artefakt',
    oneWrites: 'Én i gruppa skriver inn landsbyen.',
    typeVillage: 'Vanlig landsby',
    typeShadow: 'Skyggelandsby (den onde landsbyen)',
    everyoneWrites: 'Alle skriver sin egen innbygger.',
    yourVillage: 'Landsbyen din *',
    choose: 'Velg landsbyen din…',
    waiting: ' (venter på læreren)',
    noVillages: 'Ingen landsbyer ennå. Gruppa deres må sende inn landsbyen først.',
    editing: 'Du redigerer:',
    restored: (button) => `Teksten du ikke hadde sendt er hentet tilbake. Husk å trykke <strong>${button}</strong> når du er ferdig.`,
    send: 'Send til læreren',
    save: 'Lagre endringer',
    mapLabel: 'Klikk på kartet der landsbyen ligger',
    needName: 'Skriv et navn først.',
    needVillage: 'Velg landsbyen din.',
    sending: 'Sender…',
    sent: 'Sendt! Læreren ser på det. Den engelske versjonen finner du under «Mine innsendinger».',
    translationDown: 'Oversettelsen virker ikke akkurat nå. Prøv igjen om litt.',
    loggedOutMessage: 'Du er logget ut. Logg inn igjen, så er teksten din fortsatt lagret.',
    englishVersion: 'Engelsk versjon (maskinoversatt, du kan ikke endre den)',
    loading: 'Laster…',
    groupCode: 'Gruppekode',
    groupCodeHelp: 'Gi denne koden til de andre i gruppa. De skriver den inn under «Bli med i gruppa», og kan da skrive i denne landsbyen sammen med deg.',
    joinTitle: 'Bli med i gruppa',
    joinHelp: 'Har noen i gruppa allerede startet landsbyen? Skriv inn gruppekoden for å bli med.',
    joinPlaceholder: 'Gruppekode',
    joinButton: 'Bli med',
    joining: 'Blir med…',
    joined: (name) => `Du er med i ${name}.`,
    joinNoCode: 'Skriv gruppekoden først.',
    relationsTitle: 'Venner og fiender',
    relationsHelp: 'Velg høyst to allierte og to fiender blant de andre landsbyene. Fiender kan ikke besøke hverandre. Senere bestemmer landsrådet dette ved avstemning.',
    alliesLabel: 'Allierte (venner)',
    enemiesLabel: 'Fiender',
    relationsNone: 'Det finnes ingen andre landsbyer ennå.',
    picturesTitle: 'Bilder',
    picturesHelp: 'Legg til bilder av kjente steder og andre ting i landsbyen. Tegninger fungerer best. Ikke last opp bilder av mennesker.',
    picturesFirst: 'Trykk først Send til læreren. Da kan du legge til bilder her.',
    picChoose: 'Velg et bilde',
    picCaption: 'Hva er det? For eksempel: Den gamle broen',
    picAdd: 'Legg til bilde',
    picDelete: 'Slett',
    picDeleteAsk: 'Slette dette bildet?',
    picAdding: 'Legger til…',
    picAdded: 'Bildet er lagt til.',
    picDeleted: 'Bildet er slettet.',
    picNoFile: 'Velg et bilde først.',
    picCannotRead: 'Bildet kunne ikke leses. Prøv en JPEG eller PNG.',
    picLocked: 'Læreren har sett på landsbyen, så bildene kan ikke endres lenger.',
    figureTitle: 'Innbyggeren i spillet',
    figureHelp: 'Velg figuren du spiller som i spillet. Når læreren har godkjent innbyggeren, går du rundt som den, og andre elever møter den som en karakter. Velger du ikke, velger spillet en for deg.',
    figureLabel: 'Figur',
    portraitTitle: 'En tegning av innbyggeren',
    portraitHelp: 'Tegn innbyggeren på papir og ta bilde av tegningen. Alle ser tegningen når læreren har godkjent innbyggeren.',
    portraitFirst: 'Trykk først Send til læreren. Da kan du legge til tegningen her.',
    portraitAdd: 'Legg til tegning',
    portraitReplace: 'Bytt tegning',
    portraitLocked: 'Læreren har sett på innbyggeren, så tegningen kan ikke endres lenger.',
    draft: {
      saving: 'Lagrer…',
      saved: (time) => `✓ Lagret ${time}`,
      offline: '✓ Lagret på denne PC-en. Den lagres på nett når nettet er tilbake.',
      offlineNoStorage: 'Denne nettleseren kan ikke lagre teksten din, og nettet er borte. Send den før du lukker siden!',
      loggedOut: 'Du er logget ut. Logg inn igjen for å fortsette å lagre.',
      failed: 'Kunne ikke lagre på nett.',
      kept: ' Teksten din er lagret på denne PC-en.',
      keptNot: ' Send den før du lukker siden!',
    },
  },
};

// Messages that come back from the server in English, shown in Norwegian
// when the student is writing in Norwegian.
const SERVER_MESSAGES_NO = {
  'This village has already been reviewed by your teacher.': 'Læreren har allerede sett på landsbyen, så den kan ikke endres.',
  'Your villager has already been reviewed by your teacher.': 'Læreren har allerede sett på innbyggeren, så den kan ikke endres.',
  'Submissions are closed right now.': 'Innsending er stengt akkurat nå.',
  'Choose your village from the list.': 'Velg landsbyen din fra lista.',
  'A name is required.': 'Skriv et navn først.',
  'No village has that code.': 'Ingen landsby har den koden.',
  'Use a JPEG, PNG or WebP picture.': 'Bruk et bilde av typen JPEG, PNG eller WebP.',
  'The picture is too big.': 'Bildet er for stort.',
  'This file is not a picture.': 'Denne filen er ikke et bilde.',
  'This village already has 8 pictures. Delete one first.': 'Landsbyen har allerede 8 bilder. Slett ett først.',
  'Picture not found': 'Fant ikke bildet.',
};

let root;
let data;
let tab = 'village';
let lang = 'en';
const editing = { village: null, villager: null };
const form = { village: {}, villager: {} };
const restored = { village: false, villager: false };

const L = () => TEXT[lang];

function savedLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'no' ? 'no' : 'en';
  } catch {
    return 'en';
  }
}

// ---------- drafts: browser copy ----------

let localOk = true; // false when this browser refuses to store anything
let serverDrafts = new Map(); // `${kind}:${ref}` -> draft content from the server
let serverFetched = false; // true when the list of server drafts loaded

function refId(kind) {
  return editing[kind]?.id || 'new';
}

// Keyed per logged-in student, so on a shared classroom PC one student never
// sees - or overwrites - another student's unsent text.
function localKey(kind, ref) {
  return `contribute-draft:${data.me || 'unknown'}:${kind}:${ref}`;
}

// Key format used before drafts were stored per student.
function legacyLocalKey(kind, ref) {
  return `contribute-draft-${kind}-${ref}`;
}

function storageWorks() {
  try {
    localStorage.setItem('contribute-storage-test', '1');
    localStorage.removeItem('contribute-storage-test');
    return true;
  } catch {
    return false;
  }
}

// The browser copy is { v: 2, form, dirty }. dirty means "has changes the
// server has not confirmed yet". Older copies are plain forms and count as
// dirty, so they are uploaded the first time they are seen.
function readLocal(kind, ref) {
  try {
    let raw = localStorage.getItem(localKey(kind, ref));
    if (raw === null) {
      const legacy = localStorage.getItem(legacyLocalKey(kind, ref));
      if (legacy === null) return null;
      localStorage.removeItem(legacyLocalKey(kind, ref));
      raw = legacy;
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 2) return { form: parsed.form, dirty: parsed.dirty !== false };
    return { form: parsed, dirty: true };
  } catch {
    return null;
  }
}

function writeLocal(kind, ref, f, dirty) {
  try {
    localStorage.setItem(localKey(kind, ref), JSON.stringify({ v: 2, form: f, dirty }));
    return true;
  } catch {
    return false;
  }
}

function removeLocal(kind, ref) {
  try {
    localStorage.removeItem(localKey(kind, ref));
  } catch {}
}

function normalizeForm(kind, raw) {
  const base = kind === 'village' ? { type: 'village', charter: {}, map: null, allies: [], enemies: [] } : { type: 'villager', charter: {}, tribe_id: '', sprite: null };
  const out = { ...base, lang, ...(raw && typeof raw === 'object' ? raw : {}) };
  out.charter = { ...(out.charter || {}) };
  out.lang = out.lang === 'no' ? 'no' : 'en';
  if (kind === 'village' && out.type !== 'village' && out.type !== 'shadow') out.type = 'village';
  if (kind === 'village') {
    out.allies = Array.isArray(out.allies) ? out.allies.filter((x) => typeof x === 'string').slice(0, 2) : [];
    out.enemies = Array.isArray(out.enemies) ? out.enemies.filter((x) => typeof x === 'string').slice(0, 2) : [];
  }
  if (kind === 'villager') out.type = 'villager';
  return out;
}

function hasAnswers(kind) {
  return Object.values(form[kind]?.charter || {}).some((v) => (v || '').trim());
}

// Which unsent text to bring back: a copy in this browser that the server has
// not seen wins, because it is the newest thing the student typed. Otherwise
// the server copy wins, which is how text arrives on a different computer.
//
// A draft that is older than the submission it belongs to is dropped. That
// happens when someone else in the group has saved the village since: their
// version is newer than a draft that was only started before they saved.
function pickDraft(kind, ref, sub) {
  const local = readLocal(kind, ref);
  const key = `${kind}:${ref}`;
  const entry = serverDrafts.get(key) || null;
  const stale = entry && sub && sub.updated_at && Date.parse(entry.updatedAt) < Date.parse(sub.updated_at);
  if (stale) {
    serverDrafts.delete(key);
    removeDraft(kind, ref);
  }
  const server = entry && !stale ? entry.content : null;
  if (local && local.dirty) return { form: normalizeForm(kind, local.form), source: 'local' };
  if (server) {
    writeLocal(kind, ref, server, false);
    return { form: normalizeForm(kind, server), source: 'server' };
  }
  if (local && !serverFetched) return { form: normalizeForm(kind, local.form), source: 'local-offline' };
  // Saved on the server before, and gone from there since (it was sent from
  // another computer): the browser copy is old news.
  if (local) removeLocal(kind, ref);
  return null;
}

// ---------- drafts: server copy ----------

const pending = new Map(); // key -> { kind, ref, json } waiting to be saved online
const timers = new Map(); // key -> push timer
const inflight = new Set(); // keys with a request on the way
let retryTimer = null;
let syncState = { name: 'idle', at: null, message: '' };

function setSync(name, extra = {}) {
  syncState = { name, at: name === 'saved' ? new Date() : syncState.at, message: '', ...extra };
  showDraftState();
}

function showDraftState() {
  const el = root?.querySelector('#draft-status');
  if (!el) return;
  const d = L().draft;
  let text = '';
  let isError = false;
  const kept = localOk ? d.kept : d.keptNot;
  switch (syncState.name) {
    case 'saving':
      text = d.saving;
      break;
    case 'saved':
      text = d.saved(syncState.at.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
      break;
    case 'offline':
      if (localOk) text = d.offline;
      else {
        text = d.offlineNoStorage;
        isError = true;
      }
      break;
    case 'loggedout':
      text = `${d.loggedOut}${kept}`;
      isError = true;
      break;
    case 'failed':
      text = `${syncState.message || d.failed}${kept}`;
      isError = true;
      break;
    default:
      break;
  }
  el.textContent = text;
  el.className = isError ? 'draft-status error' : 'draft-status';
}

function queuePush(kind, ref) {
  const key = `${kind}:${ref}`;
  pending.set(key, { kind, ref, json: JSON.stringify(form[kind]) });
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => flushOne(key), PUSH_DELAY_MS));
  if (syncState.name !== 'loggedout') setSync('saving');
}

// The copy in the browser is only marked as confirmed if it is still exactly
// what was sent; the student may have typed more while the request was away.
function markClean(item) {
  const local = readLocal(item.kind, item.ref);
  if (local && JSON.stringify(local.form) === item.json) writeLocal(item.kind, item.ref, local.form, false);
}

async function flushOne(key, options) {
  const item = pending.get(key);
  if (!item || inflight.has(key)) return;
  inflight.add(key);
  try {
    await putDraft(item.kind, item.ref, JSON.parse(item.json), options);
    if (pending.get(key) === item) {
      pending.delete(key);
      timers.delete(key);
    }
    markClean(item);
    if (!pending.size) setSync('saved');
  } catch (err) {
    if (err.status === 401) {
      setSync('loggedout');
    } else if (err.status === 400 || err.status === 413 || err.status === 429) {
      // Retrying cannot help: the server refused this text.
      pending.delete(key);
      setSync('failed', { message: lang === 'no' ? '' : err.message });
    } else {
      setSync('offline');
      scheduleRetry();
    }
  } finally {
    inflight.delete(key);
    const newer = pending.get(key);
    if (newer && newer !== item && syncState.name !== 'loggedout') flushOne(key);
  }
}

function flushAll(options) {
  for (const key of [...pending.keys()]) {
    clearTimeout(timers.get(key));
    flushOne(key, options);
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (pending.size && syncState.name !== 'loggedout') flushAll();
  }, RETRY_DELAY_MS);
}

let listenersInstalled = false;
function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  // Back online: save what could not be saved. Closing the tab or switching
  // away: push at once, with keepalive so the request can outlive the page.
  window.addEventListener('online', () => flushAll());
  window.addEventListener('pagehide', () => flushAll({ keepalive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll({ keepalive: true });
  });
}

function saveDraft(kind) {
  const ref = refId(kind);
  form[kind].lang = lang;
  localOk = writeLocal(kind, ref, form[kind], true);
  queuePush(kind, ref);
}

// Called once a submission has been sent: the unsent text is no longer needed.
async function clearDraft(kind) {
  const ref = refId(kind);
  const key = `${kind}:${ref}`;
  clearTimeout(timers.get(key));
  timers.delete(key);
  pending.delete(key);
  removeLocal(kind, ref);
  serverDrafts.delete(key);
  await removeDraft(kind, ref);
}

// ---------- forms ----------

// A submission that was written in Norwegian is edited in Norwegian: the
// form gets the student's own words, not the English translation.
function formFromSubmission(kind, sub) {
  const inNorwegian = sub.source_lang === 'no' && sub.charter_original;
  const charter = { ...((inNorwegian ? sub.charter_original : sub.charter) || {}) };
  const formLang = inNorwegian ? 'no' : 'en';
  if (kind === 'village') {
    const t = sub.territory || {};
    return {
      type: sub.charter_type || 'village',
      lang: formLang,
      charter,
      map: Number.isFinite(t.map_x) && Number.isFinite(t.map_y) ? { x: t.map_x, y: t.map_y } : null,
      allies: sub.allies || [],
      enemies: sub.enemies || [],
    };
  }
  return { type: 'villager', lang: formLang, charter, tribe_id: sub.tribe_id || '', sprite: Number.isInteger(sub.sprite) ? sub.sprite : null };
}

function startEditing(kind, sub) {
  editing[kind] = sub;
  const picked = pickDraft(kind, sub.id, sub);
  restored[kind] = !!picked;
  form[kind] = picked ? picked.form : normalizeForm(kind, formFromSubmission(kind, sub));
  if (picked && picked.source !== 'server') queuePush(kind, sub.id);
}

function startNew(kind) {
  editing[kind] = null;
  const picked = pickDraft(kind, 'new');
  restored[kind] = !!picked;
  form[kind] = picked ? picked.form : normalizeForm(kind, null);
  if (picked && picked.source !== 'server') queuePush(kind, 'new');
}

function pickInitialForms() {
  const pendingVillage = data.mine.villages.find((v) => v.status === 'pending');
  const pendingVillager = data.mine.villagers.find((v) => v.status === 'pending');
  pendingVillage ? startEditing('village', pendingVillage) : startNew('village');
  pendingVillager ? startEditing('villager', pendingVillager) : startNew('villager');
  // The first form shown decides the language when it already has text.
  if (restored[tab] || editing[tab]) lang = langOf(form[tab]);
}

// The language a form was written in; always English when this site has no translation key.
function langOf(f) {
  return data.translation && f.lang === 'no' ? 'no' : 'en';
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {}
  // Forms with text remember the language they were written in.
  for (const kind of ['village', 'villager']) {
    if (hasAnswers(kind)) saveDraft(kind);
    else form[kind].lang = next;
  }
  renderPage();
}

// What the English version of a Norwegian submission looks like: the
// translated answers, grouped like the form. Read only.
function renderEnglishVersion(type, sub) {
  const def = CHARTERS[type];
  if (!def) return '';
  const charter = sub.charter || {};
  const blocks = def.sections
    .map((s) => {
      const rows = s.fields
        .map((f) => {
          const value = charter[f.key];
          if (!value) return '';
          return `<p>${f.label ? `<strong>${escapeHtml(f.label)}:</strong> ` : ''}${escapeHtml(value)}</p>`;
        })
        .join('');
      return rows ? `<div class="english-block"><h4>${escapeHtml(s.title)}</h4>${rows}</div>` : '';
    })
    .join('');
  if (!blocks) return '';
  return `<details class="english-version"><summary>${L().englishVersion}</summary>${blocks}</details>`;
}

function renderSubmissionList() {
  const t = L();
  const items = [
    ...data.mine.villages.map((v) => ({ kind: 'village', sub: v, label: t.kinds[v.charter_type === 'shadow' ? 'shadow' : 'village'], type: v.charter_type === 'shadow' ? 'shadow' : 'village' })),
    ...data.mine.villagers.map((v) => ({ kind: 'villager', sub: v, label: t.kinds.villager, type: 'villager' })),
  ];
  if (!items.length) return `<p class="muted">${t.nothingSent}</p>`;
  return `<ul class="submission-list">${items
    .map(
      ({ kind, sub, label, type }) => `
      <li>
        <span><strong>${escapeHtml(sub.name)}</strong> <span class="muted">· ${label}</span></span>
        <span class="status-badge status-${escapeHtml(sub.status)}">${t.status[sub.status] || escapeHtml(sub.status)}</span>
        ${sub.status === 'pending' && data.open ? `<button class="small-btn" data-edit-kind="${kind}" data-edit-id="${escapeHtml(sub.id)}">${t.edit}</button>` : ''}
        ${sub.source_lang === 'no' ? renderEnglishVersion(type, sub) : ''}
      </li>`
    )
    .join('')}</ul>`;
}

function renderField(field, value) {
  let label = '';
  if (field.label) {
    const star = field.required ? ' *' : '';
    label =
      lang === 'no'
        ? `<span class="field-label">${escapeHtml(field.labelNo || field.label)}${star}</span>`
        : `<span class="field-label">${escapeHtml(field.label)}${star} <span class="no-help">${escapeHtml(field.labelNo || '')}</span></span>`;
  }
  if (field.type === 'choice') {
    const chosen = value || field.default;
    const options = field.options
      .map((o) => `<label class="choice-inline"><input type="radio" name="${field.key}" value="${escapeHtml(o)}" ${chosen === o ? 'checked' : ''}> ${escapeHtml(o)}</label>`)
      .join('');
    return `<div class="charter-field">${label}<div class="choice-row">${options}</div></div>`;
  }
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
      <span class="field-label">${L().mapLabel}</span>
      <div class="map-picker" id="map-picker">
        <img src="${MAP_IMAGE}" alt="${lang === 'no' ? 'Kart over verden' : 'Map of the world'}" draggable="false">
        <div class="map-marker" id="map-marker" ${marker}></div>
      </div>
    </div>`;
}

function renderSections(kind) {
  const f = form[kind];
  const sections = CHARTERS[f.type].sections;
  const no = lang === 'no';
  return sections
    .map((s) => {
      const lede = no ? s.ledeNo : s.lede;
      const prompts = no
        ? s.promptsNo.map((p) => `<li>${escapeHtml(p)}</li>`)
        : s.prompts.map((p, i) => `<li>${escapeHtml(p)}<span class="no-help">${escapeHtml(s.promptsNo[i] || '')}</span></li>`);
      return `
      <section class="charter-section">
        <div class="charter-head">
          <span class="charter-num">${s.num}</span>
          <div>
            <h3>${escapeHtml(no ? s.titleNo : s.title)}</h3>
            ${no ? '' : `<p class="no-help">${escapeHtml(s.titleNo)}</p>`}
          </div>
        </div>
        ${lede ? `<p class="charter-lede">${escapeHtml(lede)}</p>` : ''}
        ${prompts.length ? `<ul class="charter-prompts">${prompts.join('')}</ul>` : ''}
        ${s.fields.map((field) => renderField(field, f.charter[field.key])).join('')}
        ${kind === 'village' && s.num === 'II' ? renderMapPicker(f.map) : ''}
      </section>`;
    })
    .join('');
}

function renderForm() {
  const kind = tab;
  const f = form[kind];
  const t = L();
  // One village for each student: no new form once there is one (made or joined).
  const ownVillage = kind === 'village' && !editing.village ? data.mine.villages.find((v) => v.status === 'pending' || v.status === 'approved') : null;
  if (ownVillage) {
    root.querySelector('#contribute-form').innerHTML = `<p>${t.haveVillage(escapeHtml(ownVillage.name), ownVillage.status === 'approved')}</p>${renderPictures(ownVillage)}`;
    wirePictures();
    return;
  }
  // One villager for each student: no new form once there is one.
  const own = kind === 'villager' && !editing.villager ? data.mine.villagers.find((v) => v.status === 'pending' || v.status === 'approved') : null;
  if (own) {
    root.querySelector('#contribute-form').innerHTML = `<p>${t.haveVillager(escapeHtml(own.name), own.status === 'approved')}</p>${renderPortrait(own)}`;
    wirePictures();
    return;
  }
  const isEditing = !!editing[kind];
  const sendLabel = isEditing ? t.save : t.send;

  let top = '';
  if (kind === 'village') {
    // A village in progress shows its group code; a student who has no village
    // yet can join one with a code instead.
    let group = '';
    if (editing.village) {
      if (editing.village.join_code) {
        group = `<div class="group-box"><strong>${t.groupCode}: <span class="group-code">${escapeHtml(editing.village.join_code)}</span></strong><p class="muted">${t.groupCodeHelp}</p></div>`;
      }
    } else {
      group = `<div class="group-box"><strong>${t.joinTitle}</strong><p class="muted">${t.joinHelp}</p><div class="join-row"><input id="join-code" type="text" maxlength="12" autocomplete="off" placeholder="${t.joinPlaceholder}" aria-label="${t.joinPlaceholder}"><button class="small-btn" id="join-btn" type="button">${t.joinButton}</button><span id="join-status" class="muted" role="status"></span></div></div>`;
    }
    top = `
      ${group}
      <p class="muted">${t.oneWrites}</p>
      <div class="type-switch">
        <label><input type="radio" name="charter-type" value="village" ${f.type === 'village' ? 'checked' : ''}> ${t.typeVillage}</label>
        <label><input type="radio" name="charter-type" value="shadow" ${f.type === 'shadow' ? 'checked' : ''}> ${t.typeShadow}</label>
      </div>`;
  } else {
    const options = data.villages
      .map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === f.tribe_id ? 'selected' : ''}>${escapeHtml(v.name)}${v.status === 'pending' ? t.waiting : ''}</option>`)
      .join('');
    top = `
      <p class="muted">${t.everyoneWrites}</p>
      <label class="charter-field">
        <span class="field-label">${t.yourVillage}</span>
        <select name="tribe_id"><option value="">${t.choose}</option>${options}</select>
      </label>
      ${data.villages.length ? '' : `<p class="error">${t.noVillages}</p>`}`;
  }

  root.querySelector('#contribute-form').innerHTML = `
    ${isEditing ? `<p class="editing-note">${t.editing} <strong>${escapeHtml(editing[kind].name)}</strong></p>` : ''}
    ${restored[kind] ? `<p class="restored-note">${t.restored(sendLabel)}</p>` : ''}
    ${top}
    ${renderSections(kind)}
    ${kind === 'village' ? renderRelations() + renderPictures() : renderVillagerExtras()}
    <div class="submit-row">
      <button class="choice-btn" id="send-btn" ${data.open ? '' : 'disabled'}>${sendLabel}</button>
      <span id="send-status" class="muted" role="status"></span>
      <span id="draft-status" class="draft-status" role="status"></span>
    </div>`;

  wireForm(kind);
  showDraftState();
}

// The buttons for pictures, also on the pages that show only a message and the pictures.
function wirePictures() {
  const formEl = root.querySelector('#contribute-form');
  formEl.querySelector('#pic-add-btn')?.addEventListener('click', addPicture);
  formEl.querySelectorAll('[data-delete-pic]').forEach((btn) => btn.addEventListener('click', () => deletePicture(btn.dataset.deletePic)));
  formEl.querySelector('#portrait-add-btn')?.addEventListener('click', addPortrait);
  formEl.querySelectorAll('[data-delete-portrait]').forEach((btn) => btn.addEventListener('click', () => deletePicture(btn.dataset.deletePortrait)));
}

function wireForm(kind) {
  const formEl = root.querySelector('#contribute-form');

  formEl.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'charter-type' || (t.name && t.name.startsWith('rel-'))) return;
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

  if (kind === 'village') {
    syncRelations(formEl, null);
    formEl.addEventListener('change', (e) => {
      if (e.target.name === 'rel-allies' || e.target.name === 'rel-enemies') {
        syncRelations(formEl, e.target);
        saveDraft('village');
      }
    });
  }
  formEl.querySelector('#send-btn').addEventListener('click', () => send(kind));
  formEl.querySelector('#join-btn')?.addEventListener('click', joinGroup);
  formEl.querySelector('#pic-add-btn')?.addEventListener('click', addPicture);
  formEl.querySelectorAll('[data-delete-pic]').forEach((btn) => btn.addEventListener('click', () => deletePicture(btn.dataset.deletePic)));
  formEl.querySelector('#portrait-add-btn')?.addEventListener('click', addPortrait);
  formEl.querySelectorAll('[data-delete-portrait]').forEach((btn) => btn.addEventListener('click', () => deletePicture(btn.dataset.deletePortrait)));
  formEl.querySelectorAll('[data-figure]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const frame = Number(btn.dataset.figure);
      // Pressing the figure that is chosen again takes the choice away.
      form.villager.sprite = form.villager.sprite === frame ? null : frame;
      saveDraft('villager');
      formEl.querySelectorAll('[data-figure]').forEach((b) => {
        const on = form.villager.sprite === Number(b.dataset.figure);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    })
  );
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

// The last part of the village form: pictures of famous places and other
// things. A picture belongs to a village that has been sent, so before the
// first send there is only a note.
const ownVillageOf = () => data.mine.villages.find((v) => v.status === 'pending' || v.status === 'approved') || null;
const ownVillagerOf = () => data.mine.villagers.find((v) => v.status === 'pending' || v.status === 'approved') || null;

// Allies and enemies, chosen when the village is set up: at most two of each, from the
// other villages (the ones waiting for the teacher too).
function renderRelations() {
  const t = L();
  const others = data.villages.filter((v) => !editing.village || v.id !== editing.village.id);
  const own = data.mine.villages.map((v) => v.id);
  const list = others.filter((v) => !own.includes(v.id));
  const group = (key, label) => {
    const chosen = form.village[key] || [];
    const boxes = list
      .map((v) => `<label class="council-check"><input type="checkbox" name="rel-${key}" value="${escapeHtml(v.id)}" ${chosen.includes(v.id) ? 'checked' : ''}> ${escapeHtml(v.name)}${v.status === 'pending' ? t.waiting : ''}</label>`)
      .join('');
    return `<div class="charter-field"><span class="field-label">${label}</span><div class="council-checks">${boxes}</div></div>`;
  };
  return `<section class="charter-section relations">
    <div class="charter-head"><span class="charter-num"></span><div><h3>${t.relationsTitle}</h3></div></div>
    <p class="charter-lede">${t.relationsHelp}</p>
    ${list.length ? group('allies', t.alliesLabel) + group('enemies', t.enemiesLabel) : `<p class="muted">${t.relationsNone}</p>`}
  </section>`;
}

// The ticks for allies and enemies: at most two of each, and never the same village in both.
function syncRelations(formEl, changed) {
  const boxes = (key) => [...formEl.querySelectorAll(`input[name="rel-${key}"]`)];
  if (changed && changed.checked) {
    const other = changed.name === 'rel-allies' ? 'enemies' : 'allies';
    boxes(other).forEach((b) => {
      if (b.value === changed.value) b.checked = false;
    });
  }
  for (const key of ['allies', 'enemies']) {
    const all = boxes(key);
    const ticked = all.filter((b) => b.checked);
    if (ticked.length > 2 && changed) changed.checked = false;
    const now = all.filter((b) => b.checked);
    all.forEach((b) => (b.disabled = !b.checked && now.length >= 2));
    form.village[key] = now.map((b) => b.value);
  }
}

function renderPictures(sub = editing.village) {
  const t = L();
  const number = ROMAN[CHARTERS[(form.village || { type: 'village' }).type].sections.length] || '';
  const head = `<div class="charter-head"><span class="charter-num">${number}</span><div><h3>${t.picturesTitle}</h3></div></div>`;
  if (!sub) return `<section class="charter-section pictures">${head}<p class="muted">${t.picturesFirst}</p></section>`;

  const live = data.mine.villages.find((v) => v.id === sub.id) || sub;
  const canEdit = live.status === 'pending' || live.status === 'approved';
  const pictures = (data.mine.media || []).filter((m) => m.tribe_id === sub.id && m.kind === 'image');
  const grid = pictures.length
    ? `<div class="pic-grid">${pictures
        .map(
          (m) => `
        <figure class="pic">
          <img src="${escapeHtml(mediaUrl(m.storage_path))}" alt="${escapeHtml(m.title || '')}" loading="lazy">
          <figcaption>${escapeHtml(m.title || '')}</figcaption>
          ${canEdit ? `<button class="small-btn danger" type="button" data-delete-pic="${escapeHtml(m.id)}">${t.picDelete}</button>` : ''}
        </figure>`
        )
        .join('')}</div>`
    : '';
  const add = canEdit
    ? `<div class="pic-add">
        <input id="pic-file" type="file" accept="image/*" aria-label="${t.picChoose}">
        <input id="pic-caption" type="text" maxlength="120" placeholder="${escapeHtml(t.picCaption)}" aria-label="${escapeHtml(t.picCaption)}">
        <button class="small-btn" id="pic-add-btn" type="button">${t.picAdd}</button>
        <span id="pic-status" class="muted" role="status"></span>
      </div>`
    : `<p class="muted">${t.picLocked}</p>`;
  return `<section class="charter-section pictures">${head}<p class="charter-lede">${t.picturesHelp}</p>${grid}${add}</section>`;
}

// Shrinks a picture to at most 1400 px and saves it again as JPEG. That keeps
// the upload small and drops everything hidden in the original file, such as
// the place a photo was taken.
async function prepareImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const err = new Error('unreadable');
    err.code = 'unreadable';
    throw err;
  }
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) {
    const err = new Error('unreadable');
    err.code = 'unreadable';
    throw err;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { mime: 'image/jpeg', data: String(dataUrl).split(',')[1] };
}

async function addPicture() {
  const statusEl = root.querySelector('#pic-status');
  const file = root.querySelector('#pic-file').files[0];
  if (!file) {
    statusEl.textContent = L().picNoFile;
    return;
  }
  const button = root.querySelector('#pic-add-btn');
  button.disabled = true;
  statusEl.textContent = L().picAdding;
  try {
    const { mime, data: encoded } = await prepareImage(file);
    await addVillageImage({ tribe_id: (editing.village || ownVillageOf()).id, caption: root.querySelector('#pic-caption').value.trim(), mime, data: encoded });
    data = await loadSubmissions();
    renderPage();
    root.querySelector('.pictures')?.scrollIntoView({ block: 'center' });
    root.querySelector('#pic-status').textContent = L().picAdded;
  } catch (err) {
    button.disabled = false;
    statusEl.textContent = err.code === 'unreadable' ? L().picCannotRead : errorText(err);
  }
}

// Deletes a village picture, or the drawing of a villager: the same call, and
// the message goes where the picture was (on the village or the villager form).
async function deletePicture(id) {
  if (!window.confirm(L().picDeleteAsk)) return;
  const messageEl = () => root.querySelector('#pic-status') || root.querySelector('#portrait-status');
  try {
    await deleteVillageImage(id);
    data = await loadSubmissions();
    renderPage();
    root.querySelector('.pictures, .portrait-section')?.scrollIntoView({ block: 'center' });
    const el = messageEl();
    if (el) el.textContent = L().picDeleted;
  } catch (err) {
    const el = messageEl();
    if (el) el.textContent = errorText(err);
  }
}

// The last parts of the villager form: which figure the villager is in the
// game, and a drawing of them. Both are shown in the game once the teacher has
// approved the villager.
function renderVillagerExtras() {
  const t = L();
  const base = CHARTERS.villager.sections.length;
  const head = (offset, title) =>
    `<div class="charter-head"><span class="charter-num">${ROMAN[base + offset] || ''}</span><div><h3>${title}</h3></div></div>`;

  const chosen = form.villager.sprite;
  const figures = Array.from({ length: FIGURE_COUNT }, (_, i) => i).map(
    (frame) =>
      `<button type="button" class="figure-btn ${chosen === frame ? 'active' : ''}" data-figure="${frame}" aria-pressed="${chosen === frame}" aria-label="${t.figureLabel} ${frame + 1}">${figurePortrait(frame)}</button>`
  ).join('');
  const figureSection = `<section class="charter-section figures">${head(0, t.figureTitle)}<p class="charter-lede">${t.figureHelp}</p><div class="figure-grid">${figures}</div></section>`;

  return figureSection + renderPortrait(editing.villager);
}

// The drawing of a villager: it can be changed at any time, also after the teacher has approved.
function renderPortrait(sub) {
  const t = L();
  const head = (offset, title) =>
    `<div class="charter-head"><span class="charter-num">${ROMAN[CHARTERS.villager.sections.length + offset] || ''}</span><div><h3>${title}</h3></div></div>`;
  let body;
  if (!sub) {
    body = `<p class="muted">${t.portraitFirst}</p>`;
  } else {
    const live = data.mine.villagers.find((v) => v.id === sub.id) || sub;
    const canEdit = live.status === 'pending' || live.status === 'approved';
    const drawing = (data.mine.media || []).find((m) => m.character_id === sub.id);
    const picture = drawing
      ? `<figure class="pic portrait"><img src="${escapeHtml(mediaUrl(drawing.storage_path))}" alt="" loading="lazy">${
          canEdit ? `<button class="small-btn danger" type="button" data-delete-portrait="${escapeHtml(drawing.id)}">${t.picDelete}</button>` : ''
        }</figure>`
      : '';
    const add = canEdit
      ? `<div class="pic-add">
          <input id="portrait-file" type="file" accept="image/*" aria-label="${t.picChoose}">
          <button class="small-btn" id="portrait-add-btn" type="button">${drawing ? t.portraitReplace : t.portraitAdd}</button>
          <span id="portrait-status" class="muted" role="status"></span>
        </div>`
      : `<p class="muted">${t.portraitLocked}</p>`;
    body = `<p class="charter-lede">${t.portraitHelp}</p>${picture}${add}`;
  }
  return `<section class="charter-section portrait-section">${head(1, t.portraitTitle)}${body}</section>`;
}

async function addPortrait() {
  const statusEl = root.querySelector('#portrait-status');
  const file = root.querySelector('#portrait-file').files[0];
  if (!file) {
    statusEl.textContent = L().picNoFile;
    return;
  }
  const button = root.querySelector('#portrait-add-btn');
  button.disabled = true;
  statusEl.textContent = L().picAdding;
  try {
    const { mime, data: encoded } = await prepareImage(file);
    await addVillagerImage({ character_id: (editing.villager || ownVillagerOf()).id, mime, data: encoded });
    data = await loadSubmissions();
    renderPage();
    root.querySelector('.portrait-section')?.scrollIntoView({ block: 'center' });
    root.querySelector('#portrait-status').textContent = L().picAdded;
  } catch (err) {
    button.disabled = false;
    statusEl.textContent = err.code === 'unreadable' ? L().picCannotRead : errorText(err);
  }
}

// Joins a village a group member started. The village then opens for editing
// here, exactly as if this student had started it.
async function joinGroup() {
  const statusEl = root.querySelector('#join-status');
  const code = (root.querySelector('#join-code').value || '').trim();
  if (!code) {
    statusEl.textContent = L().joinNoCode;
    return;
  }
  statusEl.textContent = L().joining;
  try {
    const { id, name } = await joinVillage(code);
    data = await loadSubmissions();
    const sub = data.mine.villages.find((v) => v.id === id);
    if (sub) {
      startEditing('village', sub);
      tab = 'village';
      lang = langOf(form.village);
    }
    renderPage();
    root.querySelector('#send-status').textContent = L().joined(name);
  } catch (err) {
    statusEl.textContent = errorText(err);
  }
}

// Turns an error from the server into a sentence in the language the student
// is writing in.
function errorText(err) {
  if (err.message === 'translation_unavailable') return L().translationDown;
  if (lang === 'no' && SERVER_MESSAGES_NO[err.message]) return SERVER_MESSAGES_NO[err.message];
  if (lang === 'no' && err.message === TEXT.en.loggedOutMessage) return TEXT.no.loggedOutMessage;
  return err.message;
}

async function send(kind) {
  const f = form[kind];
  const t = L();
  const statusEl = root.querySelector('#send-status');
  const btn = root.querySelector('#send-btn');

  if (!(f.charter.name || '').trim()) {
    statusEl.textContent = t.needName;
    return;
  }
  if (kind === 'villager' && !f.tribe_id) {
    statusEl.textContent = t.needVillage;
    return;
  }

  btn.disabled = true;
  statusEl.textContent = t.sending;
  try {
    // Only send answers for the chosen sheet - switching Village/Shadow
    // back and forth would otherwise leave the other sheet's answers behind.
    const charter = {};
    for (const field of allFields(f.type)) {
      if (f.charter[field.key]) charter[field.key] = f.charter[field.key];
      else if (field.default) charter[field.key] = field.default;
    }
    const payload = { type: f.type, lang, id: editing[kind]?.id, charter };
    if (kind === 'village') {
      payload.map = f.map;
      payload.allies = f.allies || [];
      payload.enemies = f.enemies || [];
    } else {
      payload.tribe_id = f.tribe_id;
      payload.sprite = f.sprite ?? null;
    }
    const { id } = await sendSubmission(payload);

    // Only after the server has confirmed the submission is the unsent copy
    // thrown away, in the browser and on the server.
    await clearDraft(kind);
    setSync('idle');
    data = await loadSubmissions();
    const list = kind === 'village' ? data.mine.villages : data.mine.villagers;
    const saved = list.find((s) => s.id === id);
    if (saved) startEditing(kind, saved);
    renderPage();
    root.querySelector('#send-status').textContent = lang === 'no' ? TEXT.no.sent : TEXT.en.sent;
  } catch (err) {
    btn.disabled = false;
    statusEl.textContent = errorText(err);
  }
}

function renderPage() {
  const t = L();
  root.innerHTML = `
    <div class="contribute">
      <div class="contribute-top">
        <h2>${t.title}</h2>
        ${
          data.translation
            ? `<div class="contribute-tabs lang-switch" role="group" aria-label="Språk / Language">
          <button class="lore-tab ${lang === 'no' ? 'active' : ''}" data-lang="no" aria-pressed="${lang === 'no'}">Norsk</button>
          <button class="lore-tab ${lang === 'en' ? 'active' : ''}" data-lang="en" aria-pressed="${lang === 'en'}">English</button>
        </div>`
            : ''
        }
      </div>
      <p>${t.intro}</p>
      ${data.open ? '' : `<p class="error">${t.closed}</p>`}
      <section class="my-submissions">
        <h3>${t.mySubmissions}</h3>
        ${renderSubmissionList()}
      </section>
      <div class="contribute-tabs" role="tablist">
        <button class="lore-tab ${tab === 'village' ? 'active' : ''}" data-tab="village">${t.tabVillage}</button>
        <button class="lore-tab ${tab === 'villager' ? 'active' : ''}" data-tab="villager">${t.tabVillager}</button>
        <button class="lore-tab ${tab === 'council' ? 'active' : ''}" data-tab="council">${t.tabCouncil}</button>
        <button class="lore-tab ${tab === 'artifact' ? 'active' : ''}" data-tab="artifact">${t.tabArtifact}</button>
      </div>
      <div id="contribute-form"></div>
    </div>`;

  root.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

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
      // A submission written in Norwegian is edited in Norwegian.
      lang = langOf(form[kind]);
      renderPage();
    });
  });

  if (tab === 'council') renderCouncil(root.querySelector('#contribute-form'), { lang, translation: data.translation });
  else if (tab === 'artifact') renderArtifacts(root.querySelector('#contribute-form'), { lang });
  else renderForm();
}

export async function renderContribute(container) {
  root = container;
  lang = savedLang();
  root.innerHTML = `<p>${L().loading}</p>`;
  try {
    await ensureFigures();
    data = await loadSubmissions();
  } catch (err) {
    root.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    return;
  }

  if (!data.translation) lang = 'en';

  // Anything still waiting from an earlier visit to this page (for example a
  // push that did not finish) is saved first, so the server list below is
  // not older than what the student last typed.
  flushAll();

  localOk = storageWorks();
  serverFetched = false;
  serverDrafts = new Map();
  try {
    const rows = await loadDrafts();
    serverDrafts = new Map(rows.map((r) => [`${r.kind}:${r.ref_id}`, { content: r.content, updatedAt: r.updated_at }]));
    serverFetched = true;
  } catch {
    // The page still works from the copies in this browser.
  }

  installListeners();
  syncState = { name: 'idle', at: null, message: '' };
  pickInitialForms();
  renderPage();
}
