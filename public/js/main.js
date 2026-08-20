import { getSession, loginUrl, logoutUrl, loadProgress, saveProgress } from './api.js';
import { loadAllContent } from './content.js';
import { renderCharacterSelect, renderScene, findEntryScene, applyConsequences } from './game.js';
import { renderLexicon } from './lexicon.js';
import { renderGallery } from './gallery.js';
import { renderCredits } from './credits.js';
import { renderIntro } from './intro.js';
import { renderLore } from './lore.js';
import { playForScene, playCredits, renderAudioControl } from './audio.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

let content = null; // { tribes, characters, scenes }
let state = null; // { chosen_character, current_scene, flags, visited_tribes }

function renderNav(authenticated, displayTag) {
  if (!authenticated) {
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = `
    <span class="muted">Innlogget${displayTag ? ` (${displayTag})` : ''}</span>
    <button id="nav-play">Spill</button>
    <button id="nav-lexicon">Stammeleksikon</button>
    <button id="nav-gallery">Galleri</button>
    <button id="nav-lore">Verdenshistorie</button>
    <button id="nav-intro">Se introen</button>
    <span id="nav-audio"></span>
    <a id="nav-logout" href="${logoutUrl()}">Logg ut</a>
  `;
  document.getElementById('nav-play').addEventListener('click', showGameOrSelect);
  document.getElementById('nav-lexicon').addEventListener('click', showLexicon);
  document.getElementById('nav-gallery').addEventListener('click', showGallery);
  document.getElementById('nav-lore').addEventListener('click', showLore);
  document.getElementById('nav-intro').addEventListener('click', () => showIntro(showGameOrSelect));
  renderAudioControl(document.getElementById('nav-audio'));
}

function showLoginScreen() {
  const params = new URLSearchParams(window.location.search);
  const err = params.get('login_error');
  app.innerHTML = `
    <div class="login-box">
      <h1>Stammespillet</h1>
      <p>Logg inn med Feide for å spille og lagre fremgangen din.</p>
      ${err ? `<p class="error">Innlogging feilet: ${err}</p>` : ''}
      <a class="choice-btn" href="${loginUrl()}">Logg inn med Feide</a>
    </div>
  `;
}

function showLexicon() {
  renderLexicon(app, content);
}

function showGallery() {
  renderGallery(app, content);
}

function showLore() {
  renderLore(app);
}

function showCredits() {
  playCredits();
  renderCredits(app, content, showGameOrSelect);
}

function showIntro(onDone) {
  renderIntro(app, onDone);
}

async function markIntroSeenAndContinue() {
  state = { ...state, flags: { ...state.flags, seen_intro: true } };
  await saveProgress(state);
  await showGameOrSelect();
}

async function showGameOrSelect() {
  if (!state?.chosen_character || !state?.current_scene) {
    playForScene(null);
    renderCharacterSelect(app, content, onChooseCharacter);
    return;
  }
  showScene();
}

function showScene() {
  const scene = content.scenes.get(state.current_scene);
  if (!scene) {
    app.innerHTML = `<p class="error">Fant ikke scenen "${state.current_scene}".</p>`;
    return;
  }
  const tribe = content.tribes.get(scene.tribe_id);
  playForScene(scene.tribe_id);
  renderScene(app, { scene, tribe }, onChoice);
}

async function onChooseCharacter(characterId) {
  const character = content.characters.get(characterId);
  const entryScene = findEntryScene(character.tribe_id, content.scenes);
  state = {
    chosen_character: characterId,
    current_scene: entryScene,
    flags: {},
    visited_tribes: entryScene ? [character.tribe_id] : [],
  };
  await saveProgress(state);
  showScene();
}

async function onChoice(choice) {
  if (choice === 'CREDITS') {
    showCredits();
    return;
  }

  if (choice === null) {
    // restart after an ending - keep seen_intro so the video isn't forced again
    state = {
      chosen_character: null,
      current_scene: null,
      flags: state.flags?.seen_intro ? { seen_intro: true } : {},
      visited_tribes: [],
    };
    await saveProgress(state);
    playForScene(null);
    renderCharacterSelect(app, content, onChooseCharacter);
    return;
  }

  const nextScene = content.scenes.get(choice.next_scene);
  state = {
    ...state,
    current_scene: choice.next_scene,
    flags: applyConsequences(state.flags, choice.consequences),
    visited_tribes: nextScene?.tribe_id
      ? [...new Set([...(state.visited_tribes || []), nextScene.tribe_id])]
      : state.visited_tribes,
  };
  await saveProgress(state);
  showScene();
}

async function init() {
  const session = await getSession();
  renderNav(session.authenticated, session.displayTag);

  if (!session.authenticated) {
    showLoginScreen();
    return;
  }

  content = await loadAllContent();

  const { progress, unauthenticated } = await loadProgress();
  if (unauthenticated) {
    showLoginScreen();
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

  if (!state.flags?.seen_intro) {
    showIntro(markIntroSeenAndContinue);
    return;
  }

  await showGameOrSelect();
}

init().catch((err) => {
  console.error(err);
  app.innerHTML = `<p class="error">Noe gikk galt: ${err.message}</p>`;
});
