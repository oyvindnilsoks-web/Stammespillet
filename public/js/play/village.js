import { PLAYER_FRAME, figureFor, portraitOf, hashString, mulberry32, villagersOf, mediaOfTribe } from './data.js';
import { mediaUrl } from '../content.js';

// Inside a village: a little drawn village with houses, trees and a square.
// The sign in the middle tells about the village, and the villagers the
// students wrote stand around it. Walk off the bottom edge to leave.

const TILE = 16;
const SCALE = 3;
const T = TILE * SCALE; // a tile on the screen
const COLS = 22;
const ROWS = 15;
const SPEED = 230;
const TALK_DISTANCE = 84;

// Tile numbers in the "town" sheet (12 per row, Kenney Tiny Town).
const GRASS = [0, 0, 0, 0, 1, 2];
const DIRT = [39, 40, 41, 42];
// Whole trees (tile 4 is only an outline): pointed, round, bush, orange.
const TREES = [28, 28, 28, 16, 5, 27];
const ROOF_TOP = { red: [52, 53, 54], grey: [48, 49, 50] };
const ROOF_LOW = { red: [64, 65, 66], grey: [60, 61, 62] };
const WALL = [84, 85, 84];
const SIGN = 83;

// Where the houses go (top left tile, 3 x 3 tiles each).
const HOUSES = [
  { x: 1, y: 1 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 1 },
  { x: 1, y: 5 }, { x: 18, y: 5 },
  { x: 2, y: 10 }, { x: 17, y: 10 },
];

// Where the villagers stand: around the square.
const SLOTS = [
  [8, 6], [13, 6], [8, 8], [13, 8], [9, 9], [12, 9], [7, 7], [14, 7], [10, 8], [11, 8],
  [6, 9], [15, 9], [9, 5], [12, 5], [5, 7], [16, 7],
];

