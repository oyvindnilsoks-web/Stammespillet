// Click-to-translate: wraps English words in reading content so a student
// can click one and see a Norwegian translation in a small popup. Tries the
// free MyMemory API first, then falls back to Google Translate's free
// endpoint if MyMemory is down, rate-limited, or has no result - both are
// keyless and fine here since only isolated game/story words are ever sent,
// never anything about the student.

const cache = new Map();
let popupEl = null;

function ensurePopup() {
  if (popupEl) return popupEl;
  popupEl = document.createElement('div');
  popupEl.className = 'translate-popup';
  popupEl.hidden = true;
  document.body.appendChild(popupEl);
  return popupEl;
}

function hidePopup() {
  if (popupEl) popupEl.hidden = true;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.tr-word') && !e.target.closest('.translate-popup')) hidePopup();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hidePopup();
});
window.addEventListener('scroll', hidePopup, true);

async function tryMyMemory(word) {
  const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|no`);
  const data = await res.json();
  // MyMemory returns HTTP 200 even for its own errors (quota, length limit),
  // putting the error message in translatedText - only trust it when
  // responseStatus genuinely says success.
  if (String(data?.responseStatus) !== '200') return null;
  return data?.responseData?.translatedText || null;
}

async function tryGoogle(word) {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=no&dt=t&q=${encodeURIComponent(word)}`
  );
  const data = await res.json();
  return data?.[0]?.[0]?.[0] || null;
}

async function fetchTranslation(word) {
  const key = word.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let result = null;
  for (const attempt of [tryMyMemory, tryGoogle]) {
    try {
      const translated = await attempt(word);
      if (translated && translated.toLowerCase() !== word.toLowerCase()) {
        result = translated;
        break;
      }
    } catch {
      // try the next provider
    }
  }

  cache.set(key, result);
  return result;
}

// Delegated click handler - call once per container that holds translatable
// text (scene text, lore documents). Safe to call multiple times on
// different containers.
export function enableTranslation(root) {
  root.addEventListener('click', async (e) => {
    const span = e.target.closest('.tr-word');
    if (!span) return;
    e.stopPropagation();

    const popup = ensurePopup();
    const rect = span.getBoundingClientRect();
    popup.style.left = `${window.scrollX + rect.left}px`;
    popup.style.top = `${window.scrollY + rect.bottom + 6}px`;
    popup.textContent = '…';
    popup.hidden = false;

    const translated = await fetchTranslation(span.dataset.word);
    popup.textContent = translated ? `${span.dataset.word} → ${translated}` : `No translation found for "${span.dataset.word}"`;
  });
}

// Wraps each word in a clickable span. Call this on plain text BEFORE any
// HTML-escaping/markdown formatting is applied around it, since the regex
// only recognises bare letters and won't skip existing tags.
export function translatable(text) {
  return text.replace(/[A-Za-z']+/g, (word) => `<span class="tr-word" data-word="${word}">${word}</span>`);
}

const blockCache = new Map();

async function tryGoogleBlock(text) {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=no&dt=t&q=${encodeURIComponent(text)}`
  );
  const data = await res.json();
  return data?.[0]?.map((segment) => segment[0]).join('') || null;
}

const MYMEMORY_MAX_CHARS = 450; // MyMemory hard-caps at 500; leave margin for encoding

async function myMemoryChunk(chunk) {
  const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|no`);
  const data = await res.json();
  if (String(data?.responseStatus) !== '200') return null;
  return data?.responseData?.translatedText || null;
}

// Splits on sentence boundaries and greedily packs them into <=450-char
// chunks, so scene-length paragraphs still work through MyMemory (which
// hard-caps a single query at 500 chars) when used as the fallback.
function splitIntoChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && (current + sentence).length > MYMEMORY_MAX_CHARS) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function tryMyMemoryBlock(text) {
  if (text.length <= MYMEMORY_MAX_CHARS) return myMemoryChunk(text);

  const chunks = splitIntoChunks(text);
  const translatedChunks = [];
  for (const chunk of chunks) {
    const translated = await myMemoryChunk(chunk);
    if (!translated) return null; // one failed chunk - let the caller show an error rather than a gap
    translatedChunks.push(translated);
  }
  return translatedChunks.join(' ');
}

// Translates a whole paragraph (not single words) - used for the "Norsk"
// popup on a page of text. Tries Google's endpoint first (generally better
// for full sentences), then falls back to MyMemory if that fails or is
// rate-limited. A failed attempt is never cached, so the next click retries
// instead of getting stuck on a transient error.
export async function translateBlock(text) {
  const key = text.trim();
  if (!key) return '';
  if (blockCache.has(key)) return blockCache.get(key);

  let result = null;
  for (const attempt of [tryGoogleBlock, tryMyMemoryBlock]) {
    try {
      const translated = await attempt(key);
      if (translated) {
        result = translated;
        break;
      }
    } catch {
      // try the next provider
    }
  }

  if (result) blockCache.set(key, result);
  return result;
}

