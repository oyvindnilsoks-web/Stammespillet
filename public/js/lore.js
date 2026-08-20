import { renderMarkdown } from './markdown.js';

// Pure background reading material - not connected to Supabase, spillfremgang,
// or student-authored content. Just displays the two planning/lore documents
// so the class can read them before playing.
const DOCS = {
  bibel: {
    label: 'Lore-bibelen',
    url: '/docs/lore-bibel.md',
    image: '/assets/images/lore/lore_bibel_placeholder.svg',
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
      <h2>Verdenshistorie</h2>
      <div class="lore-tabs">${tabs}</div>
      <div class="lore-body" id="lore-body">Laster...</div>
    </div>
  `;

  const body = container.querySelector('#lore-body');

  async function showDoc(key) {
    container.querySelectorAll('.lore-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
    body.innerHTML = 'Laster...';
    const html = await loadDoc(key);
    body.innerHTML = `<img class="lore-cover" src="${DOCS[key].image}" alt="${DOCS[key].label}">${html}`;
  }

  container.querySelectorAll('.lore-tab').forEach((btn) => {
    btn.addEventListener('click', () => showDoc(btn.dataset.key));
  });

  await showDoc(initialKey);
}
