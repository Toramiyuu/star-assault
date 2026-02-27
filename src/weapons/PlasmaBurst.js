import { WeaponSubsystem } from './WeaponSubsystem.js';

export class PlasmaBurst extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 4000, 2: 3000, 3: 2000 };
    this.baseRadius = 150;
    this.activeBursts = [];
  }

  getBaseInterval() {
    return this.intervals[this.level] || 4000;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const cx = player.x;
    const cy = player.y;

    // Calculate effective radius
    const radiusMultiplier = this.level >= 3 ? 1.5 : 1.0;
    const blastAreaMultiplier = this.scene.playerBlastArea || 1;
    const maxRadius = this.baseRadius * radiusMultiplier * blastAreaMultiplier;

    // Calculate damage
    const baseDamage = this.scene.playerDamage || 10;
    const damage = baseDamage * 1.5;

    // Deal damage to all enemies in radius
    this.manager.damageEnemiesInRadius(cx, cy, maxRadius, damage);

    // Store burst data for visual effect
    this.activeBursts.push({
      x: cx,
      y: cy,
      startTime: time,
      maxRadius: maxRadius,
    });
  }

  drawEffects(graphics, time) {
    // Draw expanding ring for each active burst
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const burst = this.activeBursts[i];
      const elapsed = time - burst.startTime;

      if (elapsed > 500) {
        // Burst effect expired
        this.activeBursts.splice(i, 1);
        continue;
      }

      const progress = elapsed / 500; // 0 to 1
      const currentRadius = burst.maxRadius * progress;
      const alpha = 1 - progress;

      graphics.lineStyle(3, 0x00ffff, alpha);
      graphics.strokeCircle(burst.x, burst.y, currentRadius);

      // Inner glow ring
      graphics.lineStyle(1, 0xffffff, alpha * 0.5);
      graphics.strokeCircle(burst.x, burst.y, currentRadius * 0.8);
    }
  }

  onDestroy() {
    this.activeBursts = [];
  }
}