// Simple built-in read-aloud (Web Speech API) - no service, no key, works
// offline once the browser has voices installed. Quality/voice availability
// varies by browser/OS, but every major one supports at least a default
// voice for English and Norwegian.
export function speak(text, lang) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // don't stack overlapping speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

function speakerButton(text, lang, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lang-btn speaker-btn';
  btn.title = label;
  btn.textContent = '🔊';
  btn.addEventListener('click', () => speak(text, lang));
  return btn;
}

// Adds a "🔊 Listen" button right after `afterEl` that reads `text` aloud
// in English via the browser's built-in speech synthesis. Returns the
// inserted button so callers can chain further inserts after it.
export function renderListenButton(afterEl, text) {
  const btn = speakerButton(text, 'en-US', 'Listen in English');
  afterEl.insertAdjacentElement('afterend', btn);
  return btn;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let noPopupEl = null;
let noPopupText = null; // text currently shown in the popup, used to support toggle-closed

function ensureNoPopup() {
  if (noPopupEl) return noPopupEl;
  noPopupEl = document.createElement('div');
  noPopupEl.className = 'no-popup';
  noPopupEl.hidden = true;
  document.body.appendChild(noPopupEl);
  return noPopupEl;
}

function hideNoPopup() {
  if (noPopupEl) noPopupEl.hidden = true;
  noPopupText = null;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.no-popup') && !e.target.closest('.no-toggle-btn')) hideNoPopup();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideNoPopup();
});

// Wires the shared "open a popup with the Norwegian translation of `text`"
// behaviour onto an already-created button element.
function attachNorwegianPopup(btn, text) {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const popup = ensureNoPopup();

    if (!popup.hidden && noPopupText === text) {
      hideNoPopup();
      return;
    }

    noPopupText = text;
    const rect = btn.getBoundingClientRect();
    popup.style.left = `${window.scrollX + rect.left}px`;
    popup.style.top = `${window.scrollY + rect.bottom + 6}px`;
    popup.innerHTML = '<p class="no-popup-text">Oversetter…</p>';
    popup.hidden = false;

    const translated = await translateBlock(text);
    if (noPopupText !== text) return; // closed or moved on before this resolved

    popup.innerHTML = `
      <button class="no-popup-close" type="button" aria-label="Lukk">✕</button>
      <p class="no-popup-text">${translated ? escapeHtml(translated) : 'Fant ikke oversettelse akkurat nå - prøv igjen.'}</p>
      ${translated ? '<button class="lang-btn speaker-btn no-popup-speak" type="button">🔊 Hør</button>' : ''}
    `;
    popup.querySelector('.no-popup-close').addEventListener('click', hideNoPopup);
    if (translated) {
      popup.querySelector('.no-popup-speak').addEventListener('click', () => speak(translated, 'nb-NO'));
    }
  });
}

// Adds a "🇳🇴 Norsk" toggle button right after `afterEl`. The page itself
// stays English-only by default; clicking the button opens a popup (not an
// inline box that pushes the page around) with the Norwegian translation
// of `text` plus its own "listen" button. Safe to call once per rendered
// page/scene.
export function renderReadInNorwegian(afterEl, text) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lang-btn no-toggle-btn';
  btn.textContent = '🇳🇴 Norsk';
  afterEl.insertAdjacentElement('afterend', btn);
  attachNorwegianPopup(btn, text);
  return btn;
}

// Compact icon-only version for tight spaces like choice buttons: a small
// 🔊 (listen in English) and 🇳🇴 (Norwegian popup) pair, appended into
// `container`. Both stop click propagation so they never trigger a parent
// choice button's own click handler.
export function renderChoiceLangControls(container, text) {
  const wrap = document.createElement('span');
  wrap.className = 'choice-lang-controls';

  const listenBtn = document.createElement('button');
  listenBtn.type = 'button';
  listenBtn.className = 'choice-icon-btn';
  listenBtn.title = 'Listen in English';
  listenBtn.textContent = '🔊';
  listenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speak(text, 'en-US');
  });

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.className = 'choice-icon-btn no-toggle-btn';
  noBtn.title = 'Norsk';
  noBtn.textContent = '🇳🇴';
  attachNorwegianPopup(noBtn, text);

  wrap.appendChild(listenBtn);
  wrap.appendChild(noBtn);
  container.appendChild(wrap);
  return wrap;
}
