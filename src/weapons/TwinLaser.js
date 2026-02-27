import { WeaponSubsystem } from './WeaponSubsystem.js';
import { killEnemy, flashEnemy } from '../utils/CombatUtils.js';

export class TwinLaser extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.damageMultiplier = 1.0;
    this.beamHalfWidth = 15;
    this._lingerTarget = null; // Stores kill position for 100ms glow linger after enemy dies
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

          // Hit flash — cyan tint, timer-gated so rapid ticks don't stack
          flashEnemy(this.scene, e, 0x88eeff, 40);

          if (hp <= 0) {
            // Kill linger: store position for ~100ms glow in drawEffects, then fire killEnemy
            this._lingerTarget = { x: e.x, y: e.y, endTime: this.scene.time.now + 100 };
            const capturedE = e;
            this.scene.time.delayedCall(100, () => {
              killEnemy(this.scene, capturedE);
              if (this._lingerTarget && this._lingerTarget.endTime <= this.scene.time.now + 10) {
                this._lingerTarget = null;
              }
            });
            // Mark HP 0 to prevent re-processing on next tick
            e.setData('hp', 0);
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

    const aimCos = Math.cos(aimAngle);
    const aimSin = Math.sin(aimAngle);

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

    // Cyan pulsing glow ring on enemies in beam path (POL-03)
    // Drawn outside the origins loop so each enemy gets one ring regardless of how many beams hit it
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      for (const o of origins) {
        if (this._inBeam(o.x, o.y, e.x, e.y, aimCos, aimSin, halfW)) {
          const glowPulse = 0.4 + 0.3 * Math.sin(time * 0.015);
          // Outer glow ring — pulsing cyan
          graphics.lineStyle(8, 0x00eeff, glowPulse);
          graphics.strokeCircle(e.x, e.y, 34);
          // Inner highlight — dimmer white
          graphics.lineStyle(3, 0xffffff, glowPulse * 0.6);
          graphics.strokeCircle(e.x, e.y, 28);
          break; // Only draw once per enemy regardless of which beam origin hits it
        }
      }
    });

    // Draw linger glow at stored kill position for 100ms after kill (enemy "cooked" effect)
    if (this._lingerTarget) {
      const lt = this._lingerTarget;
      if (this.scene.time.now <= lt.endTime) {
        const glowPulse = 0.6 + 0.4 * Math.sin(time * 0.025);
        graphics.lineStyle(12, 0x00eeff, glowPulse);
        graphics.strokeCircle(lt.x, lt.y, 38);
        graphics.lineStyle(4, 0xffffff, glowPulse * 0.8);
        graphics.strokeCircle(lt.x, lt.y, 30);
      } else {
        this._lingerTarget = null;
      }
    }
  }
}
