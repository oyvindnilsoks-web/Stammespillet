import { figureFor, portraitOf, hashString, mulberry32, villagersOf, mediaOfTribe, questOf, allQuests, generatedTopics, councilView, buildingLook } from './data.js';
import { sampleBiome } from './mask.js';
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

// How a village looks depends on where the students placed it on the map.
const BIOMES = {
  land: { bg: '#3f6b35', grass: null, dirt: null, trees: 34, treeTint: null, treeFrames: TREES },
  mountain: { bg: '#6f7a80', grass: 0xb4bec6, dirt: 0x9a9a9a, trees: 14, treeTint: 0xc5d3da, treeFrames: [28, 28, 16], rocks: 18, snow: true, wash: [0x8d969c, 0.8] },
  forest: { bg: '#27451f', grass: 0x6c9a60, dirt: 0x7a6a4a, trees: 72, treeTint: 0x3f7a3f, treeFrames: [28, 28, 28, 16, 5], wash: [0x173318, 0.5] },
  desert: { bg: '#c9a45c', grass: 0xe8c777, dirt: 0xcfa352, trees: 6, treeTint: 0xe0b060, treeFrames: [27], rocks: 8, wash: [0xdcb86a, 0.85] },
  sea: { bg: '#2e6a9e', grass: 0xf0dc9c, dirt: 0xe0c07c, trees: 8, treeTint: null, treeFrames: [5, 27], water: true, wash: [0xe8d49a, 0.85] },
};

// An evil (shadow) village is gloomy whatever the ground is: dark and cold
// colours, dead trees, fog and torches that flicker.
const SHADOW = { bg: '#140d1c', grass: 0x5d4e6b, dirt: 0x4a3a4c, treeTint: 0x3b3047, treeFrames: [28, 28, 16], houseTint: 0x8b7a99, wash: [0x2a2036, 0.65] };

