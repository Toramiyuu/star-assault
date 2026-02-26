import { GAME } from '../config/constants.js';

const XP_PER_ENEMY = {
  grunt: 5,
  zigzagger: 12,
  diver: 15,
  formation_leader: 30,
  bomber: 20,
  mine: 3,
  boss: 500,
};

const COLLECT_DISTANCE = 40;
const ORB_RADIUS = 7;

export class XPManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.xp = 0;
    this.level = 0;
    this.orbs = []; // managed manually (graphics objects, not physics group)
  }

  getThreshold() {
    const wave = this.scene.waveManager?.currentWave || 1;
    if (wave <= 3) return 50;
    if (wave <= 6) return 90;
    if (wave <= 9) return 140;
    return 200;
  }

  getXPForEnemy(enemyType) {
    return XP_PER_ENEMY[enemyType] || 5;
  }

  spawnOrb(x, y, xpValue) {
    // Random velocity burst on spawn
    const vx = (this.random() - 0.5) * 120;
    const vy = (this.random() - 0.5) * 80 + 30;

    this.orbs.push({
      x, y, vx, vy,
      xp: xpValue,
      age: 0,
      collected: false,
    });
  }

  _drawOrb(gfx, orb, time) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.00785 + orb.x * 0.01);
    // Outer glow (breathes with pulse)
    gfx.fillStyle(0xFF6600, 0.15 * pulse);
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 2.5);
    // Mid glow (steady — outer handles the breathe)
    gfx.fillStyle(0xFF8800, 0.4);
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 1.5);
    // Core (warm amber)
    gfx.fillStyle(0xFFAA44, 0.95);
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS);
    // Bright center dot
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(orb.x, orb.y, ORB_RADIUS * 0.35);
  }

  update(time, delta) {
    const player = this.scene.player;
    if (!player?.active) return;
    const px = player.x;
    const py = player.y;
    const magnetRadius = this.scene.playerMagnet;
    const dt = delta / 1000;

    // Initialize graphics layer if needed
    if (!this._gfx) {
      this._gfx = this.scene.add.graphics().setDepth(5);
    }
    this._gfx.clear();

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.age += delta;

      // Remove orbs that fall off screen
      if (orb.y > GAME.HEIGHT + 100 || orb.x < -100 || orb.x > GAME.WIDTH + 100) {
        this.orbs.splice(i, 1);
        continue;
      }

      const dx = px - orb.x;
      const dy = py - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < COLLECT_DISTANCE) {
        this.addXP(orb.xp);
        this.orbs.splice(i, 1);
        continue;
      }

      if (dist < magnetRadius) {
        // Accelerating pull — faster the closer they get
        const t = 1 - (dist / magnetRadius);
        const speed = 80 + t * t * 1200;
        const step = Math.min(1, (speed * dt) / dist);
        orb.x += dx * step;
        orb.y += dy * step;
        orb.vx = 0;
        orb.vy = 0;
      } else {
        // Apply velocity with drag
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.vx *= 0.96;
        orb.vy *= 0.96;
        // Slow drift down if nearly stationary
        if (Math.abs(orb.vx) < 1 && Math.abs(orb.vy) < 1) {
          orb.vy = 15;
        }
      }

      // Draw magnet trail when being pulled
      if (dist < magnetRadius) {
        const trailAlpha = 0.15 + 0.15 * (1 - dist / magnetRadius);
        this._gfx.lineStyle(2, 0xFF6600, trailAlpha);
        this._gfx.lineBetween(orb.x, orb.y, orb.x + dx * 0.3, orb.y + dy * 0.3);
      }

      this._drawOrb(this._gfx, orb, time);
    }
  }

  addXP(amount) {
    this.xp += amount;
    const threshold = this.getThreshold();

    if (this.xp >= threshold) {
      this.xp -= threshold;
      this.level++;
      this.onLevelUp();
    }
  }

  onLevelUp() {
    if (this.scene.upgradeManager) {
      this.scene.upgradeManager.triggerCardSelection();
    }
  }

  destroy() {
    this.orbs = [];
    if (this._gfx) {
      this._gfx.destroy();
      this._gfx = null;
    }
  }
}
