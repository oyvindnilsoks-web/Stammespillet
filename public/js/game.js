import { imageUrl } from './content.js';

// A scene is an "entry scene" for a tribe if nothing in that tribe's own
// main-plot scene graph points to it. This lets the engine find a starting
// point per tribe without any hardcoded scene id or a dedicated "is_start"
// field. Only plot === 'main' scenes are considered: side-plot scenes
// (plot set to a tribe id) are optional detours reached via ordinary
// choices from main-plot scenes, not places the engine should ever start
// or assume a player must pass through.
export function findEntryScene(tribeId, scenes) {
  const mainScenes = [...scenes.values()].filter((s) => s.tribe_id === tribeId && (s.plot || 'main') === 'main');
  const referenced = new Set();
  for (const scene of mainScenes) {
    for (const choice of scene.choices || []) {
      if (choice.next_scene) referenced.add(choice.next_scene);
    }
  }
  const roots = mainScenes.filter((s) => !referenced.has(s.id)).sort((a, b) => a.id.localeCompare(b.id));
  return (roots[0] || mainScenes[0])?.id || null;
}

function imgTag(path, alt) {
  const url = imageUrl(path);
  if (!url) return '';
  return `<img class="scene-image" src="${url}" alt="${alt}" onerror="this.style.display='none'">`;
}

export function renderCharacterSelect(container, { characters, tribes }, onChoose) {
  const cards = [...characters.values()]
    .map((c) => {
      const tribe = tribes.get(c.tribe_id);
      return `
        <button class="character-card" data-id="${c.id}">
          ${imgTag(c.image, c.name)}
          <h3>${c.name}</h3>
          <p class="muted">${c.role || ''}${tribe ? ` · ${tribe.name}` : ''}</p>
          <p>${c.description || ''}</p>
          ${c.goal ? `<p class="muted">Mål: ${c.goal}</p>` : ''}
        </button>`;
    })
    .join('');

  container.innerHTML = `
    <h2>Velg karakter</h2>
    ${characters.size === 0 ? '<p>Ingen karakterer er lagt inn ennå.</p>' : `<div class="card-grid">${cards}</div>`}
  `;

  container.querySelectorAll('.character-card').forEach((btn) => {
    btn.addEventListener('click', () => onChoose(btn.dataset.id));
  });
}

export function renderScene(container, { scene, tribe }, onChoice) {
  const choices = (scene.choices || [])
    .map((c, i) => `<button class="choice-btn" data-idx="${i}">${c.text}</button>`)
    .join('');

  container.innerHTML = `
    <div class="scene">
      ${imgTag(scene.image, scene.title)}
      <h2>${scene.title || ''}</h2>
      ${tribe ? `<p class="muted">${tribe.name}</p>` : ''}
      <p class="scene-text">${scene.text || ''}</p>
      ${
        scene.is_ending
          ? `<p class="ending-label">— Slutt —</p>
             <div class="choices">
               <button class="choice-btn" id="credits-btn">Vis rulletekst</button>
               <button class="choice-btn" id="restart-btn">Spill igjen</button>
             </div>`
          : `<div class="choices">${choices}</div>`
      }
    </div>
  `;

  if (scene.is_ending) {
    container.querySelector('#credits-btn').addEventListener('click', () => onChoice('CREDITS'));
    container.querySelector('#restart-btn').addEventListener('click', () => onChoice(null));
    return;
  }

  container.querySelectorAll('.choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => onChoice(scene.choices[Number(btn.dataset.idx)]));
  });
}

export function applyConsequences(flags, consequences) {
  const next = { ...flags };
  for (const [key, delta] of Object.entries(consequences || {})) {
    next[key] = (next[key] || 0) + delta;
  }
  return next;
}