export function createVillageScene(Phaser, ctx) {
  return class VillageScene extends Phaser.Scene {
    constructor() {
      super('Village');
    }

    init(data) {
      this.tribe = ctx.content.tribes.get(data.tribeId);
    }

    create() {
      const tribe = this.tribe;
      const rand = mulberry32(hashString(tribe.id));
      const W = COLS * T;
      const H = ROWS * T;
      this.worldW = W;
      this.worldH = H;
      this.blocks = []; // places the figure cannot walk: { x, y, w, h } in pixels
      this.interactives = [];
      const used = new Set();
      const mark = (tx, ty, w = 1, h = 1) => {
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) used.add(`${tx + dx},${ty + dy}`);
      };
      const tile = (frame, tx, ty, depth = 0) =>
        this.add.image(tx * T + T / 2, ty * T + T / 2, 'town', frame).setScale(SCALE).setDepth(depth);

      this.cameras.main.setBackgroundColor('#3f6b35');

      // Ground: grass, with a dirt square in the middle and a path down to the exit.
      const isSquare = (x, y) => x >= 7 && x <= 14 && y >= 5 && y <= 9;
      const isPath = (x, y) => x >= 10 && x <= 11 && y >= 10;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const dirt = isSquare(x, y) || isPath(x, y);
          tile(dirt ? DIRT[Math.floor(rand() * DIRT.length)] : GRASS[Math.floor(rand() * GRASS.length)], x, y, 0);
        }
      }

      // Houses.
      HOUSES.forEach((h, i) => {
        const colour = (hashString(tribe.id) + i) % 3 === 0 ? 'grey' : 'red';
        for (let c = 0; c < 3; c++) {
          tile(ROOF_TOP[colour][c], h.x + c, h.y, 2);
          tile(ROOF_LOW[colour][c], h.x + c, h.y + 1, 2);
          tile(WALL[c], h.x + c, h.y + 2, 2);
        }
        this.blocks.push({ x: h.x * T, y: h.y * T + T * 0.6, w: 3 * T, h: 2.4 * T });
        mark(h.x, h.y, 3, 3);
      });

      // The sign in the middle: it is what the students wrote about the village.
      const signTile = { x: 10, y: 6 };
      const sign = tile(SIGN, signTile.x, signTile.y, 3);
      sign.x += T / 2;
      sign.setScale(SCALE * 1.15);
      const signX = signTile.x * T + T;
      const signY = signTile.y * T + T;
      this.blocks.push({ x: signX - T * 0.45, y: signY - T * 0.75, w: T * 0.9, h: T * 0.6 });
      this.interactives.push({
        kind: 'board',
        x: signX,
        y: signY + 6,
        hint: 'Press E to read the sign',
        sprite: sign,
        open: () => ctx.ui.openBoard(tribe, mediaOfTribe(ctx.content, tribe.id), () => this.unlock()),
      });
      mark(signTile.x, signTile.y, 2, 1);

      // Trees along the edges and between the houses.
      const treeCount = 34;
      for (let n = 0, placed = 0; n < 400 && placed < treeCount; n++) {
        const x = Math.floor(rand() * COLS);
        const y = Math.floor(rand() * (ROWS - 2));
        const nearSquare = x >= 6 && x <= 15 && y >= 4 && y <= 10;
        if (used.has(`${x},${y}`) || isPath(x, y) || x >= 9 && x <= 12 && y >= 9 || nearSquare) continue;
        // Keep the area around the houses' doors open.
        if (HOUSES.some((h) => x >= h.x - 0 && x <= h.x + 2 && y === h.y + 3)) continue;
        used.add(`${x},${y}`);
        tile(TREES[Math.floor(rand() * TREES.length)], x, y, 2 + y / 100);
        this.blocks.push({ x: x * T + T * 0.2, y: y * T + T * 0.45, w: T * 0.6, h: T * 0.45 });
        placed++;
      }

      // The villagers.
      const villagers = villagersOf(ctx.content, tribe.id);
      villagers.forEach((villager, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const nudge = i >= SLOTS.length ? 0.35 * Math.ceil(i / SLOTS.length) : 0;
        const x = (slot[0] + 0.5 + nudge) * T;
        const y = (slot[1] + 1) * T - 4;
        const frame = figureFor(villager);
        this.add.ellipse(x, y, 30, 10, 0x000000, 0.3).setDepth(4);
        const npc = this.add.sprite(x, y, 'figures', frame).setOrigin(0.5, 1).setScale(SCALE).setDepth(5 + y / 1000);
        this.tweens.add({ targets: npc, y: y - 4, duration: 700 + rand() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rand() * 600 });
        const name = this.add
          .text(x, y - T - 6, villager.name, { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 4 })
          .setOrigin(0.5, 1)
          .setDepth(8);
        this.blocks.push({ x: x - 12, y: y - 10, w: 24, h: 10 });
        this.interactives.push({
          kind: 'villager',
          x,
          y: y - 6,
          hint: `Press E to talk to ${villager.name}`,
          sprite: npc,
          met: ctx.progress.talked.has(villager.id),
          nameText: name,
          open: () => {
            ctx.progress.talk(villager.id);
            ctx.refreshHud();
            const drawing = portraitOf(ctx.content, villager.id);
            ctx.ui.openVillager(villager, tribe, frame, drawing ? mediaUrl(drawing.storage_path) : null, () => this.unlock());
          },
        });
      });

      if (!villagers.length) {
        this.add
          .text(W / 2, 3.4 * T, 'Nobody lives here yet.', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 5 })
          .setOrigin(0.5, 1)
          .setDepth(8);
      }

      // The name of the village.
      this.add
        .text(16, 12, tribe.name, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 6 })
        .setScrollFactor(0)
        .setDepth(20);

      // The figure.
      const px = 10.5 * T + 0;
      const py = (ROWS - 1.2) * T;
      this.shadow = this.add.ellipse(px, py, 28, 10, 0x000000, 0.35).setDepth(5);
      this.player = this.add.sprite(px, py, 'heroes', PLAYER_FRAME).setOrigin(0.5, 1).setScale(SCALE).setDepth(6);
      this.arrowHint = this.add.text(px, py - T - 8, '▼', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c98f3e', stroke: '#1b1712', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(9);

      this.cameras.main.setBounds(0, 0, W, H);
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
      this.cameras.main.setRoundPixels(true);

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER');
      this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
      this.locked = false;
      this.target = null;
      this.leaving = false;

      this.input.on('pointerdown', (pointer) => {
        if (this.locked || ctx.ui.isOpen()) return;
        this.target = { x: pointer.worldX, y: pointer.worldY };
      });
      // Clicking a villager or the sign: go there, and talk when close.
      for (const item of this.interactives) {
        item.sprite.setInteractive({ useHandCursor: true });
        item.sprite.on('pointerdown', (pointer, _x, _y, event) => {
          event?.stopPropagation?.();
          if (this.locked || ctx.ui.isOpen()) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) <= TALK_DISTANCE + 20) this.talk(item);
          else this.target = { x: item.x, y: item.y + 40 };
        });
      }
      ctx.refreshHud();
    }

    blockedAt(x, y) {
      if (x < 8 || x > this.worldW - 8 || y < T * 0.9) return true;
      return this.blocks.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    }

    unlock() {
      this.locked = false;
    }

    talk(item) {
      this.locked = true;
      this.target = null;
      ctx.ui.setPrompt(null);
      item.open();
    }

    nearest() {
      let best = null;
      let bestDistance = TALK_DISTANCE;
      for (const item of this.interactives) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (d < bestDistance) {
          bestDistance = d;
          best = item;
        }
      }
      return best;
    }

    update(time, delta) {
      if (this.leaving) return;
      const dt = Math.min(delta, 50) / 1000;
      const p = this.player;
      const k = this.keys;

      if (!this.locked) {
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
        if (vx || vy) {
          const length = Math.hypot(vx, vy) || 1;
          const step = SPEED * dt;
          const nx = p.x + (vx / length) * step;
          const ny = p.y + (vy / length) * step;
          const before = { x: p.x, y: p.y };
          if (!this.blockedAt(nx, p.y)) p.x = nx;
          if (!this.blockedAt(p.x, ny)) p.y = ny;
          if (vx) p.setFlipX(vx < 0);
          p.setAngle(Math.sin(time / 70) * 4);
          if (this.target && Math.hypot(p.x - before.x, p.y - before.y) < step * 0.2) {
            this.stuck = (this.stuck || 0) + dt;
            if (this.stuck > 0.35) this.target = null;
          } else {
            this.stuck = 0;
          }
        } else {
          p.setAngle(0);
        }
        p.setDepth(5 + p.y / 1000);
      }
      this.shadow.setPosition(p.x, p.y);
      this.arrowHint.setPosition(p.x, p.y - T - 8 + Math.sin(time / 250) * 2);

      // Leave by walking off the bottom edge.
      if (!this.locked && p.y >= this.worldH - 6) {
        this.leaving = true;
        ctx.ui.setPrompt(null);
        this.scene.start('World', { from: this.tribe.id });
        return;
      }

      // Something to talk to close by?
      const item = this.locked ? null : this.nearest();
      ctx.ui.setPrompt(item ? item.hint : null);
      if (item && (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER))) {
        this.talk(item);
      }
    }
  };
}
