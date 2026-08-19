import { imageUrl } from './content.js';

function imgTag(path, alt) {
  const url = imageUrl(path);
  if (!url) return '';
  return `<img class="gallery-image" src="${url}" alt="${alt}" onerror="this.style.display='none'">`;
}

// Pure scrollable gallery of all visual material - no choices, no link to
// game progress. Reuses the same tribes/characters already loaded for the
// game, grouped by tribe.
export function renderGallery(container, { tribes, characters }) {
  if (tribes.size === 0) {
    container.innerHTML = '<h2>Galleri</h2><p>Ingen bilder er lagt inn ennå.</p>';
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
              <figcaption>${c.name}</figcaption>
            </figure>`
        )
        .join('');

      return `
        <section class="gallery-tribe">
          <h3>${t.name}${t.population ? ` <span class="muted">(${t.population} innbyggere)</span>` : ''}</h3>
          <figure class="gallery-figure gallery-figure-large">
            ${imgTag(t.image, t.name)}
            <figcaption>${t.territory?.region_name || t.name}</figcaption>
          </figure>
          ${members.length ? `<div class="gallery-grid">${memberCards}</div>` : ''}
        </section>`;
    })
    .join('');

  container.innerHTML = `<h2>Galleri</h2><div class="gallery">${sections}</div>`;
}