// A colour over a colour, as a tint on a tile does it.
function mulTint(a, b) {
  if (a === null || a === undefined) return b ?? null;
  if (b === null || b === undefined) return a;
  const part = (shift) => Math.round((((a >> shift) & 255) * ((b >> shift) & 255)) / 255);
  return (part(16) << 16) | (part(8) << 8) | part(0);
}

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
      const tile = (frame, tx, ty, depth = 0, tint = null) => {
        const image = this.add.image(tx * T + T / 2, ty * T + T / 2, 'town', frame).setScale(SCALE).setDepth(depth);
        if (tint) image.setTint(tint);
        return image;
      };

      // The ground depends on where the village lies on the map.
      const territory = tribe.territory || {};
      ctx.biomes = ctx.biomes || {};
      if (!ctx.biomes[tribe.id]) {
        ctx.biomes[tribe.id] =
          ctx.mapImage && Number.isFinite(territory.map_x) && Number.isFinite(territory.map_y) ? sampleBiome(ctx.mapImage, territory.map_x / 100, territory.map_y / 100) : 'land';
      }
      this.biome = ctx.biomes[tribe.id];
      const shadow = tribe.charter_type === 'shadow';
      const base = BIOMES[this.biome] || BIOMES.land;
      const biome = shadow ? { ...base, ...SHADOW, trees: Math.max(base.trees, 40), rocks: Math.max(base.rocks || 0, 10), snow: base.snow, water: base.water } : base;
      this.cameras.main.setBackgroundColor(biome.bg);

      // Ground: grass, with a dirt square in the middle and a path down to the exit.
      const isSquare = (x, y) => x >= 7 && x <= 14 && y >= 5 && y <= 9;
      const isPath = (x, y) => x >= 10 && x <= 11 && y >= 10;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const dirt = isSquare(x, y) || isPath(x, y);
          tile(dirt ? DIRT[Math.floor(rand() * DIRT.length)] : GRASS[Math.floor(rand() * GRASS.length)], x, y, 0, dirt ? biome.dirt : biome.grass);
        }
      }

      // A colour over the ground, so a mountain is grey and a desert sandy, not green.
      if (biome.wash) this.add.rectangle(0, 0, W, H, biome.wash[0], biome.wash[1]).setOrigin(0, 0).setDepth(0.2);

      // Snow patches on a mountain, water along the top at the sea.
      if (biome.snow) {
        for (let n = 0; n < 12; n++) this.add.ellipse(rand() * W, rand() * H, T * (1 + rand() * 1.5), T * (0.5 + rand() * 0.6), 0xffffff, 0.55).setDepth(0.5);
      }
      if (biome.water) {
        this.add.rectangle(0, 0, W, T * 1.1, 0x3f86b8).setOrigin(0, 0).setDepth(1);
        for (let n = 0; n < 14; n++) {
          const wave = this.add.ellipse(rand() * W, T * (0.15 + rand() * 0.7), T * 0.9, 5, 0xdff2f5, 0.7).setDepth(1.1);
          this.tweens.add({ targets: wave, x: wave.x + T * 0.5, alpha: 0.2, duration: 1400 + rand() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }

      // The buildings follow what the students wrote: roof colour, stone or wood,
      // how big the village is, and up to two known buildings.
      const look = buildingLook(tribe);
      const houses = HOUSES.slice(0, look.houses);
      const roofTint = mulTint(look.roof && look.roof.tint, biome.houseTint);
      const wallTint = mulTint(look.wallTint, biome.houseTint);

      // Houses.
      houses.forEach((h, i) => {
        const colour = look.roof ? look.roof.tile : (hashString(tribe.id) + i) % 3 === 0 ? 'grey' : 'red';
        for (let c = 0; c < 3; c++) {
          tile(ROOF_TOP[colour][c], h.x + c, h.y, 2, roofTint);
          tile(ROOF_LOW[colour][c], h.x + c, h.y + 1, 2, roofTint);
          tile(WALL[c], h.x + c, h.y + 2, 2, wallTint);
        }
        if (shadow) {
          // A torch by the door that flickers.
          const glow = this.add.ellipse(h.x * T + T * 1.5, (h.y + 3) * T - 6, T * 0.7, T * 0.7, 0xff7a30, 0.5).setDepth(3);
          this.tweens.add({ targets: glow, alpha: 0.15, scale: 0.8, duration: 160 + rand() * 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rand() * 300 });
        }
        this.blocks.push({ x: h.x * T, y: h.y * T + T * 0.6, w: 3 * T, h: 2.4 * T });
        mark(h.x, h.y, 3, 3);
      });

      // The known buildings the text talks about, left and right of the square.
      const spots = [{ x: 4.6 * T, by: 9.3 * T, tiles: [3, 6] }, { x: 17 * T, by: 9.3 * T, tiles: [16, 6] }];
      look.landmarks.forEach((kind, i) => {
        const spot = spots[i];
        mark(spot.tiles[0], spot.tiles[1], 3, 4);
        const area = this.drawLandmark(kind, spot.x, spot.by);
        this.blocks.push(area);
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
        hint: 'Read the sign (E or click here)',
        sprite: sign,
        open: () => ctx.ui.openBoard(tribe, mediaOfTribe(ctx.content, tribe.id), () => this.unlock(), councilView(ctx.content, tribe.id)),
      });
      mark(signTile.x, signTile.y, 2, 1);

      // Trees along the edges and between the houses.
      const treeCount = biome.trees;
      for (let n = 0, placed = 0; n < 400 && placed < treeCount; n++) {
        const x = Math.floor(rand() * COLS);
        const y = Math.floor(rand() * (ROWS - 2));
        const nearSquare = x >= 6 && x <= 15 && y >= 4 && y <= 10;
        if (used.has(`${x},${y}`) || isPath(x, y) || x >= 9 && x <= 12 && y >= 9 || nearSquare) continue;
        // Keep the area around the houses' doors open.
        if (houses.some((h) => x >= h.x - 0 && x <= h.x + 2 && y === h.y + 3)) continue;
        used.add(`${x},${y}`);
        tile(biome.treeFrames[Math.floor(rand() * biome.treeFrames.length)], x, y, 2 + y / 100, biome.treeTint);
        this.blocks.push({ x: x * T + T * 0.2, y: y * T + T * 0.45, w: T * 0.6, h: T * 0.45 });
        placed++;
      }

      // Boulders on the mountain and in the desert.
      for (let n = 0, placed = 0; n < 300 && placed < (biome.rocks || 0); n++) {
        const x = Math.floor(rand() * COLS);
        const y = 1 + Math.floor(rand() * (ROWS - 3));
        const nearSquare = x >= 6 && x <= 15 && y >= 4 && y <= 10;
        if (used.has(`${x},${y}`) || isPath(x, y) || (x >= 9 && x <= 12 && y >= 9) || nearSquare) continue;
        if (houses.some((h) => x >= h.x && x <= h.x + 2 && y === h.y + 3)) continue;
        used.add(`${x},${y}`);
        this.add.ellipse(x * T + T / 2, y * T + T * 0.7, T * 0.85, T * 0.55, 0x8b9096).setStrokeStyle(3, 0x4a4e52).setDepth(2 + y / 100);
        this.blocks.push({ x: x * T + T * 0.1, y: y * T + T * 0.4, w: T * 0.8, h: T * 0.5 });
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
          hint: `Talk to ${villager.name} (E or click here)`,
          sprite: npc,
          met: ctx.progress.talked.has(villager.id),
          nameText: name,
          open: () => {
            ctx.progress.talk(villager.id);
            ctx.refreshHud();
            const drawing = portraitOf(ctx.content, villager.id);
            ctx.ui.openVillager(villager, tribe, frame, drawing ? mediaUrl(drawing.storage_path) : null, () => this.unlock(), [...generatedTopics(ctx.content, villager, tribe, this.biome), ...this.questTopics(villager)]);
          },
        });
      });

      if (shadow) {
        // Darkness over the ground, and fog drifting across it. The names of the
        // villagers (depth 8) stay above it and easy to read.
        this.add.rectangle(0, 0, W, H, 0x120818, 0.4).setOrigin(0, 0).setDepth(7);
        for (let n = 0; n < 9; n++) {
          const fog = this.add.ellipse(rand() * W, rand() * H, T * (4 + rand() * 3), T * (1.2 + rand()), 0xb8a8d0, 0.13).setDepth(7.1);
          this.tweens.add({ targets: fog, x: fog.x + T * (rand() > 0.5 ? 2.5 : -2.5), duration: 7000 + rand() * 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }

      this.startPresence();

      // The player may have found an answer here for someone in another village.
      this.time.delayedCall(700, () => this.showFound());

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
      this.player = this.add.sprite(px, py, ctx.look.texture, ctx.look.frame).setOrigin(0.5, 1).setScale(SCALE).setDepth(6);
      this.lookKey = ctx.look.key;
      this.arrowHint = this.add.text(px, py - T - 8, '▼', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c98f3e', stroke: '#1b1712', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(9);

      this.cameras.main.setBounds(0, 0, W, H);
      this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
      this.cameras.main.setRoundPixels(true);

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER');
      this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
      this.locked = false;
      this.target = null;
      this.leaving = false;

      // E, space or enter talks to whoever is closest. It is caught by the page,
      // not asked for in every picture, so a press is never missed.
      this.wantTalk = false;
      this.onTalkKey = (e) => {
        if (ctx.ui.isOpen() || e.repeat || !['e', 'E', ' ', 'Enter'].includes(e.key)) return;
        if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement?.tagName || '') && e.key !== 'e' && e.key !== 'E') return;
        this.wantTalk = true;
      };
      document.addEventListener('keydown', this.onTalkKey);
      this.events.once('shutdown', () => document.removeEventListener('keydown', this.onTalkKey));

      // While a window is open the keys are for the window: no walking, no talking
      // to a villager by accident, no blocked space bar, while someone types.
      const lockKeys = (open) => {
        const kb = this.input.keyboard;
        if (!kb) return;
        kb.enabled = !open;
        if (open) {
          kb.resetKeys();
          kb.disableGlobalCapture?.();
        } else {
          kb.enableGlobalCapture?.();
          this.wantTalk = false;
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

      this.input.on('pointerdown', (pointer) => {
        if (this.locked || ctx.ui.isOpen()) return;
        this.pendingTalk = null;
        this.target = { x: pointer.worldX, y: pointer.worldY };
      });
      // Clicking a villager or the sign: go there, and talk when close.
      for (const item of this.interactives) {
        item.sprite.setInteractive({ useHandCursor: true });
        item.sprite.on('pointerdown', (pointer, _x, _y, event) => {
          event?.stopPropagation?.();
          if (this.locked || ctx.ui.isOpen()) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y) <= TALK_DISTANCE + 20) this.talk(item);
          else {
            // Walk over, and start talking on arrival.
            this.target = { x: item.x, y: item.y + 40 };
            this.pendingTalk = item;
          }
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

    // A drawn building, standing on the ground at (x, by). Returns the place that is blocked.
    drawLandmark(kind, x, by) {
      const depth = 2 + by / T / 100;
      const box = (cx, bottom, w, h, fill, stroke = 0x3b3b44) =>
        this.add.rectangle(cx, bottom - h / 2, w, h, fill).setStrokeStyle(2, stroke).setDepth(depth);
      const roof = (cx, bottom, w, h, fill) =>
        this.add.triangle(cx, bottom - h / 2, 0, h, w / 2, 0, w, h, fill).setStrokeStyle(2, 0x3b3b44).setDepth(depth);
      this.add.ellipse(x, by, T * 1.5, T * 0.4, 0x000000, 0.3).setDepth(depth - 0.01);
      let width = T * 1.2;

      if (kind === 'tower') {
        box(x, by, T * 1.1, T * 2.6, 0x9aa0ab);
        for (let i = -1; i <= 1; i++) box(x + i * T * 0.38, by - T * 2.6, T * 0.28, T * 0.3, 0x9aa0ab);
        box(x, by - T * 1.6, T * 0.25, T * 0.45, 0x23262e);
        box(x, by, T * 0.4, T * 0.6, 0x5a3b1f);
      } else if (kind === 'lighthouse') {
        box(x, by, T * 1.1, T * 0.9, 0xf2f2f2);
        box(x, by - T * 0.9, T * 1.0, T * 0.9, 0xc0392b);
        box(x, by - T * 1.8, T * 0.9, T * 0.9, 0xf2f2f2);
        box(x, by - T * 2.7, T * 0.7, T * 0.5, 0xffe28a);
        roof(x, by - T * 3.2, T * 0.9, T * 0.5, 0xc0392b);
        const glow = this.add.ellipse(x, by - T * 2.95, T * 2.2, T * 1.1, 0xffe28a, 0.35).setDepth(depth + 0.01);
        this.tweens.add({ targets: glow, alpha: 0.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (kind === 'windmill') {
        box(x, by, T * 1.1, T * 1.7, 0xb08a5a);
        roof(x, by - T * 1.7, T * 1.4, T * 0.7, 0x7a4b2a);
        box(x, by, T * 0.35, T * 0.55, 0x4a2f18);
        const blades = this.add.container(x, by - T * 1.5).setDepth(depth + 0.01);
        blades.add([this.add.rectangle(0, 0, T * 0.16, T * 1.9, 0xf2e9da).setStrokeStyle(2, 0x3b3b44), this.add.rectangle(0, 0, T * 1.9, T * 0.16, 0xf2e9da).setStrokeStyle(2, 0x3b3b44)]);
        this.tweens.add({ targets: blades, angle: 360, duration: 7000, repeat: -1 });
        width = T * 1.9;
      } else if (kind === 'well') {
        box(x - T * 0.45, by - T * 0.3, T * 0.12, T * 0.9, 0x5a3b1f);
        box(x + T * 0.45, by - T * 0.3, T * 0.12, T * 0.9, 0x5a3b1f);
        this.add.ellipse(x, by - T * 0.1, T * 1.1, T * 0.55, 0x8b9096).setStrokeStyle(2, 0x3b3b44).setDepth(depth);
        this.add.ellipse(x, by - T * 0.14, T * 0.8, T * 0.35, 0x3f6f9f).setDepth(depth + 0.01);
        roof(x, by - T * 1.2, T * 1.3, T * 0.5, 0x7a4b2a);
        width = T * 1.1;
      } else if (kind === 'temple') {
        box(x, by, T * 2.2, T * 0.3, 0xcfc8b6);
        for (let i = -1.5; i <= 1.5; i++) box(x + i * T * 0.55, by - T * 0.3, T * 0.24, T * 1.3, 0xe8e2d2);
        roof(x, by - T * 1.6, T * 2.4, T * 0.8, 0xc9c2b0);
        width = T * 2.2;
      } else if (kind === 'fountain') {
        this.add.ellipse(x, by - T * 0.2, T * 1.7, T * 0.8, 0xb9bec6).setStrokeStyle(2, 0x3b3b44).setDepth(depth);
        this.add.ellipse(x, by - T * 0.25, T * 1.3, T * 0.55, 0x4f93c8).setDepth(depth + 0.01);
        box(x, by - T * 0.2, T * 0.18, T * 0.9, 0xb9bec6);
        const jet = this.add.ellipse(x, by - T * 1.1, T * 0.5, T * 0.35, 0xbfe3f5, 0.8).setDepth(depth + 0.02);
        this.tweens.add({ targets: jet, y: by - T * 1.35, alpha: 0.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        width = T * 1.7;
      }
      return { x: x - width / 2, y: by - T * 0.55, w: width, h: T * 0.55 };
    }

    // Tell the server we are in this village and ask who else is. When all the
    // villagers of the village are here, a button for the council appears for all.
    startPresence() {
      const tribe = this.tribe;
      const ctxp = ctx.presence;
      if (!ctxp) return;
      let stopped = false;
      let opened = false; // the council window opened by itself once per meeting
      const poll = async () => {
        if (stopped) return;
        await ctxp.beat(tribe.id);
        let s;
        try {
          s = await ctxp.state(tribe.id);
        } catch {
          return;
        }
        if (stopped) return;
        if (!s.resident || s.total < 2) {
          ctx.ui.setCouncilBar(null);
          return;
        }
        if (s.session_active) {
          ctx.ui.setCouncilBar({ text: 'The village council is meeting.', label: 'Go to the council', onClick: () => this.openCouncil() });
          if (!opened && !ctx.ui.isOpen()) {
            opened = true;
            this.openCouncil();
          }
        } else if (s.ready) {
          opened = false;
          ctx.ui.setCouncilBar({
            text: 'Everyone from the village is here.',
            label: 'Start the village council',
            onClick: async () => {
              const r = await ctxp.start(tribe.id);
              if (r.ok) {
                opened = true;
                this.openCouncil();
              }
            },
          });
        } else {
          opened = false;
          ctx.ui.setCouncilBar({ text: `Council: ${s.here.length} of ${s.total} from the village are here. Waiting for ${s.missing.join(', ')}.` });
        }
      };
      poll();
      const timer = setInterval(poll, 5000);
      this.events.once('shutdown', () => {
        stopped = true;
        clearInterval(timer);
        ctx.ui.setCouncilBar(null);
        ctxp.beat(null);
      });
    }

    openCouncil() {
      if (this.locked || ctx.ui.isOpen()) return;
      this.locked = true;
      ctx.openCouncil(this.tribe, () => this.unlock());
    }

    // What a villager says about their problem, depending on how far the player has come.
    questTopics(villager) {
      const quest = questOf(ctx.content, villager);
      if (!quest) return [];
      const state = ctx.progress.quest(villager.id);
      const say = (question, answer, onShow) => [{ id: 'quest', question, answer, onShow }];
      if (state === 'found') {
        return say('I found the answer to your problem', quest.thanks, () => {
          ctx.progress.setQuest(villager.id, 'done');
          ctx.refreshHud();
          // The ground around this village is cleaned of poison.
          ctx.cleanse?.(villager.tribe_id);
        });
      }
      if (state === 'done') return say('About your problem', quest.thanks);
      const said = quest.hint ? `${quest.problem}\n\nHint: ${quest.hint}` : quest.problem;
      const answer = quest.placeholder ? `(Placeholder) ${said}` : said;
      return say(state === 'open' ? 'About your problem' : 'Do you need help?', answer, () => {
        if (!state) {
          ctx.progress.setQuest(villager.id, 'open');
          ctx.refreshHud();
        }
      });
    }

    // Problems from other villages that can be solved here: show what is found.
    showFound() {
      const here = allQuests(ctx.content).filter(
        ({ villager, quest }) => ctx.progress.quest(villager.id) === 'open' && quest.targets.includes(this.tribe.id) && villager.tribe_id !== this.tribe.id
      );
      const next = () => {
        const item = here.shift();
        if (!item || this.leaving) return;
        ctx.progress.setQuest(item.villager.id, 'found');
        ctx.refreshHud();
        this.locked = true;
        ctx.ui.openNote(`Something for ${item.villager.name}`, `${this.tribe.name} · for the problem in ${item.tribe ? item.tribe.name : 'another village'}`, item.quest.found, () => {
          this.unlock();
          next();
        });
      };
      if (!ctx.ui.isOpen()) next();
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
      if (ctx.look.key !== this.lookKey) {
        this.player.setTexture(ctx.look.texture, ctx.look.frame);
        this.lookKey = ctx.look.key;
      }
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
      ctx.ui.setPrompt(item ? item.hint : null, item ? () => this.talk(item) : null);
      const wanted = this.wantTalk;
      this.wantTalk = false;
      if (item && wanted) {
        this.talk(item);
      } else if (!this.locked && this.pendingTalk) {
        const target = this.pendingTalk;
        if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) <= TALK_DISTANCE) {
          this.pendingTalk = null;
          this.talk(target);
        } else if (!this.target) {
          this.pendingTalk = null; // could not get there
        }
      }
    }
  };
}
