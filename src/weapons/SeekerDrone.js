import { GAME } from '../config/constants.js';
import { WeaponSubsystem } from './WeaponSubsystem.js';

export class SeekerDrone extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 5000, 2: 3000, 3: 3000 };
    this.missileSpeed = 500;
  }

  getBaseInterval() {
    return this.intervals[this.level] || 5000;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const missileCount = this.level >= 3 ? 2 : 1;
    const px = player.x;
    const py = player.y - 30;

    for (let i = 0; i < missileCount; i++) {
      const offsetX = missileCount === 2 ? (i === 0 ? -20 : 20) : 0;
      this.spawnHomingMissile(px + offsetX, py);
    }
  }

  spawnHomingMissile(x, y) {
    // Launch upward initially
    const bullet = this.spawnBullet(x, y, 0, -this.missileSpeed, {
      tint: 0xff4444,
      scale: 0.06,
    });

    if (!bullet) return;

    bullet.setData('isHoming', true);

    const weapon = this;
    const speed = this.missileSpeed;

    bullet.update = function () {
      // Out of bounds check
      if (this.y < -50 || this.y > GAME.HEIGHT + 50 ||
          this.x < -50 || this.x > GAME.WIDTH + 50) {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
        return;
      }

      // Find nearest enemy to track
      const target = weapon.getClosestEnemy();
      if (!target || !target.active) {
        // No target: fly straight (keep current velocity)
        return;
      }

      // Compute direction toward target
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      this.setVelocity(vx, vy);
    };
  }
}
