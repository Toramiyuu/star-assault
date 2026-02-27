import { WeaponSubsystem } from './WeaponSubsystem.js';

export class MainGun extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.spreadCannonActive = false;
  }

  getBaseInterval() {
    const base = 1000 / (this.scene.playerFireRate || 1);
    if (this.manager.bulletStormActive) {
      return base / 10;
    }
    return base;
  }

  fire(time) {
    // If another weapon (TwinLaser or PhotonDevastator) overrides main gun, skip
    if (this.manager.mainGunOverride) return;

    const player = this.scene.player;
    if (!player || !player.active) return;

    // If SpreadCannon is active, delegate to its fire pattern
    if (this.spreadCannonActive) {
      const spreadCannon = this.manager.weapons.get('B01');
      if (spreadCannon) {
        spreadCannon.fireSpread(time);
        return;
      }
    }

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const speed = 800;
    const spread = this.scene.playerSpread || 1;
    const px = player.x;
    const py = player.y;

    if (spread === 1) {
      this.spawnBullet(
        px, py,
        Math.cos(aimAngle) * speed,
        Math.sin(aimAngle) * speed,
        { useMainPool: true },
      );
      this.scene.scoreManager.shotsFired++;
    } else {
      // Fan bullets around aim angle
      const fanDeg = 10; // degrees between shots
      const totalDeg = (spread - 1) * fanDeg;
      const startDeg = -totalDeg / 2;
      for (let i = 0; i < spread; i++) {
        const offsetRad = ((startDeg + i * fanDeg) * Math.PI) / 180;
        const angle = aimAngle + offsetRad;
        this.spawnBullet(
          px, py,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          { useMainPool: true },
        );
        this.scene.scoreManager.shotsFired++;
      }
    }

    this.scene.audio.playShoot();
  }
}
