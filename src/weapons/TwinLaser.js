import { WeaponSubsystem } from './WeaponSubsystem.js';
import { killEnemy } from '../utils/CombatUtils.js';

export class TwinLaser extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.damageMultiplier = 1.0;
    this.beamHalfWidth = 15;
  }

  getBaseInterval() {
    return 100; // Damage tick rate
  }

  onLevelChanged(level) {
    if (level >= 3) {
      this.damageMultiplier = 1.6;
      this.beamHalfWidth = 25;
    } else if (level >= 2) {
      this.damageMultiplier = 1.3;
      this.beamHalfWidth = 15;
    } else {
      this.damageMultiplier = 1.0;
      this.beamHalfWidth = 15;
    }
  }

  /** Check if a point is within beam halfwidth along the aim direction */
  _inBeam(ox, oy, tx, ty, aimCos, aimSin, halfW) {
    const dx = tx - ox;
    const dy = ty - oy;
    const dot = dx * aimCos + dy * aimSin;
    if (dot < 0) return false; // Behind the beam origin
    const perpDist = Math.abs(-dx * aimSin + dy * aimCos);
    return perpDist <= halfW;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const baseDamage = (this.scene.playerDamage || 10) * this.damageMultiplier;
    const tickDamage = baseDamage * 0.5;

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const aimCos = Math.cos(aimAngle);
    const aimSin = Math.sin(aimAngle);
    const perpCos = Math.cos(aimAngle + Math.PI / 2);
    const perpSin = Math.sin(aimAngle + Math.PI / 2);
    const halfW = this.beamHalfWidth;

    // Two beam origins offset perpendicular to aim
    const beamOrigins = [
      { x: player.x + perpCos * 25, y: player.y + perpSin * 25 },
      { x: player.x - perpCos * 25, y: player.y - perpSin * 25 },
    ];

    // Damage regular enemies in beam path
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      for (const o of beamOrigins) {
        if (this._inBeam(o.x, o.y, e.x, e.y, aimCos, aimSin, halfW)) {
          let hp = e.getData('hp') - tickDamage;
          e.setData('hp', hp);

          // Hit flash — brief white tint on beam contact
          e.setTintFill(0x88eeff);
          this.scene.time.delayedCall(40, () => {
            if (e.active) {
              if (e.getData('isElite')) {
                e.setTint(0xffd700);
              } else {
                e.clearTint();
              }
            }
          });

          if (hp <= 0) {
            killEnemy(this.scene, e);
          }
          break;
        }
      }
    });

    // Damage boss if in beam path
    const boss = this.scene.boss;
    if (boss?.active && boss.aaxBoss?.sprite?.active) {
      const bs = boss.aaxBoss.sprite;
      for (const o of beamOrigins) {
        if (this._inBeam(o.x, o.y, bs.x, bs.y, aimCos, aimSin, halfW + 40)) {
          boss.aaxBoss.hp -= tickDamage;
          if (boss.aaxBoss.hp <= 0) boss.aaxBoss.defeat();
          break;
        }
      }
    }
  }

  drawEffects(graphics, time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const perpCos = Math.cos(aimAngle + Math.PI / 2);
    const perpSin = Math.sin(aimAngle + Math.PI / 2);
    const beamLen = 2200;
    const halfW = this.beamHalfWidth;
    const pulse = 0.5 + 0.3 * Math.sin(time * 0.01);

    const endCos = Math.cos(aimAngle) * beamLen;
    const endSin = Math.sin(aimAngle) * beamLen;

    const origins = [
      { x: player.x + perpCos * 25, y: player.y + perpSin * 25 },
      { x: player.x - perpCos * 25, y: player.y - perpSin * 25 },
    ];

    for (const o of origins) {
      const ex = o.x + endCos;
      const ey = o.y + endSin;

      // Outer glow
      graphics.lineStyle(halfW * 2, 0x00ccff, pulse * 0.3);
      graphics.lineBetween(o.x, o.y, ex, ey);

      // Inner core
      graphics.lineStyle(halfW * 0.8, 0x88ddff, pulse * 0.7);
      graphics.lineBetween(o.x, o.y, ex, ey);

      // Center line
      graphics.lineStyle(2, 0xffffff, pulse * 0.5);
      graphics.lineBetween(o.x, o.y, ex, ey);

      // Spark flashes at enemy contact points
      const aimCos = Math.cos(aimAngle);
      const aimSin = Math.sin(aimAngle);
      this.scene.enemies.getChildren().forEach((e) => {
        if (!e.active) return;
        if (this._inBeam(o.x, o.y, e.x, e.y, aimCos, aimSin, halfW)) {
          const sparkSize = 6 + 4 * Math.random();
          graphics.fillStyle(0xffffff, 0.7 + 0.3 * Math.random());
          graphics.fillCircle(e.x, e.y, sparkSize);
          graphics.fillStyle(0x00ccff, 0.4);
          graphics.fillCircle(e.x, e.y, sparkSize * 2);
        }
      });
    }
  }
}
