import { escapeHtml, translatable } from '../translate.js';
import { CHARTERS } from '../charters.js';
import { imageUrl, mediaUrl } from '../content.js';
import { dialogTopics } from './data.js';
import { figurePortrait } from './figures.js';

// The parts of the game that are ordinary HTML laid over the picture: the
// counter at the top, the "press E" hint, and the windows for talking to a
// villager and reading a village sign. They are HTML, not drawn, so the words
// can be clicked for a translation and read out, like everywhere else.

// One of the 60 figures as a picture (see figures.js).
export const heroPortrait = figurePortrait;

const text = (s) => translatable(escapeHtml(String(s)));

export function createUi(wrap) {
  wrap.insertAdjacentHTML(
    'beforeend',
    `<div class="play-hud" id="play-hud" aria-live="polite"></div>
     <button type="button" class="play-prompt" id="play-prompt" hidden></button>
     <div class="play-overlay" id="play-overlay" hidden role="dialog" aria-modal="true"></div>`
  );
  const hud = wrap.querySelector('#play-hud');
  const prompt = wrap.querySelector('#play-prompt');
  const overlay = wrap.querySelector('#play-overlay');
  let onClose = null;
  let onPrompt = null;
  prompt.addEventListener('click', () => onPrompt && onPrompt());

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.innerHTML = '';
    const done = onClose;
    onClose = null;
    if (done) done();
  }

  function show(html, closed) {
    overlay.innerHTML = `<div class="play-window">${html}</div>`;
    overlay.hidden = false;
    onClose = closed || null;
    overlay.querySelector('[data-close]')?.addEventListener('click', close);
    overlay.querySelector('[data-close]')?.focus();
  }

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return {
    isOpen: () => !overlay.hidden,
    close,
    setHud(html) {
      hud.innerHTML = html;
    },
    // The button at the bottom: what can be done here, and what clicking it does.
    setPrompt(message, action) {
      onPrompt = action || null;
      if (!message) {
        prompt.hidden = true;
        return;
      }
      if (prompt.textContent !== message) prompt.textContent = message;
      prompt.hidden = false;
    },

    // Talking to a villager: ask a question, read the answer.
    openVillager(villager, tribe, frame, drawingUrl, closed) {
      const topics = dialogTopics(villager);
      const buttons = topics.map((t, i) => `<button class="play-topic" data-topic="${i}">${escapeHtml(t.question)}</button>`).join('');
      show(
        `<div class="play-window-head">
           ${drawingUrl ? `<img class="play-portrait-img" src="${escapeHtml(drawingUrl)}" alt="Drawing of ${escapeHtml(villager.name)}">` : heroPortrait(frame)}
           <div><h2>${escapeHtml(villager.name)}</h2><p class="muted">${escapeHtml(tribe.name)}</p></div>
           <button class="small-btn" data-close>Close</button>
         </div>
         <div class="play-answer" id="play-answer"><p class="muted">Choose a question.</p></div>
         <div class="play-topics">${buttons}</div>`,
        closed
      );
      const answer = overlay.querySelector('#play-answer');
      overlay.querySelectorAll('[data-topic]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const topic = topics[Number(btn.dataset.topic)];
          answer.innerHTML = `<p class="play-question">${escapeHtml(topic.question)}</p><p class="play-text">${text(topic.answer)}</p>`;
          overlay.querySelectorAll('.play-topic').forEach((b) => b.classList.toggle('active', b === btn));
        })
      );
      // Start with the introduction so there is always something to read.
      overlay.querySelector('[data-topic="0"]')?.click();
    },

    // Walking onto a village on the map: a short introduction and the choice to
    // go in. A village the player's own is at war with stays closed.
    openVillageGate(tribe, shieldUrl, summary, villagers, enemy, enter, closed) {
      show(
        `<div class="play-window-head">
           ${shieldUrl ? `<img class="play-shield" src="${escapeHtml(shieldUrl)}" alt="">` : ''}
           <div><h2>${escapeHtml(tribe.name)}</h2><p class="muted">${villagers} ${villagers === 1 ? 'villager' : 'villagers'} to meet</p></div>
         </div>
         ${enemy ? '<p class="play-closed">⚔ Your village is at war with this village. The gate is closed and you cannot go in.</p>' : ''}
         ${summary ? `<div class="play-answer"><p class="play-text">${text(summary)}</p></div>` : ''}
         <div class="play-actions">
           ${enemy ? '' : '<button class="primary-btn" data-enter>Go in</button>'}
           <button class="small-btn" data-close>${enemy ? 'Turn back' : 'Stay outside'}</button>
         </div>`,
        closed
      );
      overlay.querySelector('[data-enter]')?.addEventListener('click', () => {
        onClose = null;
        close();
        enter();
      });
    },

    // The sign in the middle of a village: what the students wrote about it.
    openBoard(tribe, media, closed) {
      const type = tribe.charter_type === 'shadow' ? 'shadow' : 'village';
      const charter = tribe.charter || {};
      const sections = (CHARTERS[type]?.sections || [])
        .map((section) => {
          const rows = section.fields
            .filter((f) => charter[f.key] && f.key !== 'name' && f.key !== 'group_members')
            .map((f) => `<p>${f.label ? `<strong>${escapeHtml(f.label)}:</strong> ` : ''}${text(charter[f.key])}</p>`)
            .join('');
          return rows ? `<section class="play-block"><h3>${escapeHtml(section.title)}</h3>${rows}</section>` : '';
        })
        .join('');
      const pictures = media.filter((m) => (m.kind === 'image' || m.kind === 'drawing') && m.storage_path);
      const shields = media.filter((m) => m.kind === 'shield' && m.storage_path);
      const songs = media.filter((m) => m.kind === 'song');
      const mainImage = tribe.image ? imageUrl(tribe.image) : null;

      const gallery = pictures.length
        ? `<section class="play-block"><h3>Pictures</h3><div class="play-pictures">${pictures
            .map(
              (m) =>
                `<figure><img src="${escapeHtml(mediaUrl(m.storage_path))}" alt="${escapeHtml(m.title || '')}" loading="lazy"><figcaption>${escapeHtml(m.title || '')}</figcaption></figure>`
            )
            .join('')}</div></section>`
        : '';
      const songHtml = songs.length
        ? `<section class="play-block"><h3>Songs</h3>${songs
            .map(
              (m) =>
                `<div class="play-song"><strong>${escapeHtml(m.title || 'Song')}</strong>${
                  m.storage_path ? `<audio controls preload="none" src="${escapeHtml(mediaUrl(m.storage_path))}"></audio>` : ''
                }${m.body ? `<p class="play-lyrics">${text(m.body)}</p>` : ''}</div>`
            )
            .join('')}</section>`
        : '';

      show(
        `<div class="play-window-head">
           ${shields[0] ? `<img class="play-shield" src="${escapeHtml(mediaUrl(shields[0].storage_path))}" alt="">` : ''}
           <div><h2>${escapeHtml(tribe.name)}</h2><p class="muted">${type === 'shadow' ? 'A village people avoid' : 'A village'}</p></div>
           <button class="small-btn" data-close>Close</button>
         </div>
         <div class="play-board">
           ${mainImage ? `<img class="play-hero-image" src="${escapeHtml(mainImage)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
           ${sections || '<p class="muted">Nobody has written anything on this sign yet.</p>'}
           ${gallery}
           ${songHtml}
         </div>`,
        () => {
          overlay.querySelectorAll('audio').forEach((a) => a.pause());
          if (closed) closed();
        }
      );
    },

    destroy() {
      document.removeEventListener('keydown', onKey);
      hud.remove();
      prompt.remove();
      overlay.remove();
    },
  };
}

