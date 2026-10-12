import { escapeHtml } from '../translate.js';
import { createUi } from './ui.js';
import { loadWorld, cleanseWorld, presenceBeat, presenceState, startCouncilSession, startTask, submitTask } from '../api.js';
import { renderCouncil } from '../council.js';
import { ensureFigures, figureSheetUrl } from './figures.js';
import { mappedVillages, villagersOf, ownVillagers, playerLook, allQuests, noticesFor } from './data.js';
import { createWorldScene } from './world.js';
import { createVillageScene } from './village.js';

// The 2D game: walk around the world map, go into the villages the students
// wrote, and talk to the villagers. The game engine (Phaser) is a big file, so
// it is only fetched when a student opens this page.

let phaserPromise = null;
function loadPhaser() {
  if (window.Phaser) return Promise.resolve(window.Phaser);
  if (!phaserPromise) {
    phaserPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/phaser.min.js';
      script.onload = () => resolve(window.Phaser);
      script.onerror = () => {
        phaserPromise = null;
        reject(new Error('Could not load the game. Check the connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return phaserPromise;
}

// Which villages the student has been to and which villagers they have talked
// to. It lives in the saved progress, next to where the figure stood last.
function createProgress(state, save) {
  state.flags = state.flags || {};
  const play = (state.flags.play = state.flags.play || {});
  const visited = new Set(state.visited_tribes || []);
  const talked = new Set(play.talked || []);
  let timer = null;
  const progress = {
    visited,
    talked,
    visit(id) {
      if (visited.has(id)) return;
      visited.add(id);
      state.visited_tribes = [...visited];
      progress.save();
    },
    talk(id) {
      if (talked.has(id)) return;
      talked.add(id);
      play.talked = [...talked];
      progress.save();
    },
    setPosition(x, y) {
      play.x = Math.round(x);
      play.y = Math.round(y);
    },
    position() {
      return Number.isFinite(play.x) && Number.isFinite(play.y) ? { x: play.x, y: play.y } : null;
    },
    // 'open' (heard about it), 'found' (found the answer), 'done' (told the villager).
    quest(id) {
      return (play.quests || {})[id] || null;
    },
    setQuest(id, state) {
      play.quests = { ...(play.quests || {}), [id]: state };
      progress.save();
    },
    noticeSeen(key) {
      return (play.notices || []).includes(key);
    },
    markNotices(keys) {
      play.notices = [...new Set([...(play.notices || []), ...keys])].slice(-200);
      progress.save();
    },
    playingAs() {
      return play.as || null;
    },
    playAs(id) {
      play.as = id;
      progress.save();
    },
    save() {
      clearTimeout(timer);
      timer = setTimeout(() => save().catch(() => {}), 800);
    },
    flush() {
      clearTimeout(timer);
      return save().catch(() => {});
    },
  };
  return progress;
}

// Starts the game inside container and returns { stop }. Call stop when the
// student goes to another page, so the game does not keep running unseen.
export function startPlay(container, content, { state, save }) {
  let stopped = false;
  let game = null;
  let ui = null;
  let progress = null;

  const villages = mappedVillages(content);
  if (!villages.length) {
    container.innerHTML = `
      <div class="play-empty">
        <h2>Play</h2>
        <p>There are no villages on the map yet. When the teacher has approved the first villages, they appear here, and you can walk around and visit them.</p>
      </div>`;
    return { stop() {} };
  }

  // The page is narrow for forms; the game gets more room.
  const main = container.closest('main');
  main?.classList.add('wide');

  container.innerHTML = `
    <div class="play">
      <div class="play-wrap" id="play-wrap"><div id="play-canvas"><p class="muted play-loading">Loading the world…</p></div></div>
      <p class="muted play-help">Walk with the arrow keys or WASD, or tap where you want to go. You can swim across the sea and climb the mountains, but slowly. Walk onto a village to go inside. Press E to talk to a villager or read a sign. Walk down and out of a village to go back to the map.</p>
    </div>`;

  Promise.all([loadPhaser(), ensureFigures()])
    .then(([Phaser]) => {
      if (stopped) return;
      const wrap = container.querySelector('#play-wrap');
      ui = createUi(wrap);
      progress = createProgress(state, save);

      const ctx = { content, villages, ui, progress, mask: null, start: null };
      ctx.look = playerLook(content, progress.playingAs());
      // The poison of the evil villages: fetched when the world is shown and now and then.
      ctx.world = null;
      ctx.reloadWorld = async () => {
        try {
          ctx.world = await loadWorld();
        } catch {
          return;
        }
        ctx.onWorld?.();
        ctx.refreshHud();
        if (ctx.world.result === 'evil' && !ctx.warned) {
          ctx.warned = true;
          ui.openNote('The poison has won', 'The evil villages', 'The poison has covered the map. Your teacher will clean the world so you can try again.');
        }
      };
      // The villagers of a village meet in the village: where we stand, who is
      // there, and the village council.
      ctx.presence = {
        beat: (tribeId) => presenceBeat(tribeId).catch(() => {}),
        state: (tribeId) => presenceState(tribeId),
        start: (tribeId) => startCouncilSession(tribeId),
      };
      ctx.openCouncil = (tribe, closed) =>
        ui.openCouncil(tribe.name, (host) => renderCouncil(host, { lang: 'en', translation: false, tribeId: tribe.id, live: true }), closed);

      // The tasks that clean the poison where the figure stands.
      ctx.openTask = async (fx, fy) => {
        if (ui.isOpen()) return false;
        let quiz;
        try {
          quiz = await startTask();
        } catch {
          return false;
        }
        if (!quiz.ok) {
          ui.openNote('No tasks right now', 'The poison', quiz.reason || 'The teacher has switched the tasks off.');
          return false;
        }
        ui.openTask(quiz, (answers) => submitTask(quiz.token, answers, fx, fy), () => ctx.reloadWorld());
        return true;
      };

      // A solved problem cleans the ground around the villager's village.
      ctx.cleanse = async (tribeId) => {
        try {
          const r = await cleanseWorld(tribeId);
          await ctx.reloadWorld();
          return r.ok;
        } catch {
          return false;
        }
      };
      ctx.refreshHud = () => {
        ctx.look = playerLook(content, progress.playingAs());
        const own = ownVillagers(content);
        const picker =
          own.length > 1
            ? `<label class="play-as">Playing as <select id="play-as">${own
                .map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === ctx.look.key ? 'selected' : ''}>${escapeHtml(v.name)}</option>`)
                .join('')}</select></label>`
            : own.length
              ? `<span>Playing as <strong>${escapeHtml(own[0].name)}</strong></span>`
              : '<span>Make a villager to play as them</span>';
        const villageIds = new Set(villages.map((v) => v.tribe.id));
        const visited = [...progress.visited].filter((id) => villageIds.has(id)).length;
        const people = villages.flatMap((v) => villagersOf(content, v.tribe.id));
        const met = people.filter((c) => progress.talked.has(c.id)).length;
        const openQuests = ctx.questLog().length;
        const shieldOf = (ctx.world && ctx.world.shields) || {};
        const ownShield = (content.mine || []).length ? Math.max(...content.mine.map((id) => shieldOf[id] || 0)) : null;
        const poison = ctx.world && !ctx.world.paused ? `<span class="play-poison">Poison <strong>${ctx.world.percent}%</strong></span>${ownShield === null ? '' : `<span class="play-poison">Shield <strong>${ownShield}</strong></span>`}` : '';
        ui.setHud(`${picker}${poison}<button type="button" class="play-quests-btn" id="play-quests">Problems <strong>${openQuests}</strong></button><span>Villages visited <strong>${visited}/${villages.length}</strong></span><span>Villagers met <strong>${met}/${people.length}</strong></span>`);
      };

      wrap.querySelector('#play-hud').addEventListener('change', (e) => {
        if (e.target.id !== 'play-as') return;
        progress.playAs(e.target.value);
        ctx.refreshHud();
      });

      // The list of problems the player has heard about.
      ctx.questLog = () =>
        allQuests(content)
          .filter(({ villager }) => progress.quest(villager.id) === 'open' || progress.quest(villager.id) === 'found')
          .map(({ villager, quest, tribe }) => ({
            who: villager.name,
            where: tribe ? tribe.name : '',
            problem: quest.placeholder ? `(Placeholder) ${quest.problem}` : quest.problem,
            hint: quest.hint,
            status: progress.quest(villager.id) === 'found' ? `You found the answer. Go back to ${villager.name} and tell them.` : 'Not solved yet. Search other villages.',
          }));
      wrap.querySelector('#play-hud').addEventListener('click', (e) => {
        if (e.target.closest('#play-quests') && !ui.isOpen()) ui.openQuestLog(ctx.questLog());
      });

      const Boot = class extends Phaser.Scene {
        constructor() {
          super('Boot');
        }
        preload() {
          this.load.image('map', '/assets/images/lore/overview-map.jpg');
          this.load.spritesheet('town', '/assets/game/town.png', { frameWidth: 16, frameHeight: 16 });
          this.load.spritesheet('heroes', '/assets/game/heroes.png', { frameWidth: 16, frameHeight: 16 });
          this.load.spritesheet('figures', figureSheetUrl(), { frameWidth: 16, frameHeight: 16 });
        }
        create() {
          this.scene.start('World');
        }
      };

      // News from other villages: told once, the first time the player comes in after it.
      setTimeout(() => {
        if (stopped || ui.isOpen()) return;
        const fresh = noticesFor(content).filter((n) => !progress.noticeSeen(n.key));
        if (!fresh.length) return;
        progress.markNotices(fresh.map((n) => n.key));
        ui.openNote('News from other villages', 'The councils have decided', fresh.map((n) => n.text).join('\n'));
      }, 1800);

      container.querySelector('.play-loading')?.remove();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'play-canvas',
        width: 960,
        height: 600,
        backgroundColor: '#1b1712',
        pixelArt: true,
        roundPixels: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [Boot, createWorldScene(Phaser, ctx), createVillageScene(Phaser, ctx)],
      });
      // A handle for testing in a browser (the game is not reachable from outside otherwise).
      container.querySelector('#play-canvas').__game = game;
    })
    .catch((err) => {
      if (stopped) return;
      container.innerHTML = `<p class="error">${err.message}</p>`;
    });

  return {
    stop() {
      stopped = true;
      main?.classList.remove('wide');
      progress?.flush();
      ui?.destroy();
      game?.destroy(true);
      game = null;
    },
  };
}
