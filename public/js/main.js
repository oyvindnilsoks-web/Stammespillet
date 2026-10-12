import { getSession, nameLogin, loginUrl, logoutUrl, loadProgress, saveProgress } from './api.js';
import { loadAllContent } from './content.js';
import { renderLexicon } from './lexicon.js';
import { renderGallery } from './gallery.js';
import { renderContribute } from './contribute.js';
import { startPlay } from './play/index.js';
import { enableTranslation, escapeHtml } from './translate.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

// Click-to-translate is delegated on the persistent #app container, so this
// only needs to run once - it keeps working across every view re-render.
enableTranslation(app);

let content = null; // { tribes, characters, scenes, media }
let state = null; // { chosen_character, current_scene, flags, visited_tribes }
let stopPlay = null; // stops the running game when the student goes somewhere else

function renderNav(authenticated, displayTag) {
  if (!authenticated) {
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = `
    <span class="muted">Logged in${displayTag ? ` (${escapeHtml(displayTag)})` : ''}</span>
    <button id="nav-contribute">Contribute</button>
    <button id="nav-play">Play</button>
    <button id="nav-lexicon">Clan Lexicon</button>
    <button id="nav-gallery">Gallery</button>
    <a id="nav-logout" href="${logoutUrl()}">Log out</a>
  `;
  document.getElementById('nav-contribute').addEventListener('click', showContribute);
  document.getElementById('nav-play').addEventListener('click', showPlay);
  document.getElementById('nav-lexicon').addEventListener('click', showLexicon);
  document.getElementById('nav-gallery').addEventListener('click', showGallery);
}

const LOGIN_ERRORS = {
  cancelled: 'The Feide login was cancelled. Press "Log in with Feide" to try again.',
  state: 'The login took too long. Press "Log in with Feide" and try again.',
  failed: 'The Feide login did not work. Try again, and tell your teacher if it keeps failing.',
};

// The callback sends the browser back with ?login_error=<code>; show it once
// and clean the address bar so a reload does not repeat it.
function takeLoginError() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('login_error');
  if (!code) return null;
  const why = params.get('why') || '';
  window.history.replaceState(null, '', window.location.pathname);
  const message = LOGIN_ERRORS[code] || LOGIN_ERRORS.failed;
  return /^[a-z0-9_]{1,60}$/.test(why) ? `${message} (code: ${why})` : message;
}

function showLoginScreen({ feideEnabled = false, nameLoginEnabled = true } = {}) {
  const loginError = takeLoginError();
  app.innerHTML = `
    <div class="login-box">
      <img class="cover-art" src="/assets/images/lore/cover-art.jpg" alt="" onerror="this.style.display='none'">
      <h1>The Unmaking</h1>
      ${
        feideEnabled
          ? `<p>Log in with your school account to save your work.</p>
             <a class="choice-btn feide-btn" id="feide-login" href="${loginUrl()}">Log in with Feide</a>
             ${nameLoginEnabled ? '<p class="muted">No Feide yet? Type your name instead.</p>' : ''}`
          : nameLoginEnabled
            ? '<p>Type your name to play and save your progress.</p>'
            : '<p>Logging in is not open right now. Ask your teacher.</p>'
      }
      ${
        nameLoginEnabled
          ? `<form id="login-form">
        <label for="login-name" class="muted">Your name</label>
        <input id="login-name" name="name" placeholder="e.g. Kari S" autocomplete="off" required />
        <button type="submit" class="choice-btn">Log in</button>
      </form>`
          : ''
      }
      <p id="login-error" class="error" hidden></p>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  if (loginError) {
    errorEl.textContent = loginError;
    errorEl.hidden = false;
  }
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await nameLogin(document.getElementById('login-name').value);
      window.location.reload();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
}

// Every page except the game goes through here first, so a game that is
// running does not keep going behind the new page.
function leavePlay() {
  if (stopPlay) {
    stopPlay();
    stopPlay = null;
  }
}

function showLexicon() {
  leavePlay();
  renderLexicon(app, content);
}

function showGallery() {
  leavePlay();
  renderGallery(app, content);
}

function showContribute() {
  leavePlay();
  renderContribute(app);
}

let playVisit = 0;
async function showPlay() {
  leavePlay();
  const visit = ++playVisit;
  app.innerHTML = '<p>Loading…</p>';
  try {
    // New villages the teacher has approved since the page was opened.
    content = await loadAllContent();
  } catch {
    // Play with what is already loaded.
  }
  if (visit !== playVisit) return; // the student already went somewhere else
  stopPlay = startPlay(app, content, { state, save: () => saveProgress(state) }).stop;
}

async function init() {
  const session = await getSession();
  renderNav(session.authenticated, session.displayTag);

  if (!session.authenticated) {
    showLoginScreen(session);
    return;
  }

  content = await loadAllContent();

  const { progress, unauthenticated } = await loadProgress();
  if (unauthenticated) {
    showLoginScreen(session);
    return;
  }

  state = progress
    ? {
        chosen_character: progress.chosen_character,
        current_scene: progress.current_scene,
        flags: progress.flags || {},
        visited_tribes: progress.visited_tribes || [],
      }
    : { chosen_character: null, current_scene: null, flags: {}, visited_tribes: [] };

  // While the class is collecting villages and villagers, Contribute is the
  // landing page; Play is one click away in the menu.
  showContribute();
}

init().catch((err) => {
  console.error(err);
  app.innerHTML = `<p class="error">Something went wrong: ${escapeHtml(err.message)}</p>`;
});
