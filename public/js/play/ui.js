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
     <div class="play-council-bar" id="play-council-bar" hidden></div>
     <div class="play-overlay" id="play-overlay" hidden role="dialog" aria-modal="true"></div>`
  );
  const councilBar = wrap.querySelector('#play-council-bar');
  let onCouncilBar = null;
  councilBar.addEventListener('click', (e) => {
    if (e.target.closest('button') && onCouncilBar) onCouncilBar();
  });
  const hud = wrap.querySelector('#play-hud');
  const prompt = wrap.querySelector('#play-prompt');
  const overlay = wrap.querySelector('#play-overlay');
  let onClose = null;
  let onPrompt = null;
  // The game listens for these when a window opens or closes: while a window is
  // open the keys are for the window (typing an answer), not for the game.
  const toggleListeners = new Set();
  const toggled = () => toggleListeners.forEach((fn) => fn(!overlay.hidden));
  prompt.addEventListener('click', () => onPrompt && onPrompt());

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.innerHTML = '';
    const done = onClose;
    onClose = null;
    toggled();
    if (done) done();
  }

  function show(html, closed) {
    overlay.innerHTML = `<div class="play-window">${html}</div>`;
    overlay.hidden = false;
    onClose = closed || null;
    toggled();
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
    // Runs fn(open) when a window opens or closes. Returns a way to stop listening.
    onToggle(fn) {
      toggleListeners.add(fn);
      return () => toggleListeners.delete(fn);
    },
    close,
    setHud(html) {
      hud.innerHTML = html;
    },
    // The bar about the village council: who is here, and a button when the
    // villagers can start or join the council. null hides it.
    setCouncilBar(bar) {
      if (!bar) {
        councilBar.hidden = true;
        onCouncilBar = null;
        return;
      }
      const html = `<span>${escapeHtml(bar.text)}</span>${bar.label ? `<button type="button" class="choice-btn">${escapeHtml(bar.label)}</button>` : ''}`;
      if (councilBar.dataset.html !== html) {
        councilBar.innerHTML = html;
        councilBar.dataset.html = html;
      }
      onCouncilBar = bar.onClick || null;
      councilBar.hidden = false;
    },

    // The window of the village council. build(host) fills it.
    openCouncil(title, build, closed) {
      show(
        `<div class="play-window-head"><div><h2>${escapeHtml(title)}</h2><p class="muted">The village council</p></div><button class="small-btn" data-close>Close</button></div>
         <div id="council-host"></div>`,
        closed
      );
      build(overlay.querySelector('#council-host'));
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
    openVillager(villager, tribe, frame, drawingUrl, closed, extraTopics = []) {
      const topics = [...dialogTopics(villager), ...extraTopics];
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
          if (topic.onShow) topic.onShow();
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
           ${enemy ? '' : '<button class="choice-btn" data-enter>Go in</button>'}
           <button class="small-btn" data-close>${enemy ? 'Turn back' : 'Stay outside'}</button>
         </div>`,
        closed
      );
      if (tribe.charter_type === 'shadow') overlay.firstElementChild.classList.add('dark');
      overlay.querySelector('[data-enter]')?.addEventListener('click', () => {
        onClose = null;
        close();
        enter();
      });
    },

    // The tasks that clean the poison. quiz is { questions, token }; submit(answers)
    // resolves to what the server said. closed runs when the window is closed.
    openTask(quiz, submit, closed) {
      const rows = quiz.questions
        .map(
          (q, i) => `<label class="task-row"><span class="muted">${q.kind === 'math' ? 'Maths' : 'Glossary'} ${i + 1}</span>
            <span class="task-prompt">${escapeHtml(q.prompt)}</span>
            <input type="text" data-answer="${i}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`
        )
        .join('');
      show(
        `<div class="play-window-head"><div><h2>Clean the poison</h2><p class="muted">Answer the questions. 4 or 5 right cleans the poison around you and protects your villages.</p></div><button class="small-btn" data-close>Close</button></div>
         <div class="play-tasks">${rows}</div>
         <p class="task-result" id="task-result" role="status"></p>
         <div class="play-actions"><button class="choice-btn" id="task-check">Check my answers</button></div>`,
        closed
      );
      const inputs = [...overlay.querySelectorAll('[data-answer]')];
      inputs[0]?.focus();
      const check = overlay.querySelector('#task-check');
      const out = overlay.querySelector('#task-result');
      inputs.forEach((input, i) =>
        input.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          (inputs[i + 1] || check).focus();
          if (!inputs[i + 1]) check.click();
        })
      );
      check.addEventListener('click', async () => {
        check.disabled = true;
        out.textContent = 'Checking…';
        try {
          const r = await submit(inputs.map((x) => x.value));
          if (r.error) out.textContent = r.error;
          else if (r.cooling) out.textContent = `${r.correct} of ${r.total} right. Wait half a minute before the next reward.`;
          else if (r.cleaned) out.textContent = `${r.correct} of ${r.total} right! The poison around you shrank${r.shield ? ` and your villages are protected for ${r.shield} more steps` : ''}.`;
          else out.textContent = `${r.correct} of ${r.total} right. You need at least ${r.total - 1} to clean the poison. Try new questions.`;
          if (r.ok) check.hidden = true;
        } catch {
          out.textContent = 'Something went wrong. Try again.';
          check.disabled = false;
        }
      });
    },

    // The glossary battle window. api = { list(), start(), accept(id), submit(id, answers),
    // cancel(id), seen() }: what the hub shows, and the moves. onChange runs when the
    // XP may have changed.
    // The backpack: the rank on the XP ladder, and the artifacts. Those that have
    // been unlocked show their picture; the others are locked places with the rank
    // that opens them. data comes from /api/artifact.
    openBackpack(data, closed) {
      const r = data.rank;
      const names = data.ladder.names;
      const bar = r.next === null ? 100 : Math.round(((r.xp - r.from) / (r.next - r.from)) * 100);
      const progress = r.next === null ? 'The highest rank.' : `${r.toNext} XP to rank ${r.rank + 1} (${escapeHtml(names[r.rank])})`;
      const items = data.backpack.length
        ? data.backpack
            .map((a) =>
              a.locked
                ? `<li class="pack-item locked"><div class="pack-lock" aria-hidden="true">🔒</div><strong>Locked</strong><span class="muted">Unlocks at rank ${a.rank_required} (${escapeHtml(names[a.rank_required - 1] || '')})</span></li>`
                : `<li class="pack-item"><img src="${escapeHtml(mediaUrl(a.storage_path))}" alt=""><strong>${escapeHtml(a.name)}</strong><span class="muted">${escapeHtml(a.description || '')}</span></li>`
            )
            .join('')
        : '<li class="muted">There are no artifacts yet. When the students have drawn some and the teacher has approved them, they appear here.</li>';
      show(
        `<div class="play-window-head"><div><h2>Backpack</h2><p class="muted">Rank ${r.rank} · ${escapeHtml(r.name)}</p></div><button class="small-btn" data-close>Close</button></div>
         <div class="rank-bar" role="img" aria-label="Progress to the next rank"><div style="width:${bar}%"></div></div>
         <p class="muted">${r.xp} XP · ${progress}</p>
         <ul class="pack-grid">${items}</ul>`,
        closed
      );
    },

    // A challenge from another student on the map: take it or say no.
    openInvite(invite, accept, decline, closed) {
      show(
        `<div class="play-window-head"><div><h2>${escapeHtml(invite.from)} challenges you!</h2><p class="muted">A word battle: the same words, at the same time</p></div></div>
         <div class="play-actions"><button class="choice-btn" id="invite-yes">Take the challenge</button><button class="small-btn" id="invite-no">No thanks</button></div>`,
        closed
      );
      overlay.querySelector('#invite-yes').addEventListener('click', accept);
      overlay.querySelector('#invite-no').addEventListener('click', decline);
    },

    // firstBattle: a battle that is being started (a promise), to play at once.
    openBattle(api, onChange, closed, firstBattle = null) {
      const result = (r) => (r === 'win' ? 'You won' : r === 'draw' ? 'Draw' : 'You lost');
      const frame = (inner) =>
        show(
          `<div class="play-window-head"><div><h2>Word battle</h2><p class="muted">Two students answer the same words. The most right wins, and the quickest if it is equal.</p></div><button class="small-btn" data-close>Close</button></div>${inner}`,
          closed
        );

      const playQuiz = (battle, onDone) => {
        const rows = battle.questions
          .map(
            (q, i) => `<label class="task-row"><span class="muted">${i + 1}</span><span class="task-prompt">${escapeHtml(q.prompt)}</span>
              <input type="text" data-answer="${i}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`
          )
          .join('');
        frame(`<div class="play-tasks">${rows}</div><p class="task-result" id="battle-result" role="status"></p>
          <div class="play-actions"><button class="choice-btn" id="battle-hand-in">Hand in</button></div>`);
        const inputs = [...overlay.querySelectorAll('[data-answer]')];
        inputs[0]?.focus();
        const out = overlay.querySelector('#battle-result');
        const button = overlay.querySelector('#battle-hand-in');
        inputs.forEach((input, i) =>
          input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (inputs[i + 1]) inputs[i + 1].focus();
            else button.click();
          })
        );
        button.addEventListener('click', async () => {
          button.disabled = true;
          out.textContent = 'Checking…';
          try {
            const r = await api.submit(battle.id, inputs.map((x) => x.value));
            if (!r.ok) {
              out.textContent = r.error || 'Something went wrong.';
              button.disabled = false;
              return;
            }
            onDone(r);
          } catch {
            out.textContent = 'Something went wrong. Try again.';
            button.disabled = false;
          }
        });
      };

      const finished = (r) => {
        const text = r.finished
          ? `<h3>${result(r.result)}!</h3><p>You got <strong>${r.score}</strong> of ${r.total} right. ${escapeHtml(r.vs)} got <strong>${r.vs_score}</strong>.</p><p>+${r.xp} XP. You now have <strong>${r.stats.xp} XP</strong> (${r.stats.wins} won, ${r.stats.losses} lost, ${r.stats.draws} draws).</p>`
          : `<h3>Done!</h3><p>You got <strong>${r.score}</strong> of ${r.total} right. When the other student has handed in too, you see who won. The result comes up in the game.</p>`;
        frame(`<div class="play-answer">${text}</div><div class="play-actions"><button class="choice-btn" id="battle-back">Back to the battles</button></div>`);
        overlay.querySelector('#battle-back').addEventListener('click', hub);
        onChange();
      };

      const hub = async () => {
        frame('<p class="muted">Loading…</p>');
        let d;
        try {
          d = await api.list();
        } catch {
          frame('<p class="error">Could not load the battles.</p>');
          return;
        }
        const open = d.open.length
          ? d.open.map((o) => `<li><span>${escapeHtml(o.from)} is waiting</span> <button class="small-btn" data-accept="${escapeHtml(o.id)}">Take the battle</button></li>`).join('')
          : '<li class="muted">Nobody is waiting right now. Start a battle, and the next student can take it.</li>';
        const waiting = d.waiting.length
          ? d.waiting.map((w) => `<li><span>Your battle (you got ${w.score} right) is waiting</span> <button class="small-btn" data-cancel="${escapeHtml(w.id)}">Take it away</button></li>`).join('')
          : '';
        const recent = d.recent.length
          ? d.recent.map((r) => `<li><span>${result(r.result)} against ${escapeHtml(r.vs)}: ${r.score}–${r.vs_score}${r.unseen ? ' <strong>(new)</strong>' : ''}</span></li>`).join('')
          : '<li class="muted">No battles yet.</li>';
        frame(`<div class="play-answer"><p><strong>${d.stats.xp} XP</strong> · ${d.stats.wins} won, ${d.stats.losses} lost, ${d.stats.draws} draws</p></div>
          <div class="play-actions"><button class="choice-btn" id="battle-start">Start a battle (${d.questions} words)</button></div>
          <h3>Waiting for an opponent</h3><ul class="battle-list">${open}</ul>
          ${waiting ? `<h3>Your waiting battles</h3><ul class="battle-list">${waiting}</ul>` : ''}
          <h3>Your last battles</h3><ul class="battle-list">${recent}</ul>`);
        if (d.unseen.length) api.seen().then(onChange).catch(() => {});

        const begin = async (promise) => {
          const b = await promise;
          if (!b.ok) {
            frame(`<p class="error">${escapeHtml(b.error || 'Could not start.')}</p><div class="play-actions"><button class="choice-btn" id="battle-back">Back</button></div>`);
            overlay.querySelector('#battle-back').addEventListener('click', hub);
            return;
          }
          playQuiz(b, finished);
        };
        overlay.querySelector('#battle-start').addEventListener('click', () => begin(api.start()));
        overlay.querySelectorAll('[data-accept]').forEach((btn) => btn.addEventListener('click', () => begin(api.accept(btn.dataset.accept))));
        overlay.querySelectorAll('[data-cancel]').forEach((btn) =>
          btn.addEventListener('click', async () => {
            await api.cancel(btn.dataset.cancel);
            hub();
          })
        );
      };
      if (firstBattle) {
        frame('<p class="muted">Getting the words…</p>');
        firstBattle
          .then((b) => {
            if (b.ok) playQuiz(b, finished);
            else {
              frame(`<p class="error">${escapeHtml(b.error || 'Could not start.')}</p><div class="play-actions"><button class="choice-btn" id="battle-back">Back</button></div>`);
              overlay.querySelector('#battle-back').addEventListener('click', hub);
            }
          })
          .catch(() => frame('<p class="error">Something went wrong. Try again.</p>'));
      } else {
        hub();
      }
    },

    // Something the player finds or hears: a title, who it is for, and the text.
    openNote(title, subtitle, body, closed) {
      show(
        `<div class="play-window-head">
           <div><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(subtitle)}</p></div>
           <button class="small-btn" data-close>OK</button>
         </div>
         <div class="play-answer"><p class="play-text">${text(body)}</p></div>`,
        closed
      );
    },

    // The problems the player has heard about, and what to do about each.
    openQuestLog(items, closed) {
      const rows = items.length
        ? items
            .map(
              (q) => `<section class="play-block"><h3>${escapeHtml(q.who)} <span class="muted">· ${escapeHtml(q.where)}</span></h3>
                <p class="play-text">${text(q.problem)}</p>
                ${q.hint ? `<p><strong>Hint:</strong> ${text(q.hint)}</p>` : ''}
                <p class="play-closed-note">${escapeHtml(q.status)}</p></section>`
            )
            .join('')
        : '<p class="muted">No problems yet. Talk to the villagers and ask if they need help.</p>';
      show(
        `<div class="play-window-head"><div><h2>Problems to solve</h2></div><button class="small-btn" data-close>Close</button></div>${rows}`,
        closed
      );
    },

    // The sign in the middle of a village: what the students wrote about it.
    openBoard(tribe, media, closed, council = null) {
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

      const councilHtml = council
        ? `<section class="play-block"><h3>The council</h3>${[
            council.government && `<p><strong>Rule:</strong> ${text(council.government)}</p>`,
            council.god && `<p><strong>God:</strong> ${text(council.god)}</p>`,
            council.laws && `<p><strong>Laws:</strong> ${text(council.laws)}</p>`,
            council.allies.length && `<p><strong>Allies:</strong> ${escapeHtml(council.allies.join(', '))}</p>`,
            council.enemies.length && `<p><strong>At war with:</strong> ${escapeHtml(council.enemies.join(', '))}</p>`,
          ]
            .filter(Boolean)
            .join('')}</section>`
        : '';

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
           ${councilHtml}
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

