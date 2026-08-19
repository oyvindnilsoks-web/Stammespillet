import { imageUrl } from './content.js';

function imgTag(path, alt) {
  const url = imageUrl(path);
  if (!url) return '';
  return `<img class="lexicon-image" src="${url}" alt="${alt}" onerror="this.style.display='none'">`;
}

export function renderLexicon(container, { tribes, characters }) {
  if (tribes.size === 0) {
    container.innerHTML = '<h2>Stammeleksikon</h2><p>Ingen stammer er lagt inn ennå.</p>';
    return;
  }

  const sections = [...tribes.values()]
    .map((t) => {
      const members = [...characters.values()].filter((c) => c.tribe_id === t.id);
      const relations = Object.entries(t.relations || {})
        .map(([otherId, rel]) => `${tribes.get(otherId)?.name || otherId}: ${rel}`)
        .join(', ');

      return `
        <article class="tribe-entry">
          ${imgTag(t.image, t.name)}
          <h3>${t.name}</h3>
          <p class="muted">${t.territory?.region_name || ''}</p>
          <p><strong>Ressurs:</strong> ${t.resource || '–'}</p>
          <p><strong>Kultur:</strong> ${t.culture || '–'}</p>
          ${relations ? `<p><strong>Forhold til andre stammer:</strong> ${relations}</p>` : ''}
          ${
            members.length
              ? `<div class="tribe-members"><strong>Karakterer:</strong> ${members.map((m) => m.name).join(', ')}</div>`
              : ''
          }
        </article>`;
    })
    .join('');

  container.innerHTML = `<h2>Stammeleksikon</h2><div class="lexicon-grid">${sections}</div>`;
}
