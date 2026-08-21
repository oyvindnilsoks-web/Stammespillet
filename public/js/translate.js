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
