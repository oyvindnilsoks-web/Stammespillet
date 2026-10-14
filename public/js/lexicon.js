import { imageUrl, mediaUrl } from './content.js';
import { escapeHtml } from './translate.js';
import { loadLexiconNorwegian } from './api.js';

function imgTag(path, alt, cls) {
  const url = imageUrl(path);
  if (!url) return '';
  return `<img class="${cls}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" onerror="this.style.display='none'">`;
}

export function renderMediaItem(m) {
  const url = mediaUrl(m.storage_path);
  const type = m.mime_type || '';
  let file = '';
  if (url && type.startsWith('audio/')) {
    file = `<audio controls preload="none" src="${escapeHtml(url)}"></audio>`;
  } else if (url && type.startsWith('image/')) {
    file = `<img class="media-image" src="${escapeHtml(url)}" alt="${escapeHtml(m.title || '')}" loading="lazy">`;
  } else if (url) {
    file = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open file</a>`;
  }
  return `
    <figure class="media-item">
      ${m.title ? `<figcaption class="media-title">${escapeHtml(m.title)}</figcaption>` : ''}
      ${file}
      ${m.body ? `<p class="media-body">${escapeHtml(m.body)}</p>` : ''}
    </figure>`;
}

function mediaSection(title, items) {
  if (!items.length) return '';
  return `<div class="media-group"><h4>${title}</h4>${items.map(renderMediaItem).join('')}</div>`;
}

// Text written for the class to read, in paragraphs.
const paragraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');

const LABELS = {
  en: {
    title: 'Clan Lexicon',
    none: 'No villages have been added yet.',
    history: 'The History of the World',
    villages: 'The villages and their people',
    villagers: 'Villagers',
    songs: 'Songs',
    pictures: 'Pictures and more',
    translating: 'Translating…',
    failed: 'The translation is not available right now.',
  },
  no: {
    title: 'Klanleksikon',
    none: 'Ingen landsbyer er lagt til ennå.',
    history: 'Verdens historie',
    villages: 'Landsbyene og folkene deres',
    villagers: 'Innbyggere',
    songs: 'Sanger',
    pictures: 'Bilder og mer',
    translating: 'Oversetter …',
    failed: 'Oversettelsen er ikke tilgjengelig akkurat nå.',
  },
};

// The Clan Lexicon. The texts are written in English; the Norsk button shows them in
// Norwegian (translated by the server, and saved there).
export function renderLexicon(container, { tribes, characters, media = [], lexicon = [] }, lang = 'en', norwegian = null) {
  const t = LABELS[lang];
  const switcher = `<div class="lexicon-lang" role="group" aria-label="Language">
      <button type="button" class="lore-tab ${lang === 'no' ? 'active' : ''}" data-lex-lang="no" aria-pressed="${lang === 'no'}">Norsk</button>
      <button type="button" class="lore-tab ${lang === 'en' ? 'active' : ''}" data-lex-lang="en" aria-pressed="${lang === 'en'}">English</button>
    </div>`;

  if (tribes.size === 0) {
    container.innerHTML = `<h2>${t.title}</h2><p>${t.none}</p>`;
    return;
  }

  const textOf = (entry) => {
    if (lang !== 'no' || !norwegian) return entry;
    const no = norwegian.get(entry.id);
    return no && no.body ? { ...entry, title: no.title || entry.title, body: no.body } : entry;
  };
  const byKind = (kind) => lexicon.filter((e) => e.kind === kind).sort((a, b) => a.position - b.position);
  const villageText = new Map(byKind('village').map((e) => [e.ref_id, textOf(e)]));
  const bioText = new Map(byKind('bio').map((e) => [e.ref_id, textOf(e)]));
  const history = byKind('history').map(textOf);

  const historySection = history.length
    ? `<section class="world-history">
        <h3>${t.history}</h3>
        ${history.map((c, i) => `<article class="history-chapter"><h4>${i + 1}. ${escapeHtml(c.title)}</h4>${paragraphs(c.body)}</article>`).join('')}
      </section>`
    : '';

  const sections = [...tribes.values()]
    .map((tribe) => {
      const members = [...characters.values()].filter((c) => c.tribe_id === tribe.id);
      const own = media.filter((m) => m.tribe_id === tribe.id);
      const shield = own.find((m) => m.kind === 'shield' && (m.mime_type || '').startsWith('image/'));
      const songs = own.filter((m) => m.kind === 'song');
      const pictures = own.filter((m) => m !== shield && m.kind !== 'song');
      const entry = villageText.get(tribe.id);

      return `
        <article class="tribe-entry">
          ${imgTag(tribe.image, tribe.name, 'lexicon-image')}
          <div class="tribe-heading">
            ${shield ? `<img class="tribe-shield" src="${escapeHtml(mediaUrl(shield.storage_path))}" alt="${escapeHtml(shield.title || `${tribe.name} shield`)}">` : ''}
            <h3>${escapeHtml(tribe.name)}</h3>
          </div>
          <p class="muted">${escapeHtml(tribe.territory?.region_name || '')}</p>
          ${entry ? paragraphs(entry.body) : ''}
          ${
            members.length
              ? `<div class="tribe-members"><h4>${t.villagers}</h4>${members
                  .map((m) => {
                    const bio = bioText.get(m.id);
                    return bio
                      ? `<details class="villager-bio"><summary><strong>${escapeHtml(m.name)}</strong>${m.role ? ` <span class="muted">· ${escapeHtml(m.role)}</span>` : ''}</summary>${paragraphs(bio.body)}</details>`
                      : `<p><strong>${escapeHtml(m.name)}</strong></p>`;
                  })
                  .join('')}</div>`
              : ''
          }
          ${mediaSection(t.songs, songs)}
          ${mediaSection(t.pictures, pictures)}
        </article>`;
    })
    .join('');

  container.innerHTML = `<div class="lexicon-head"><h2>${t.title}</h2>${switcher}</div><p class="muted" id="lexicon-status" role="status"></p>${historySection}<h3 class="lexicon-villages">${t.villages}</h3><div class="lexicon-grid">${sections}</div>`;

  container.querySelectorAll('[data-lex-lang]').forEach((button) =>
    button.addEventListener('click', async () => {
      const wanted = button.dataset.lexLang;
      if (wanted === lang) return;
      if (wanted === 'en') return renderLexicon(container, { tribes, characters, media, lexicon }, 'en', norwegian);
      // Norwegian: fetched (the server translates a few texts at a time) and kept for later.
      const status = container.querySelector('#lexicon-status');
      status.textContent = LABELS.no.translating;
      try {
        let result = await loadLexiconNorwegian();
        while (result.pending > 0) result = await loadLexiconNorwegian();
        const map = new Map(result.entries.map((e) => [e.id, e]));
        renderLexicon(container, { tribes, characters, media, lexicon }, 'no', map);
      } catch {
        status.textContent = LABELS.no.failed;
      }
    })
  );
}
