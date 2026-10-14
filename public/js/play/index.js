import { escapeHtml } from '../translate.js';
import { createUi } from './ui.js';
import { loadWorld, cleanseWorld, presenceBeat, presenceState, startCouncilSession, startTask, submitTask, battleList, battleDo, presenceWorld, presenceVillage, artifactList, loadCouncils, startCultureBattle, submitCultureBattle, chatGet, chatSay } from '../api.js';
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
    // The rank the student had last time they were told, so a rank-up is told once.
    lastRank() {
      return play.rank || null;
    },
    setLastRank(rank) {
      play.rank = rank;
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
  let claimTimer = null;
  const windowListeners = []; // [event name, function]: taken away again when the game stops
  const listen = (name, fn) => {
    window.addEventListener(name, fn);
    windowListeners.push([name, fn]);
  };

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
      <div class="play-wrap" id="play-wrap"><div id="play-canvas"><p class="muted play-loading">Loading the world…</p></div><button type="button" class="play-fs" id="play-fs" title="Fullscreen (F)" aria-label="Fullscreen" hidden>⛶</button></div>
      <p class="muted play-help">Walk with the arrow keys or WASD, or tap where you want to go. You can swim across the sea and climb the mountains, but slowly. Walk onto a village to go inside. Press E to talk to a villager or read a sign. Walk down and out of a village to go back to the map.</p>
    </div>`;

  // Fullscreen for the game (the whole play area, with the windows on top of it): the
  // button in the corner, or the F key. Not offered where the browser has no fullscreen.
  const playWrap = container.querySelector('#play-wrap');
  const fsButton = container.querySelector('#play-fs');
  const canFullscreen = Boolean(playWrap.requestFullscreen);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else playWrap.requestFullscreen().catch(() => {});
  };
  const onFullscreenKey = (e) => {
    if ((e.key !== 'f' && e.key !== 'F') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
    if (container.querySelector('#play-overlay') && !container.querySelector('#play-overlay').hidden) return;
    toggleFullscreen();
  };
  if (canFullscreen) {
    fsButton.hidden = false;
    fsButton.addEventListener('click', toggleFullscreen);
    document.addEventListener('keydown', onFullscreenKey);
  }

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
      // The council leader took land: show the new borders at once.
      listen('land-changed', () => ctx.reloadWorld?.());
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
        world: (fx, fy, look) => presenceWorld(fx, fy, look),
        village: (tribeId, fx, fy, look) => presenceVillage(tribeId, fx, fy, look),
      };
      ctx.openCouncil = (tribe, closed) =>
        ui.openCouncil(tribe.name, (host) => renderCouncil(host, { lang: 'en', translation: false, tribeId: tribe.id, live: true }), closed);

      // Glossary battles between students, and the XP they give.
      ctx.xp = null;
      ctx.refreshXp = async () => {
        try {
          const d = await battleList();
          ctx.xp = d.stats;
          ctx.refreshHud();
          // A rank-up is told once, when no window is open.
          const now = d.stats.rank.rank;
          const before = progress.lastRank();
          if (before === null) progress.setLastRank(now);
          else if (now > before && !ui.isOpen()) {
            progress.setLastRank(now);
            ui.openNote('Rank up!', 'The XP ladder', `You are now rank ${now}: ${d.stats.rank.name}. Open the backpack to see what has unlocked.`);
          } else if (now < before) progress.setLastRank(now);
          // The result of a battle you started, told once.
          if (d.unseen.length && !ui.isOpen()) {
            await battleDo({ action: 'seen' });
            ui.openNote(
              'Battle result',
              'Your word battle',
              d.unseen.map((r) => `${r.result === 'win' ? 'You won' : r.result === 'draw' ? 'A draw' : 'You lost'} against ${r.vs}: ${r.score}–${r.vs_score}.`).join('\n')
            );
          }
        } catch {
          // The battle is only an extra; the game goes on.
        }
      };
      ctx.openBattle = () => {
        if (ui.isOpen()) return;
        ui.openBattle(
          {
            list: battleList,
            start: () => battleDo({ action: 'challenge' }),
            accept: (id) => battleDo({ action: 'accept', id }),
            submit: (id, answers) => battleDo({ action: 'submit', id, answers }),
            cancel: (id) => battleDo({ action: 'cancel', id }),
            seen: () => battleDo({ action: 'seen' }),
          },
          () => ctx.refreshXp(),
          () => ctx.refreshXp()
        );
      };
      ctx.refreshXp();

      // The backpack: the rank on the XP ladder, and the artifacts the students drew.
      ctx.openBackpack = async () => {
        if (ui.isOpen()) return;
        try {
          ui.openBackpack(await artifactList());
        } catch {
          ui.openNote('Backpack', 'Something went wrong', 'Could not open the backpack. Try again.');
        }
      };

      // Students on the map challenge each other: both get the same words at once.
      const battleApi = {
        list: battleList,
        start: () => battleDo({ action: 'challenge' }),
        accept: (id) => battleDo({ action: 'accept', id }),
        submit: (id, answers) => battleDo({ action: 'submit', id, answers }),
        cancel: (id) => battleDo({ action: 'cancel', id }),
        seen: () => battleDo({ action: 'seen' }),
      };
      // Talk to a student on the map with ready-made sentences. Opening it also answers
      // a sentence somebody said to this student.
      ctx.talkTo = (other) => {
        if (ui.isOpen()) return;
        ui.openChat(
          other,
          { get: () => chatGet(other.pid), say: (phrase) => chatSay(other.pid, phrase) },
          () => {
            ui.close();
            ctx.challengePlayer(other.pid);
          }
        );
      };
      // Solving a problem gives XP, once for each problem (the server keeps count).
      ctx.questSolved = (id) => {
        battleDo({ action: 'quest-done', id })
          .then(() => ctx.refreshXp())
          .catch(() => {});
      };
      ctx.challengePlayer = (pid) => {
        if (ui.isOpen()) return;
        ui.openBattle(battleApi, () => ctx.refreshXp(), () => ctx.refreshXp(), battleDo({ action: 'challenge-player', pid }));
      };
      const shownInvites = new Set();
      ctx.showInvite = (invite) => {
        if (ui.isOpen() || shownInvites.has(invite.id)) return;
        shownInvites.add(invite.id);
        ui.openInvite(
          invite,
          () => {
            ui.close();
            ui.openBattle(battleApi, () => ctx.refreshXp(), () => ctx.refreshXp(), battleDo({ action: 'accept', id: invite.id }));
          },
          async () => {
            await battleDo({ action: 'decline', id: invite.id }).catch(() => {});
            ui.close();
          }
        );
      };

      // The culture battle between two villages over land: the same kind of tasks, kept as
      // a score for the student's village.
      listen('culture-battle', async (e) => {
        const claimId = e.detail && e.detail.claimId;
        if (!claimId) return;
        ui.close();
        let quiz;
        try {
          quiz = await startCultureBattle(claimId);
        } catch (err) {
          ui.openNote('Culture battle', 'Not now', err.message || 'Could not start.');
          return;
        }
        if (!quiz.ok) {
          ui.openNote('Culture battle', 'Not now', quiz.error || 'Could not start.');
          return;
        }
        ui.openTask(quiz, (answers) => submitCultureBattle(claimId, quiz.token, answers), null, {
          title: 'Culture battle',
          intro: 'Answer the questions. You can only do this once, and your score counts for your village.',
          result: (r) => (r.ok ? `${r.correct} of ${r.total} right. Your score is kept for your village.` : r.error || 'Something went wrong.'),
        });
      });

      // News about land claims, told once: somebody asks for the land of the village, the
      // culture battle begins, and how it ended. Looked for every minute.
      const claimNews = async () => {
        if (stopped || ui.isOpen()) return;
        try {
          const d = await loadCouncils();
          for (const c of d.land_claims || []) {
            const key = `land:${c.id}:${c.status}`;
            if (progress.noticeSeen(key) || !c.my_side) continue;
            let text = '';
            if (c.status === 'awaiting' && c.my_side === 'target') text = `${c.claimant_name} asks for ${c.squares} squares of the land of ${c.target_name}. The council leader can answer in the council.`;
            else if (c.status === 'battle') text = `Culture battle: ${c.claimant_name} against ${c.target_name} for ${c.squares} squares of land. Open the village council and take part.`;
            else if (c.status === 'transferred') text = `${c.claimant_name} got ${c.squares} squares of land from ${c.target_name}.`;
            else if (c.status === 'kept') text = `${c.target_name} kept its land. ${c.claimant_name} got nothing.`;
            if (!text) continue;
            progress.markNotices([key]);
            ui.openNote('Land', 'News about land', text);
            return;
          }
        } catch {
          // The news is only an extra.
        }
      };
      claimTimer = setInterval(claimNews, 60000);
      setTimeout(claimNews, 4000);

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
        const xpPart = ctx.xp ? `<span>XP <strong>${ctx.xp.xp}</strong> · Rank <strong>${ctx.xp.rank.rank}</strong></span>` : '';
        ui.setHud(`${picker}${poison}${xpPart}<button type="button" class="play-quests-btn" id="play-battle">Battle</button><button type="button" class="play-quests-btn" id="play-backpack">Backpack</button><button type="button" class="play-quests-btn" id="play-quests">Problems <strong>${openQuests}</strong></button><span>Villages visited <strong>${visited}/${villages.length}</strong></span><span>Villagers met <strong>${met}/${people.length}</strong></span>`);
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
            problem: quest.problem,
            hint: [quest.hint, quest.kind === 'find' ? ((ctx.questSpots && ctx.questSpots[villager.id]) || {}).hint : ''].filter(Boolean).join(' '),
            status:
              progress.quest(villager.id) === 'found'
                ? `You have what you need. Go back to ${villager.name}.`
                : quest.kind === 'talk'
                  ? `Go and talk to ${quest.target.villagerName} in ${quest.target.villageName}.`
                  : quest.kind === 'find'
                    ? 'Look for it out on the map.'
                    : 'Not solved yet. Search other villages.',
          }));
      wrap.querySelector('#play-hud').addEventListener('click', (e) => {
        if (e.target.closest('#play-quests') && !ui.isOpen()) ui.openQuestLog(ctx.questLog());
        if (e.target.closest('#play-battle')) ctx.openBattle();
        if (e.target.closest('#play-backpack')) ctx.openBackpack();
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
          // The game starts inside the student's own village, where the others of the
          // village can be met. Everybody else starts on the map.
          const own = playerLook(content, progress.playingAs()).villager;
          const homeId = (own && own.tribe_id) || (content.mine || [])[0];
          if (homeId && villages.some((v) => v.tribe.id === homeId)) {
            ctx.mapImage = this.textures.get('map').getSourceImage();
            this.scene.start('Village', { tribeId: homeId });
          } else {
            this.scene.start('World');
          }
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
      clearInterval(claimTimer);
      for (const [name, fn] of windowListeners) window.removeEventListener(name, fn);
      document.removeEventListener('keydown', onFullscreenKey);
      if (document.fullscreenElement) document.exitFullscreen?.();
      main?.classList.remove('wide');
      progress?.flush();
      ui?.destroy();
      game?.destroy(true);
      game = null;
    },
  };
}
