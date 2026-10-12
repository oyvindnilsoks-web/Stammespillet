import { createUi } from './ui.js';
import { mappedVillages, villagersOf } from './data.js';
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
      <p class="muted play-help">Walk with the arrow keys or WASD, or tap where you want to go. Walk into a village sign to go inside. Press E to talk to a villager or read a sign. Walk down and out of a village to go back to the map.</p>
    </div>`;

  loadPhaser()
    .then((Phaser) => {
      if (stopped) return;
      const wrap = container.querySelector('#play-wrap');
      ui = createUi(wrap);
      progress = createProgress(state, save);

      const ctx = { content, villages, ui, progress, mask: null, start: null };
      ctx.refreshHud = () => {
        const villageIds = new Set(villages.map((v) => v.tribe.id));
        const visited = [...progress.visited].filter((id) => villageIds.has(id)).length;
        const people = villages.flatMap((v) => villagersOf(content, v.tribe.id));
        const met = people.filter((c) => progress.talked.has(c.id)).length;
        ui.setHud(`<span>Villages visited <strong>${visited}/${villages.length}</strong></span><span>Villagers met <strong>${met}/${people.length}</strong></span>`);
      };

      const Boot = class extends Phaser.Scene {
        constructor() {
          super('Boot');
        }
        preload() {
          this.load.image('map', '/assets/images/lore/overview-map.jpg');
          this.load.spritesheet('town', '/assets/game/town.png', { frameWidth: 16, frameHeight: 16 });
          this.load.spritesheet('heroes', '/assets/game/heroes.png', { frameWidth: 16, frameHeight: 16 });
        }
        create() {
          this.scene.start('World');
        }
      };

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
