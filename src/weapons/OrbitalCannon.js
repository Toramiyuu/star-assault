import { GAME } from '../config/constants.js';
import { WeaponSubsystem } from './WeaponSubsystem.js';

export class OrbitalCannon extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 2000, 2: 1500, 3: 1000 };
    this.orbitRadius = 120;
    this.angularSpeed = 2; // rad/s
    this.orbitAngle = 0;
    this.satellites = [];
    this.bulletSpeed = 700;
  }

  getBaseInterval() {
    return this.intervals[this.level] || 2000;
  }

  onLevelChanged(level) {
    this.rebuildSatellites();
  }

  onCreate() {
    this.rebuildSatellites();
  }

  rebuildSatellites() {
    // Destroy existing satellites
    for (const sat of this.satellites) {
      if (sat && sat.scene) sat.destroy();
    }
    this.satellites = [];

    const count = this.level >= 3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const sat = this.scene.add.image(0, 0, 'player_bullet_1');
      sat.setTint(0x44aaff);
      sat.setScale(0.15);
      sat.setDepth(20);
      this.satellites.push(sat);
    }
  }

  update(time, delta) {
    if (!this.active) return;

    // Update orbit angle
    const dt = delta / 1000;
    this.orbitAngle += this.angularSpeed * dt;

    // Update satellite positions
    const player = this.scene.player;
    if (player && player.active) {
      const count = this.satellites.length;
      for (let i = 0; i < count; i++) {
        const sat = this.satellites[i];
        if (!sat || !sat.scene) continue;
        const angleOffset = (i * Math.PI * 2) / count;
        const angle = this.orbitAngle + angleOffset;
        sat.x = player.x + Math.cos(angle) * this.orbitRadius;
        sat.y = player.y + Math.sin(angle) * this.orbitRadius;
        sat.setVisible(true);
        // Spin the satellite as it orbits
        sat.setRotation(this.orbitAngle * 3);
      }
    } else {
      // Hide satellites if player is gone
      for (const sat of this.satellites) {
        if (sat && sat.scene) sat.setVisible(false);
      }
    }

    // Fire on timer
    const interval = this.getInterval();
    if (time - this.lastFireTime >= interval) {
      this.lastFireTime = time;
      this.fire(time);
    }
  }

  fire(time) {
    const target = this.getClosestEnemy();
    if (!target || !target.active) return;

    for (const sat of this.satellites) {
      if (!sat || !sat.scene) continue;

      const dx = target.x - sat.x;
      const dy = target.y - sat.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const vx = (dx / dist) * this.bulletSpeed;
      const vy = (dy / dist) * this.bulletSpeed;

      this.spawnBullet(sat.x, sat.y, vx, vy, {
        tint: 0x44aaff,
        scale: 0.08,
      });

      // Flash at satellite position when firing
      const flash = this.scene.add.graphics().setDepth(21);
      flash.fillStyle(0x44aaff, 0.6);
      flash.fillCircle(sat.x, sat.y, 12);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy(),
      });
    }
  }

  onDestroy() {
    for (const sat of this.satellites) {
      if (sat && sat.scene) sat.destroy();
    }
    this.satellites = [];
  }
}
