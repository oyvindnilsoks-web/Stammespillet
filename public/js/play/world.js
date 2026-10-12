import { buildMask, connectVillages, isBlocked } from './mask.js';
import { PLAYER_FRAME } from './data.js';

// The world map: the painted map is the ground, a small figure walks on it,
// and every village the students placed on the map has a sign. Walking into a
// sign goes inside the village (see village.js).

const MAP_W = 1400; // size of the picture of the map
const MAP_H = 1059;
export const WORLD_SCALE = 2;
const SPEED = 300; // pixels per second
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

      // A sign and a name for every village.
      this.signs = ctx.villages.map((v) => {
        const x = v.fx * W;
        const y = v.fy * H;
        this.add.ellipse(x, y + 2, 34, 12, 0x000000, 0.3).setDepth(2);
        this.add.image(x, y, 'town', 83).setOrigin(0.5, 1).setScale(SIGN_SCALE).setDepth(3);
        const label = this.add
          .text(x, y + 8, v.tribe.name, { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2e9da', stroke: '#1b1712', strokeThickness: 5 })
          .setOrigin(0.5, 0)
          .setDepth(4);
        const tick = this.add
          .text(x, y - 62, '✓', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#9fd09f', stroke: '#1b1712', strokeThickness: 4 })
          .setOrigin(0.5, 1)
          .setDepth(4)
          .setVisible(ctx.progress.visited.has(v.tribe.id));
        return { village: v, x, y, label, tick };
      });

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
      this.player = this.add.sprite(sx, sy, 'heroes', PLAYER_FRAME).setOrigin(0.5, 1).setScale(3).setDepth(6);

      this.cameras.main.setBounds(0, 0, W, H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setRoundPixels(true);

      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
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

    walkable(x, y) {
      return !isBlocked(this.mask, Math.floor((x / this.worldW) * this.mask.cols), Math.floor((y / this.worldH) * this.mask.rows));
    }

    update(time, delta) {
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

      if (vx || vy) {
        const length = Math.hypot(vx, vy) || 1;
        const step = SPEED * dt;
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
        // A little hop while walking.
        p.setAngle(Math.sin(time / 70) * 4);
      } else {
        p.setAngle(0);
      }
      this.shadow.setPosition(p.x, p.y);

      if (time > this.cooldownUntil) {
        for (const sign of this.signs) {
          if (Phaser.Math.Distance.Between(p.x, p.y, sign.x, sign.y) < ENTER_DISTANCE) {
            this.enter(sign);
            return;
          }
        }
      }
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
