import { GAME } from '../config/constants.js';
import { WeaponSubsystem } from './WeaponSubsystem.js';

export class BlackHole extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 8000, 2: 6000, 3: 4000 };
    this.baseRadius = 200;
    this.vortexDuration = 3000; // 3 seconds
    this.activeVortexes = [];
    this.damageTick = 500; // L3 damage every 500ms
    this.damagePerTick = 25; // 50 DMG/s = 25 per 500ms tick
  }

  getBaseInterval() {
    return this.intervals[this.level] || 8000;
  }

  fire(time) {
    const blastArea = this.scene.playerBlastArea || 1;
    const radius = this.baseRadius * blastArea;

    // Find the cluster center: position with most enemies within radius
    const center = this.findBestCluster(radius);
    if (!center) return;

    this.activeVortexes.push({
      x: center.x,
      y: center.y,
      radius: radius,
      startTime: time,
      lastDamageTick: time,
      spinAngle: 0,
    });
  }

  findBestCluster(radius) {
    const enemies = this.scene.enemies.getChildren().filter(e => e.active);

    // Also consider boss sprite
    const boss = this.scene.boss;
    if (boss?.active && boss.aaxBoss?.sprite?.active) {
      enemies.push(boss.aaxBoss.sprite);
    }

    if (enemies.length === 0) return null;

    let bestPos = null;
    let bestCount = 0;

    // Check each enemy position as a potential cluster center
    for (const candidate of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (Math.sqrt(dx * dx + dy * dy) <= radius) {
          count++;
        }
      }
      if (count > bestCount) {
        bestCount = count;
        bestPos = { x: candidate.x, y: candidate.y };
      }
    }

    return bestPos;
  }

  update(time, delta) {
    if (!this.active) return;

    const dt = delta / 1000;

    // Process active vortexes
    for (let i = this.activeVortexes.length - 1; i >= 0; i--) {
      const vortex = this.activeVortexes[i];
      const elapsed = time - vortex.startTime;

      if (elapsed >= this.vortexDuration) {
        this.activeVortexes.splice(i, 1);
        continue;
      }

      // Update spin angle for visual
      vortex.spinAngle += 4 * dt;

      // Pull enemies toward vortex center
      const pullStrength = 200; // pixels per second
      const enemies = this.manager.getEnemiesInRadius(vortex.x, vortex.y, vortex.radius);
      for (const e of enemies) {
        const dx = vortex.x - e.x;
        const dy = vortex.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const nx = dx / dist;
          const ny = dy / dist;
          // Pull stronger the closer they are
          const pullFactor = 1 - (dist / vortex.radius);
          e.x += nx * pullStrength * pullFactor * dt;
          e.y += ny * pullStrength * pullFactor * dt;
        }
      }

      // L3: deal damage over time
      if (this.level >= 3 && time - vortex.lastDamageTick >= this.damageTick) {
        vortex.lastDamageTick = time;
        this.manager.damageEnemiesInRadius(vortex.x, vortex.y, vortex.radius, this.damagePerTick);
      }
    }

    // Fire on timer
    const interval = this.getInterval();
    if (time - this.lastFireTime >= interval) {
      this.lastFireTime = time;
      this.fire(time);
    }
  }

  drawEffects(graphics, time) {
    for (const vortex of this.activeVortexes) {
      const elapsed = time - vortex.startTime;
      const lifeProgress = elapsed / this.vortexDuration; // 0 to 1
      const fadeAlpha = lifeProgress > 0.8 ? (1 - lifeProgress) / 0.2 : 1;

      const cx = vortex.x;
      const cy = vortex.y;
      const r = vortex.radius;
      const spin = vortex.spinAngle;

      // Outer ring
      graphics.lineStyle(2, 0x8844ff, 0.4 * fadeAlpha);
      graphics.strokeCircle(cx, cy, r);

      // Spinning inner circles
      const ringCount = 4;
      for (let j = 0; j < ringCount; j++) {
        const ringProgress = (j + 1) / (ringCount + 1);
        const ringR = r * ringProgress;
        const alpha = (0.3 + 0.3 * (1 - ringProgress)) * fadeAlpha;

        graphics.lineStyle(2, 0xaa66ff, alpha);
        graphics.strokeCircle(cx, cy, ringR);

        // Spinning dots on each ring
        const dotCount = 3;
        for (let k = 0; k < dotCount; k++) {
          const angle = spin * (1 + j * 0.5) + (k * Math.PI * 2) / dotCount;
          const dotX = cx + Math.cos(angle) * ringR;
          const dotY = cy + Math.sin(angle) * ringR;
          graphics.fillStyle(0xcc88ff, alpha * 1.5);
          graphics.fillCircle(dotX, dotY, 3);
        }
      }

      // Center glow
      graphics.fillStyle(0xffffff, 0.3 * fadeAlpha);
      graphics.fillCircle(cx, cy, 8);
      graphics.fillStyle(0xaa66ff, 0.2 * fadeAlpha);
      graphics.fillCircle(cx, cy, 20);
    }
  }

  onDestroy() {
    this.activeVortexes = [];
  }
}
