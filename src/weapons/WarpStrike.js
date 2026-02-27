import { GAME } from '../config/constants.js';
import { WeaponSubsystem } from './WeaponSubsystem.js';

export class WarpStrike extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 10000, 2: 7000, 3: 5000 };
    this.damages = { 1: 100, 2: 150, 3: 200 };
    this.baseExplosionRadius = 120;
    this.activeEffects = [];
  }

  getBaseInterval() {
    return this.intervals[this.level] || 10000;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const blastArea = this.scene.playerBlastArea || 1;
    const radius = this.baseExplosionRadius * blastArea;

    // Find best enemy cluster
    const target = this.findBestCluster(radius);
    if (!target) return;

    // Save original position
    const savedX = player.x;
    const savedY = player.y;

    // Teleport player to target cluster
    player.x = target.x;
    player.y = target.y;

    // AoE explosion at destination
    const damage = this.damages[this.level] || 100;
    const enemies = this.manager.getEnemiesInRadius(target.x, target.y, radius);

    this.manager.damageEnemiesInRadius(target.x, target.y, radius, damage);

    // L3: stun surviving enemies (set speed to 0 for 1 second)
    if (this.level >= 3) {
      const stunDuration = 1000;
      const survivingEnemies = this.manager.getEnemiesInRadius(target.x, target.y, radius);
      for (const e of survivingEnemies) {
        // Skip boss sprite
        if (this.scene.boss?.aaxBoss?.sprite === e) continue;

        const originalSpeedX = e.body ? e.body.velocity.x : 0;
        const originalSpeedY = e.body ? e.body.velocity.y : 0;
        if (e.body) {
          e.body.velocity.x = 0;
          e.body.velocity.y = 0;
        }

        // Restore speed after stun duration
        this.scene.time.delayedCall(stunDuration, () => {
          if (e && e.active && e.body) {
            e.body.velocity.x = originalSpeedX;
            e.body.velocity.y = originalSpeedY;
          }
        });
      }
    }

    // Store flash effect
    this.activeEffects.push({
      x: target.x,
      y: target.y,
      radius: radius,
      startTime: time,
    });

    // Teleport player back after 200ms
    this.scene.time.delayedCall(200, () => {
      if (player && player.active) {
        player.x = savedX;
        player.y = savedY;
      }
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

  drawEffects(graphics, time) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      const elapsed = time - effect.startTime;

      // Flash effect lasts 400ms
      if (elapsed > 400) {
        this.activeEffects.splice(i, 1);
        continue;
      }

      const progress = elapsed / 400; // 0 to 1
      const alpha = 1 - progress;

      // Expanding white flash
      const flashRadius = effect.radius * (0.5 + progress * 0.5);
      graphics.fillStyle(0xffffff, alpha * 0.4);
      graphics.fillCircle(effect.x, effect.y, flashRadius);

      // Bright center
      graphics.fillStyle(0xffff88, alpha * 0.8);
      graphics.fillCircle(effect.x, effect.y, 30 * (1 - progress));

      // Expanding ring
      graphics.lineStyle(3, 0xffaa44, alpha);
      graphics.strokeCircle(effect.x, effect.y, effect.radius * progress);

      // Second outer ring
      graphics.lineStyle(1, 0xffffff, alpha * 0.5);
      graphics.strokeCircle(effect.x, effect.y, effect.radius * progress * 1.2);
    }
  }

  onDestroy() {
    this.activeEffects = [];
  }
}
