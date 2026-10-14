import { imageUrl, mediaUrl } from './content.js';
import { escapeHtml } from './translate.js';

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

export function renderLexicon(container, { tribes, characters, media = [], lexicon = [] }) {
  if (tribes.size === 0) {
    container.innerHTML = '<h2>Clan Lexicon</h2><p>No villages have been added yet.</p>';
    return;
  }

  const byKind = (kind) => lexicon.filter((e) => e.kind === kind).sort((a, b) => a.position - b.position);
  const villageText = new Map(byKind('village').map((e) => [e.ref_id, e]));
  const bioText = new Map(byKind('bio').map((e) => [e.ref_id, e]));
  const history = byKind('history');

  const historySection = history.length
    ? `<section class="world-history">
        <h3>The History of the World</h3>
        ${history.map((c, i) => `<article class="history-chapter"><h4>${i + 1}. ${escapeHtml(c.title)}</h4>${paragraphs(c.body)}</article>`).join('')}
      </section>`
    : '';

  const sections = [...tribes.values()]
    .map((t) => {
      const members = [...characters.values()].filter((c) => c.tribe_id === t.id);
      const own = media.filter((m) => m.tribe_id === t.id);
      const shield = own.find((m) => m.kind === 'shield' && (m.mime_type || '').startsWith('image/'));
      const songs = own.filter((m) => m.kind === 'song');
      const pictures = own.filter((m) => m !== shield && m.kind !== 'song');
      const entry = villageText.get(t.id);

      return `
        <article class="tribe-entry">
          ${imgTag(t.image, t.name, 'lexicon-image')}
          <div class="tribe-heading">
            ${shield ? `<img class="tribe-shield" src="${escapeHtml(mediaUrl(shield.storage_path))}" alt="${escapeHtml(shield.title || `${t.name} shield`)}">` : ''}
            <h3>${escapeHtml(t.name)}</h3>
          </div>
          <p class="muted">${escapeHtml(t.territory?.region_name || '')}</p>
          ${entry ? paragraphs(entry.body) : ''}
          ${
            members.length
              ? `<div class="tribe-members"><h4>Villagers</h4>${members
                  .map((m) => {
                    const bio = bioText.get(m.id);
                    return bio
                      ? `<details class="villager-bio"><summary><strong>${escapeHtml(m.name)}</strong>${m.role ? ` <span class="muted">· ${escapeHtml(m.role)}</span>` : ''}</summary>${paragraphs(bio.body)}</details>`
                      : `<p><strong>${escapeHtml(m.name)}</strong></p>`;
                  })
                  .join('')}</div>`
              : ''
          }
          ${mediaSection('Songs', songs)}
          ${mediaSection('Pictures and more', pictures)}
        </article>`;
    })
    .join('');

  container.innerHTML = `<h2>Clan Lexicon</h2>${historySection}<h3 class="lexicon-villages">The villages and their people</h3><div class="lexicon-grid">${sections}</div>`;
}
