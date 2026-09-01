import { renderMarkdown } from './markdown.js';
import { renderInlineLangControls } from './translate.js';
import { STORY_LEVELS } from './story-levels.js';

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
  levels: {
    label: 'The Story (4 Levels)',
    custom: true,
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

    if (DOCS[key].custom) {
      renderStoryLevels(body);
      return;
    }

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

  // "The Story (4 Levels)" - the same backstory retold at four depths, so
  // weaker and stronger readers can each pick a version that fits them.
  // Not markdown-backed like the other tabs: it has its own level switcher
  // and a word list under every level.
  function renderStoryLevels(body, activeIdx = 0) {
    body.innerHTML = `
      <p class="muted lore-levels-intro">The same story, told four times - a little longer and a little deeper each time. Pick the version that fits you.</p>
      <div class="level-tabs" id="level-tabs"></div>
      <div id="level-panel"></div>
    `;

    const tabsWrap = body.querySelector('#level-tabs');
    const panel = body.querySelector('#level-panel');

    STORY_LEVELS.forEach((lvl, i) => {
      const btn = document.createElement('button');
      btn.className = 'level-tab';
      btn.type = 'button';
      btn.textContent = lvl.label;
      btn.title = lvl.name;
      btn.addEventListener('click', () => paintLevel(i));
      tabsWrap.appendChild(btn);
    });

    function paintLevel(i) {
      [...tabsWrap.children].forEach((btn, idx) => btn.classList.toggle('active', idx === i));
      const lvl = STORY_LEVELS[i];
      const glossaryItems = lvl.glossary
        .map(([term, def]) => `
          <div class="glossary-item">
            <span class="glossary-term">${term}</span>
            <p class="glossary-def">${def}</p>
          </div>
        `)
        .join('');

      panel.innerHTML = `
        <h3>${lvl.title}</h3>
        <p class="muted level-meta">${lvl.name} &middot; ~${lvl.words} words &middot; ${lvl.minutes} min read</p>
        <div class="story-text">${lvl.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
        <div class="glossary-box">
          <div class="glossary-title">Word List</div>
          <div class="glossary-grid">${glossaryItems}</div>
        </div>
      `;

      panel.querySelectorAll('.story-text p').forEach((p) => {
        const text = p.textContent.trim();
        if (text) renderInlineLangControls(p, text);
      });
    }

    paintLevel(activeIdx);
  }

  container.querySelectorAll('.lore-tab').forEach((btn) => {
    btn.addEventListener('click', () => showDoc(btn.dataset.key));
  });

  await showDoc(initialKey);
}
