import { WeaponSubsystem } from './WeaponSubsystem.js';

export class RearGuard extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.intervals = { 1: 800, 2: 600, 3: 400 };
    this.bulletCounts = { 1: 1, 2: 2, 3: 3 };
    this.damageMultiplier = 1.0;
  }

  getBaseInterval() {
    return this.intervals[this.level] || 800;
  }

  onLevelChanged(level) {
    this.damageMultiplier = level >= 3 ? 1.5 : 1.0;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    // Fire opposite of aim direction (covering the player's back)
    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const rearAngle = aimAngle + Math.PI;
    const count = this.bulletCounts[this.level] || 1;
    const px = player.x;
    const py = player.y;
    const speed = 600;

    const damageOverride = this.damageMultiplier !== 1.0
      ? this.manager.getFinalDamage(false) * this.damageMultiplier
      : undefined;

    if (count === 1) {
      const opts = { useMainPool: true };
      if (damageOverride !== undefined) opts.damage = damageOverride;
      this.spawnBullet(
        px, py,
        Math.cos(rearAngle) * speed,
        Math.sin(rearAngle) * speed,
        opts,
      );
    } else {
      const fanRad = (10 * Math.PI) / 180;
      const offsets =
        count === 2 ? [-fanRad, fanRad] : [-fanRad, 0, fanRad];
      for (const offset of offsets) {
        const angle = rearAngle + offset;
        const opts = { useMainPool: true };
        if (damageOverride !== undefined) opts.damage = damageOverride;
        this.spawnBullet(
          px, py,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          opts,
        );
      }
    }
  }
}
