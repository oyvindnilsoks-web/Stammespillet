import { imageUrl, mediaUrl } from './content.js';
import { escapeHtml } from './translate.js';

function imgTag(path, alt) {
  const url = imageUrl(path);
  if (!url) return '';
  return `<img class="gallery-image" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" onerror="this.style.display='none'">`;
}

function isImage(m) {
  return m.storage_path && (m.mime_type || '').startsWith('image/');
}

// Pure scrollable gallery of all visual material - no choices, no link to
// game progress. Reuses the same tribes/characters already loaded for the
// game, grouped by tribe, plus drawings/shields the teacher uploaded.
export function renderGallery(container, { tribes, characters, media = [] }) {
  if (tribes.size === 0) {
    container.innerHTML = '<h2>Gallery</h2><p>No images have been added yet.</p>';
    return;
  }

  const sections = [...tribes.values()]
    .map((t) => {
      const members = [...characters.values()].filter((c) => c.tribe_id === t.id);
      const memberCards = members
        .map(
          (c) => `
            <figure class="gallery-figure">
              ${imgTag(c.image, c.name)}
              <figcaption>${escapeHtml(c.name)}</figcaption>
            </figure>`
        )
        .join('');
      const pictureCards = media
        .filter((m) => m.tribe_id === t.id && isImage(m))
        .map(
          (m) => `
            <figure class="gallery-figure">
              <img class="gallery-image" src="${escapeHtml(mediaUrl(m.storage_path))}" alt="${escapeHtml(m.title || t.name)}" loading="lazy">
              <figcaption>${escapeHtml(m.title || '')}</figcaption>
            </figure>`
        )
        .join('');

      return `
        <section class="gallery-tribe">
          <h3>${escapeHtml(t.name)}${t.population ? ` <span class="muted">(population ${escapeHtml(t.population)})</span>` : ''}</h3>
          <figure class="gallery-figure gallery-figure-large">
            ${imgTag(t.image, t.name)}
            <figcaption>${escapeHtml(t.territory?.region_name || t.name)}</figcaption>
          </figure>
          ${pictureCards ? `<div class="gallery-grid">${pictureCards}</div>` : ''}
          ${members.length ? `<div class="gallery-grid">${memberCards}</div>` : ''}
        </section>`;
    })
    .join('');

  container.innerHTML = `<h2>Gallery</h2><div class="gallery">${sections}</div>`;
}
