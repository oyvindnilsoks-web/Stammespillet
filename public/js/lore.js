import { renderMarkdown } from './markdown.js';
import { renderInlineLangControls } from './translate.js';

// Pure background reading material - not connected to Supabase, spillfremgang,
// or student-authored content. Just displays the two planning/lore documents
// so the class can read them before playing.
const DOCS = {
  bibel: {
    label: 'Chronicle of the Clans',
    url: '/docs/world-lore.md',
    image: null,
    demangle: false,
  },
  song: {
    label: 'The Long Song',
    url: '/docs/the-long-song.md',
    image: '/assets/images/lore/long_song_placeholder.svg',
    demangle: true,
  },
};

const cache = {};

async function loadDoc(key) {
  if (cache[key]) return cache[key];
  const res = await fetch(DOCS[key].url);
  const raw = await res.text();
  cache[key] = renderMarkdown(raw, { demangle: DOCS[key].demangle });
  return cache[key];
}

export async function renderLore(container, initialKey = 'bibel') {
  const tabs = Object.entries(DOCS)
    .map(([key, doc]) => `<button class="lore-tab" data-key="${key}">${doc.label}</button>`)
    .join('');

  container.innerHTML = `
    <div class="lore-view">
      <h2>World Lore</h2>
      <div class="lore-tabs">${tabs}</div>
      <div class="lore-body" id="lore-body">Loading...</div>
    </div>
  `;

  const body = container.querySelector('#lore-body');

  async function showDoc(key) {
    container.querySelectorAll('.lore-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    body.innerHTML = 'Loading...';
    const html = await loadDoc(key);
    const cover = DOCS[key].image
      ? `<img class="lore-cover" src="${DOCS[key].image}" alt="${DOCS[key].label}">`
      : '';
    body.innerHTML = `${cover}${html}`;

    // Per-paragraph listen/translate controls rather than one control for
    // the whole document - "The Long Song" alone is ~10,000 words, and
    // translating that in one go would blow through the free translation
    // API's daily quota on a single click. Paragraph-sized chunks stay fast
    // and only get used when a student actually needs them.
    body.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) renderInlineLangControls(p, text);
    });
  }

  container.querySelectorAll('.lore-tab').forEach((btn) => {
    btn.addEventListener('click', () => showDoc(btn.dataset.key));
  });

  await showDoc(initialKey);
}
