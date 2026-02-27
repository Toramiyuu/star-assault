import { WeaponSubsystem } from './WeaponSubsystem.js';

export class SpreadCannon extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.shotCounts = { 1: 3, 2: 5, 3: 7 };
    this.fanAngles = { 1: 10, 2: 10, 3: 10 }; // degrees between shots
    this.damageBonus = 1.0;
  }

  getBaseInterval() {
    // Same timing as main gun (MainGun drives the firing)
    return 1000 / (this.scene.playerFireRate || 1);
  }

  onLevelChanged(level) {
    this.damageBonus = level >= 3 ? 1.15 : 1.0;
  }

  update(/* time, delta */) {
    // SpreadCannon does not fire on its own timer.
    // MainGun calls fireSpread() when spreadCannonActive is true.
  }

  fire(/* time */) {
    // Not used directly; MainGun delegates to fireSpread().
  }

  /**
   * Called by MainGun when spreadCannonActive is true.
   * Fires bullets in a fan pattern centered on the aim angle.
   */
  fireSpread(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const px = player.x;
    const py = player.y;
    const shotCount = this.shotCounts[this.level] || 3;
    const angleBetweenDeg = this.fanAngles[this.level] || 10;
    const speed = 800;

    const totalDeg = (shotCount - 1) * angleBetweenDeg;
    const startDeg = -totalDeg / 2;

    const damageOverride = this.damageBonus !== 1.0
      ? this.manager.getFinalDamage(false) * this.damageBonus
      : undefined;

    for (let i = 0; i < shotCount; i++) {
      const offsetRad = ((startDeg + i * angleBetweenDeg) * Math.PI) / 180;
      const angle = aimAngle + offsetRad;

      const opts = { useMainPool: true };
      if (damageOverride !== undefined) {
        opts.damage = damageOverride;
      }

      this.spawnBullet(
        px, py,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        opts,
      );
      this.scene.scoreManager.shotsFired++;
    }

    this.scene.audio.playShoot();
  }

  onCreate() {
    // Activate spread cannon on the main gun
    const mainGun = this.manager.weapons.get('MAIN');
    if (mainGun) mainGun.spreadCannonActive = true;
  }

  onDestroy() {
    const mainGun = this.manager.weapons.get('MAIN');
    if (mainGun) mainGun.spreadCannonActive = false;
  }
}
