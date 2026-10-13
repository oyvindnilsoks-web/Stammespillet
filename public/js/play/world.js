import { buildMask, connectVillages, terrainAt, MASK_COLS, MASK_ROWS } from './mask.js';
import { shieldOf, isEnemy, villagersOf, PLAYER_FRAME, allQuests, mulberry32, hashString } from './data.js';
import { mediaUrl } from '../content.js';

// The world map: the painted map is the ground, a small figure walks on it,
// and every village the students placed on the map has a sign. Walking into a
// sign goes inside the village (see village.js).

const MAP_W = 1400; // size of the picture of the map
const MAP_H = 1059;
export const WORLD_SCALE = 2;
const SPEED = 300; // pixels per second on land
const SWIM_SPEED = 190;
const CLIMB_SPEED = 150;
const ENTER_DISTANCE = 56;
const SIGN_SCALE = 3;

export function createWorldScene(Phaser, ctx) {
  return class WorldScene extends Phaser.Scene {
    constructor() {
      super('World');
    }

    init(data) {
      this.arrival = data || {};
    }

    create() {
      const W = MAP_W * WORLD_SCALE;
      const H = MAP_H * WORLD_SCALE;
      this.worldW = W;
      this.worldH = H;
      this.add.image(0, 0, 'map').setOrigin(0, 0).setScale(WORLD_SCALE);

      // Where can the figure walk? Decided once, from the colours of the map.
      if (!ctx.mask) {
        const mask = buildMask(this.textures.get('map').getSourceImage());
        ctx.start = connectVillages(mask, { x: 0.56, y: 0.49 }, ctx.villages.map((v) => ({ x: v.fx, y: v.fy })));
        ctx.mask = mask;
      }
      this.mask = ctx.mask;
      ctx.mapImage = this.textures.get('map').getSourceImage();

      // A sign and a name for every village.
      this.signs = ctx.villages.map((v) => {
        const x = v.fx * W;
        const y = v.fy * H;
        this.add.ellipse(x, y + 2, 34, 12, 0x000000, 0.3).setDepth(2);
        const post = this.add.image(x, y, 'town', 83).setOrigin(0.5, 1).setScale(SIGN_SCALE).setDepth(3);
        if (v.tribe.charter_type === 'shadow') post.setTint(0x8a5a6a);
        const label = this.add
          .text(x, y + 8, v.tribe.name, { fontFamily: 'Georgia, serif', fontSize: '17px', color: v.tribe.charter_type === 'shadow' ? '#e8a0a0' : '#f2e9da', stroke: '#1b1712', strokeThickness: 5 })
          .setOrigin(0.5, 0)
          .setDepth(4);
        const tick = this.add
          .text(x, y - 62, '✓', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#9fd09f', stroke: '#1b1712', strokeThickness: 4 })
          .setOrigin(0.5, 1)
          .setDepth(4)
          .setVisible(ctx.progress.visited.has(v.tribe.id));
        return { village: v, x, y, label, tick };
      });

      this.initPoison(W, H);
      this.initQuestItems();
      this.startPeople();

      // The shield of a village, when the teacher has added one, above its sign.
      const shields = this.signs
        .map((sign) => ({ sign, media: shieldOf(ctx.content, sign.village.tribe.id) }))
        .filter((s) => s.media);
      if (shields.length) {
        this.load.crossOrigin = 'anonymous';
        for (const { sign, media } of shields) {
          const key = 'shield_' + sign.village.tribe.id;
          if (!this.textures.exists(key)) this.load.image(key, mediaUrl(media.storage_path));
        }
        this.load.once('complete', () => {
          for (const { sign } of shields) {
            const key = 'shield_' + sign.village.tribe.id;
            if (!this.textures.exists(key)) continue;
            const image = this.add.image(sign.x, sign.y - 118, key).setDepth(4);
            image.setScale(60 / Math.max(image.width, image.height));
            sign.tick.setY(sign.y - 150);
          }
        });
        this.load.start();
      }

      // The figure: starts where it stopped last time, or in the middle of the map.
      let sx = (ctx.start.x + 0.5) * (W / this.mask.cols);
      let sy = (ctx.start.y + 0.5) * (H / this.mask.rows);
      const saved = ctx.progress.position();
      if (saved && this.walkable(saved.x, saved.y)) {
        sx = saved.x;
        sy = saved.y;
      }
      // Never go straight into a village on arrival: a short pause first, and a
      // start that is on top of a sign is moved a little south of it.
      this.cooldownUntil = this.time.now + 1200;
      const onASign = this.signs.find((s) => Phaser.Math.Distance.Between(sx, sy, s.x, s.y) < ENTER_DISTANCE + 70);
      if (onASign && this.walkable(onASign.x, onASign.y + 84)) {
        sx = onASign.x;
        sy = onASign.y + 84;
      }
      if (this.arrival.from) {
        const sign = this.signs.find((s) => s.village.tribe.id === this.arrival.from);
        if (sign) {
          sx = sign.x;
          sy = sign.y + 84;
          this.cooldownUntil = this.time.now + 1500;
        }
      }
      this.shadow = this.add.ellipse(sx, sy, 28, 10, 0x000000, 0.35).setDepth(5);
      this.player = this.add.sprite(sx, sy, ctx.look.texture, ctx.look.frame).setOrigin(0.5, 1).setScale(3).setDepth(6);
      this.lookKey = ctx.look.key;
      // Rings on the water around the swimming figure.
      this.rings = [0, 1].map(() => this.add.ellipse(sx, sy, 40, 40, 0xdff2f5, 0).setStrokeStyle(3, 0xe8f6f8).setDepth(5.5).setVisible(false));
      this.wasSwimming = false;

      this.cameras.main.setBounds(0, 0, W, H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setRoundPixels(true);

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
      // While a window is open the keys are for the window: no walking, no
      // blocked space bar, while someone types an answer.
      const lockKeys = (open) => {
        const kb = this.input.keyboard;
        if (!kb) return;
        kb.enabled = !open;
        if (open) {
          kb.resetKeys();
          kb.disableGlobalCapture?.();
        } else {
          kb.enableGlobalCapture?.();
        }
      };
      lockKeys(ctx.ui.isOpen());
      const stopLocking = ctx.ui.onToggle(lockKeys);
      this.events.once('shutdown', () => {
        stopLocking();
        const kb = this.input.keyboard;
        if (kb) {
          kb.enabled = true;
          kb.enableGlobalCapture?.();
        }
      });
      this.onTaskKey = (e) => {
        if ((e.key === 'e' || e.key === 'E') && !e.repeat && !ctx.ui.isOpen()) this.startTask();
        if ((e.key === 'b' || e.key === 'B') && !e.repeat && !ctx.ui.isOpen()) this.challenge(this.nearestOther());
      };
      document.addEventListener('keydown', this.onTaskKey);
      this.events.once('shutdown', () => document.removeEventListener('keydown', this.onTaskKey));
      this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
      this.target = null;
      this.input.on('pointerdown', (pointer) => {
        if (ctx.ui.isOpen()) return;
        this.target = { x: pointer.worldX, y: pointer.worldY };
      });

      this.saveTimer = this.time.addEvent({
        delay: 4000,
        loop: true,
        callback: () => {
          ctx.progress.setPosition(this.player.x, this.player.y);
          ctx.progress.save();
        },
      });
      ctx.refreshHud();
    }

    // The poison of the evil villages, drawn over the map. It is fetched from the
    // server now and then; the figure is slowed down and turns green in it.
    initPoison(W, H) {
      this.poison = null; // Uint8Array, one byte per cell
      const texture = this.textures.exists('poison') ? this.textures.get('poison') : this.textures.createCanvas('poison', MASK_COLS, MASK_ROWS);
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // soft edges, not blocks
      this.poisonImage = this.add.image(0, 0, 'poison').setOrigin(0, 0).setDisplaySize(W, H).setDepth(1.5).setVisible(false);
      this.tweens.add({ targets: this.poisonImage, alpha: { from: 0.55, to: 0.8 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const draw = () => {
        const world = ctx.world;
        if (!world || !world.poison) {
          this.poison = null;
          this.poisonImage.setVisible(false);
          return;
        }
        const bytes = Uint8Array.from(atob(world.poison), (c) => c.charCodeAt(0));
        if (bytes.length !== MASK_COLS * MASK_ROWS) return;
        this.poison = bytes;
        const canvas = this.textures.get('poison').getSourceImage();
        const g = canvas.getContext('2d');
        const image = g.createImageData(MASK_COLS, MASK_ROWS);
        for (let i = 0; i < bytes.length; i++) {
          const level = bytes[i];
          image.data[i * 4] = 110 - level * 0.2; // purple at the edge, toxic green where it is thick
          image.data[i * 4 + 1] = 30 + level * 0.55;
          image.data[i * 4 + 2] = 150 - level * 0.4;
          image.data[i * 4 + 3] = level ? 70 + level * 0.35 : 0;
        }
        g.putImageData(image, 0, 0);
        this.textures.get('poison').refresh();
        this.poisonImage.setVisible(true);
      };
      // A ring round every good village: blue while it has shield and keeps the
      // poison away, red when it has none. The students see who is in danger.
      this.shieldRings = this.add.graphics().setDepth(1.6);
      this.tweens.add({ targets: this.shieldRings, alpha: { from: 0.55, to: 1 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const drawRings = () => {
        this.shieldRings.clear();
        const shields = (ctx.world && ctx.world.shields) || {};
        const radius = (W / MASK_COLS) * 6;
        for (const sign of this.signs) {
          if (sign.village.tribe.charter_type === 'shadow') continue;
          const safe = (shields[sign.village.tribe.id] || 0) > 0;
          this.shieldRings.lineStyle(4, safe ? 0x9fd8ff : 0xff6a6a, safe ? 0.8 : 0.5);
          this.shieldRings.strokeCircle(sign.x, sign.y, radius);
        }
      };
      ctx.onWorld = () => {
        draw();
        drawRings();
      };
      draw();
      drawRings();
      ctx.reloadWorld?.();
      this.poisonTimer = this.time.addEvent({ delay: 60000, loop: true, callback: () => ctx.reloadWorld?.() });
      this.events.once('shutdown', () => {
        ctx.onWorld = null;
      });
    }

    // Where a thing a villager has lost lies on the map. It is decided from the
    // villager, so it is the same for every player: on ground that can be walked on, away
    // from the villages. The hint says which village it is near and which way to go.
    spotFor(villager, taken) {
      const rand = mulberry32(hashString(villager.id + ':spot'));
      let spot = null;
      for (let n = 0; n < 600 && !spot; n++) {
        const x = (0.08 + 0.84 * rand()) * this.worldW;
        const y = (0.1 + 0.8 * rand()) * this.worldH;
        if (this.terrain(x, y) !== 'land') continue;
        if (this.signs.some((s) => Phaser.Math.Distance.Between(x, y, s.x, s.y) < 170)) continue;
        if (taken.some((t) => Phaser.Math.Distance.Between(x, y, t.x, t.y) < 120)) continue;
        spot = { x, y };
      }
      if (!spot) return null;
      let near = this.signs[0];
      for (const s of this.signs) {
        if (Phaser.Math.Distance.Between(spot.x, spot.y, s.x, s.y) < Phaser.Math.Distance.Between(spot.x, spot.y, near.x, near.y)) near = s;
      }
      const dx = spot.x - near.x;
      const dy = spot.y - near.y;
      const dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
      const dir = dirs[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      const name = near.village.tribe.name;
      spot.hint = Math.hypot(dx, dy) < 360 ? `Look close to ${name}, a little to the ${dir}.` : `Look a long way ${dir} of ${name}.`;
      return spot;
    }

    initQuestItems() {
      this.questItems = new Map();
      ctx.questSpots = ctx.questSpots || {};
      const taken = [];
      for (const { villager, quest } of allQuests(ctx.content)) {
        if (quest.kind !== 'find') continue;
        if (!ctx.questSpots[villager.id]) ctx.questSpots[villager.id] = this.spotFor(villager, taken);
        if (ctx.questSpots[villager.id]) taken.push(ctx.questSpots[villager.id]);
      }
      this.syncQuestItems();
    }

    // The things to find: one for every problem the player has heard about and not
    // yet solved. A thing disappears when it is picked up.
    syncQuestItems() {
      const open = new Map();
      for (const { villager, quest } of allQuests(ctx.content)) {
        const spot = ctx.questSpots && ctx.questSpots[villager.id];
        if (quest.kind === 'find' && spot && ctx.progress.quest(villager.id) === 'open') open.set(villager.id, { villager, quest, spot });
      }
      for (const [id, item] of this.questItems) {
        if (open.has(id)) continue;
        item.parts.forEach((part) => part.destroy());
        this.questItems.delete(id);
      }
      for (const [id, { villager, quest, spot }] of open) {
        if (this.questItems.has(id)) continue;
        const glow = this.add.ellipse(spot.x, spot.y + 4, 52, 22, 0xffe28a, 0.5).setDepth(2);
        const star = this.add
          .text(spot.x, spot.y - 6, '✦', { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe28a', stroke: '#1b1712', strokeThickness: 5 })
          .setOrigin(0.5, 1)
          .setDepth(4);
        const label = this.add
          .text(spot.x, spot.y - 42, quest.item.name, { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 4 })
          .setOrigin(0.5, 1)
          .setDepth(8)
          .setAlpha(0);
        this.tweens.add({ targets: [glow, star], alpha: { from: 0.35, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.questItems.set(id, { parts: [glow, star, label], label, spot, villager, quest });
      }
    }

    // Walking up to a thing picks it up.
    checkQuestItems() {
      for (const [id, item] of this.questItems) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.spot.x, item.spot.y);
        item.label.setAlpha(d < 300 ? 1 : 0);
        if (d < 46) {
          this.pickUp(id);
          return;
        }
      }
    }

    pickUp(id) {
      const item = this.questItems.get(id);
      if (!item) return;
      ctx.progress.setQuest(id, 'found');
      ctx.refreshHud();
      this.syncQuestItems();
      ctx.ui.openNote(`You found ${item.quest.item.name}`, `For ${item.villager.name}`, `${item.quest.found}\n\nNow take it back to ${item.villager.name}.`);
    }

    // The other students on the map: told where they are every few seconds, and
    // drawn walking towards that place. Walk up to one to challenge them.
    startPeople() {
      this.others = new Map();
      let busy = false;
      const poll = async () => {
        if (busy || !ctx.presence || !ctx.presence.world || !this.player) return;
        busy = true;
        try {
          const look = ctx.look.texture === 'figures' ? ctx.look.frame : null;
          const r = await ctx.presence.world(this.player.x / this.worldW, this.player.y / this.worldH, look);
          this.syncOthers(r.players || []);
          if (r.invite) ctx.showInvite?.(r.invite);
          if (r.unseen > 0 && !ctx.ui.isOpen()) ctx.refreshXp?.();
        } catch {
          // The others are only an extra; the game goes on without them.
        } finally {
          busy = false;
        }
      };
      poll();
      const timer = setInterval(poll, 2500);
      this.events.once('shutdown', () => {
        clearInterval(timer);
        for (const o of this.others.values()) {
          o.sprite.destroy();
          o.label.destroy();
        }
        this.others.clear();
      });
    }

    syncOthers(list) {
      const seen = new Set();
      for (const p of list) {
        seen.add(p.pid);
        const x = p.fx * this.worldW;
        const y = p.fy * this.worldH;
        let o = this.others.get(p.pid);
        if (!o) {
          const frame = Number.isInteger(p.look) ? p.look : PLAYER_FRAME;
          const sprite = this.add.sprite(x, y, Number.isInteger(p.look) ? 'figures' : 'heroes', frame).setOrigin(0.5, 1).setScale(3).setDepth(5.9);
          const label = this.add
            .text(x, y - 56, p.name, { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 4 })
            .setOrigin(0.5, 1)
            .setDepth(8);
          o = { pid: p.pid, name: p.name, sprite, label, x, y };
          this.others.set(p.pid, o);
        }
        o.name = p.name;
        o.tx = x;
        o.ty = y;
      }
      for (const [pid, o] of this.others) {
        if (seen.has(pid)) continue;
        o.sprite.destroy();
        o.label.destroy();
        this.others.delete(pid);
      }
    }

    // The student closest to the figure, if close enough to talk to.
    nearestOther() {
      let best = null;
      let bestDistance = 150;
      for (const o of this.others.values()) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, o.sprite.x, o.sprite.y);
        if (d < bestDistance) {
          bestDistance = d;
          best = o;
        }
      }
      return best;
    }

    challenge(other) {
      if (!other || ctx.ui.isOpen()) return;
      ctx.challengePlayer?.(other.pid);
    }

    // Open the tasks for the spot where the figure stands.
    startTask() {
      if (this.poisonAt(this.player.x, this.player.y) < 100) return;
      ctx.openTask(this.player.x / this.worldW, this.player.y / this.worldH);
    }

    // How much poison is under a spot of the world: 0 to 255.
    poisonAt(x, y) {
      if (!this.poison) return 0;
      const cx = Math.floor((x / this.worldW) * MASK_COLS);
      const cy = Math.floor((y / this.worldH) * MASK_ROWS);
      return cx < 0 || cy < 0 || cx >= MASK_COLS || cy >= MASK_ROWS ? 0 : this.poison[cy * MASK_COLS + cx];
    }

    // 'land', 'sea', 'mountain' or 'frame' under a spot of the world.
    terrain(x, y) {
      return terrainAt(this.mask, Math.floor((x / this.worldW) * this.mask.cols), Math.floor((y / this.worldH) * this.mask.rows));
    }

    // Anywhere but the edge of the map: the sea can be swum and the mountains climbed.
    walkable(x, y) {
      return this.terrain(x, y) !== 'frame';
    }

    // Swimming: only the head and shoulders above the water, arms working, rings
    // spreading. Climbing: leaning in, pulling up hand over hand. On land: a hop.
    animate(time, moving, where) {
      const p = this.player;
      const swimming = where === 'sea';
      const climbing = where === 'mountain';
      if (swimming !== this.wasSwimming) {
        if (swimming) p.setCrop(0, 0, 16, 10);
        else p.setCrop();
        this.wasSwimming = swimming;
      }
      this.shadow.setVisible(!swimming);
      for (const ring of this.rings) ring.setVisible(swimming);
      p.setScale(3, 3);

      if (swimming) {
        const t = time / 260;
        p.setAngle(Math.sin(t) * 7);
        this.rings.forEach((ring, i) => {
          const phase = ((time / 900 + i / this.rings.length) % 1);
          ring.setPosition(p.x, p.y - 2);
          ring.setScale(0.7 + phase * 1.1, (0.7 + phase * 1.1) * 0.4);
          ring.setAlpha(0.55 * (1 - phase));
        });
      } else if (climbing) {
        if (moving) {
          const t = time / 210;
          p.setAngle(Math.sin(t) * 9 + (p.flipX ? 5 : -5)); // leaning into the slope, left and right as the hands change
          p.setScale(3 + Math.sin(t) * 0.15, 3 - Math.sin(t + 1) * 0.18); // stretching up, pulling in
        } else {
          p.setAngle(p.flipX ? 5 : -5);
        }
      } else if (moving) {
        p.setAngle(Math.sin(time / 70) * 4);
      } else {
        p.setAngle(0);
      }
    }

    update(time, delta) {
      if (ctx.look.key !== this.lookKey) {
        this.player.setTexture(ctx.look.texture, ctx.look.frame);
        this.lookKey = ctx.look.key;
      }
      const dt = Math.min(delta, 50) / 1000;
      const p = this.player;
      const k = this.keys;
      let vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
      let vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);

      if (vx || vy) {
        this.target = null;
      } else if (this.target) {
        const dx = this.target.x - p.x;
        const dy = this.target.y - p.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 8) this.target = null;
        else {
          vx = dx / distance;
          vy = dy / distance;
        }
      }

      const where = this.terrain(p.x, p.y);
      if (vx || vy) {
        const length = Math.hypot(vx, vy) || 1;
        const poisoned = this.poisonAt(p.x, p.y) >= 100;
        const step = (where === 'sea' ? SWIM_SPEED : where === 'mountain' ? CLIMB_SPEED : SPEED) * dt * (poisoned ? 0.7 : 1);
        const nx = p.x + (vx / length) * step;
        const ny = p.y + (vy / length) * step;
        const before = { x: p.x, y: p.y };
        // Each direction on its own, so the figure slides along a coast.
        if (this.walkable(nx, p.y)) p.x = nx;
        if (this.walkable(p.x, ny)) p.y = ny;
        if (vx) p.setFlipX(vx < 0);
        // Walking toward a spot it cannot reach: give up after a moment.
        if (this.target && Math.hypot(p.x - before.x, p.y - before.y) < step * 0.2) {
          this.stuck = (this.stuck || 0) + dt;
          if (this.stuck > 0.35) this.target = null;
        } else {
          this.stuck = 0;
        }
      }
      this.shadow.setPosition(p.x, p.y);
      const inPoison = this.poisonAt(p.x, p.y) >= 100;
      if (inPoison) p.setTint(0x9fe08a);
      else p.clearTint();
      // Standing in poison: a button to clean it by solving tasks.
      for (const o of this.others.values()) {
        o.sprite.x += ((o.tx ?? o.sprite.x) - o.sprite.x) * 0.12;
        o.sprite.y += ((o.ty ?? o.sprite.y) - o.sprite.y) * 0.12;
        o.label.setPosition(o.sprite.x, o.sprite.y - 56);
      }
      const near = this.nearestOther();
      const open = ctx.ui.isOpen();
      if (near && !open) ctx.ui.setPrompt(`Challenge ${near.name} to a word battle (B or click here)`, () => this.challenge(near));
      else ctx.ui.setPrompt(inPoison && !open ? 'You are standing in poison. Press E or click here to clean it with tasks.' : null, () => this.startTask());
      if (!open) this.checkQuestItems();
      this.animate(time, Boolean(vx || vy), this.terrain(p.x, p.y));

      if (time > this.cooldownUntil && !ctx.ui.isOpen()) {
        for (const sign of this.signs) {
          if (Phaser.Math.Distance.Between(p.x, p.y, sign.x, sign.y) < ENTER_DISTANCE) {
            this.ask(sign);
            return;
          }
        }
      }
    }

    // A window about the village. Going in is the player's choice, and not
    // possible for a village the player's own village is at war with.
    ask(sign) {
      const tribe = sign.village.tribe;
      const shield = shieldOf(ctx.content, tribe.id);
      const charter = tribe.charter || {};
      const summary = (tribe.charter_type === 'shadow' && charter.ambition) || charter.main_resource || charter.place || tribe.resource || '';
      const enemy = isEnemy(ctx.content, tribe);
      this.target = null;
      const back = () => {
        // Step away from the sign so the window does not open again at once.
        const spot = this.walkable(sign.x, sign.y + 110) ? { x: sign.x, y: sign.y + 110 } : { x: this.player.x, y: this.player.y };
        this.player.setPosition(spot.x, spot.y);
        this.cooldownUntil = this.time.now + 1500;
      };
      ctx.ui.openVillageGate(
        tribe,
        shield ? mediaUrl(shield.storage_path) : null,
        summary,
        villagersOf(ctx.content, tribe.id).length,
        enemy,
        () => this.enter(sign),
        back
      );
    }

    enter(sign) {
      ctx.progress.visit(sign.village.tribe.id);
      ctx.progress.setPosition(sign.x, sign.y + 84);
      ctx.progress.save();
      sign.tick.setVisible(true);
      this.saveTimer?.remove();
      this.scene.start('Village', { tribeId: sign.village.tribe.id });
    }
  };
}
