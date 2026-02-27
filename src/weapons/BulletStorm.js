import { WeaponSubsystem } from './WeaponSubsystem.js';

export class BulletStorm extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.stormEndTime = 0;
    this.stormDuration = 3000;
    this.l3DamageBoost = 0;
  }

  getBaseInterval() {
    if (this.level >= 3) return 8000;
    if (this.level >= 2) return 10000;
    return 12000;
  }

  fire(time) {
    // Activate bullet storm mode
    this.manager.bulletStormActive = true;
    this.stormEndTime = time + this.stormDuration;

    // L3: boost damage by 50% during storm
    if (this.level >= 3) {
      this.l3DamageBoost = (this.scene.playerDamage || 10) * 0.5;
      this.scene.playerDamage = (this.scene.playerDamage || 10) + this.l3DamageBoost;
    }
  }

  update(time, delta) {
    if (!this.active) return;

    // Check if storm should end
    if (this.manager.bulletStormActive && this.stormEndTime > 0 && time >= this.stormEndTime) {
      this.manager.bulletStormActive = false;
      this.stormEndTime = 0;

      // Remove L3 damage boost
      if (this.l3DamageBoost > 0) {
        this.scene.playerDamage = Math.max(1, (this.scene.playerDamage || 10) - this.l3DamageBoost);
        this.l3DamageBoost = 0;
      }
    }

    // Normal fire timer logic from base class
    const interval = this.getInterval();
    if (time - this.lastFireTime >= interval) {
      this.lastFireTime = time;
      this.fire(time);
    }
  }

  drawEffects(graphics, time) {
    if (!this.active) return;
    if (!this.manager.bulletStormActive) return;

    const player = this.scene.player;
    if (!player || !player.active) return;

    // Pulsing orange glow around player
    const t = time / 1000;
    const pulseScale = 1 + Math.sin(t * 8) * 0.3; // fast pulse
    const baseRadius = 60 * pulseScale;

    // Outer glow
    graphics.fillStyle(0xff8800, 0.1);
    graphics.fillCircle(player.x, player.y, baseRadius + 20);

    // Middle glow
    graphics.fillStyle(0xffaa00, 0.15);
    graphics.fillCircle(player.x, player.y, baseRadius);

    // Inner glow
    graphics.fillStyle(0xffcc33, 0.2);
    graphics.fillCircle(player.x, player.y, baseRadius - 20);

    // Glow ring
    graphics.lineStyle(3, 0xff6600, 0.3 + Math.sin(t * 6) * 0.15);
    graphics.strokeCircle(player.x, player.y, baseRadius + 10);
  }

  onDestroy() {
    // Ensure storm is cleaned up
    if (this.manager.bulletStormActive) {
      this.manager.bulletStormActive = false;
    }
    if (this.l3DamageBoost > 0) {
      this.scene.playerDamage = Math.max(1, (this.scene.playerDamage || 10) - this.l3DamageBoost);
      this.l3DamageBoost = 0;
    }
  }
}
