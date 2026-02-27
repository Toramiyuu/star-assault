import { WeaponSubsystem } from './WeaponSubsystem.js';

export class NebulaRounds extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.clouds = [];
    this.cloudRadius = 40;
    this.damageTickInterval = 500;
  }

  getBaseInterval() {
    // NebulaRounds is a passive mod; no firing timer needed
    return 99999;
  }

  getCloudDuration() {
    if (this.level >= 3) return 3000;
    if (this.level >= 2) return 2000;
    return 1000;
  }

  getDamageMultiplier() {
    return this.level >= 3 ? 0.5 : 0.3;
  }

  fire() {
    // NebulaRounds does not fire on its own
  }

  /**
   * Called externally by the collision handler when a player bullet hits an enemy.
   * Creates a damage cloud at the impact location.
   */
  createCloud(x, y) {
    this.clouds.push({
      x,
      y,
      startTime: this.scene.time.now,
      duration: this.getCloudDuration(),
      lastDamageTick: 0,
    });
  }

  update(time, delta) {
    if (!this.active) return;

    const damagePerTick = (this.scene.playerDamage || 10) * this.getDamageMultiplier();
    const blastArea = this.scene.playerBlastArea || 1;
    const radius = this.cloudRadius * blastArea;

    // Iterate clouds, apply damage ticks, remove expired
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      const elapsed = time - cloud.startTime;

      // Remove expired clouds
      if (elapsed >= cloud.duration) {
        this.clouds.splice(i, 1);
        continue;
      }

      // Damage tick every 500ms
      if (time - cloud.lastDamageTick >= this.damageTickInterval) {
        cloud.lastDamageTick = time;
        this.manager.damageEnemiesInRadius(cloud.x, cloud.y, radius, damagePerTick);
      }
    }
  }

  drawEffects(graphics, time) {
    if (!this.active) return;

    const blastArea = this.scene.playerBlastArea || 1;
    const radius = this.cloudRadius * blastArea;

    for (const cloud of this.clouds) {
      const elapsed = time - cloud.startTime;
      const lifeRatio = elapsed / cloud.duration;

      // Fade out as cloud expires
      const alpha = Math.max(0, 0.35 * (1 - lifeRatio));

      // Outer cloud
      graphics.fillStyle(0x33ff66, alpha * 0.5);
      graphics.fillCircle(cloud.x, cloud.y, radius);

      // Inner core
      graphics.fillStyle(0x66ffaa, alpha * 0.7);
      graphics.fillCircle(cloud.x, cloud.y, radius * 0.5);

      // Pulsing ring
      const pulseRadius = radius * (0.8 + Math.sin(time / 200 + cloud.startTime) * 0.2);
      graphics.lineStyle(2, 0x44ff88, alpha * 0.6);
      graphics.strokeCircle(cloud.x, cloud.y, pulseRadius);
    }
  }

  onCreate() {
    // Flag the scene so collision handler knows to create clouds on bullet impact
    this.scene.nebulaRoundsActive = true;
  }

  onDestroy() {
    this.scene.nebulaRoundsActive = false;
    this.clouds = [];
  }
}
