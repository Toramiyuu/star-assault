import { WeaponSubsystem } from './WeaponSubsystem.js';
import { killEnemy } from '../utils/CombatUtils.js';

export class PhotonDevastator extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.lastBeamTime = 0;
    this.beamDuration = 300;
  }

  getBaseInterval() {
    if (this.level >= 3) return 2000;
    if (this.level >= 2) return 2500;
    return 3000;
  }

  fire(time) {
    const player = this.scene.player;
    if (!player || !player.active) return;

    this.lastBeamTime = time;

    const baseDamage = this.scene.playerDamage || 10;
    let damage = baseDamage * 3;
    if (this.level >= 2) damage *= 1.5;

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const aimCos = Math.cos(aimAngle);
    const aimSin = Math.sin(aimAngle);
    const beamHalfW = 120; // Wide devastation beam

    // Damage all enemies in beam path (wide cone in aim direction)
    const enemies = this.scene.enemies.getChildren();
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dot = dx * aimCos + dy * aimSin;
      if (dot < 0) continue; // Behind player relative to aim
      const perpDist = Math.abs(-dx * aimSin + dy * aimCos);
      if (perpDist <= beamHalfW) {
        let hp = e.getData('hp') - damage;
        e.setData('hp', hp);
        if (hp <= 0) {
          killEnemy(this.scene, e);
        }
      }
    }

    // Also damage boss
    const boss = this.scene.boss;
    if (boss?.active && boss.aaxBoss?.sprite?.active) {
      const bs = boss.aaxBoss.sprite;
      const dx = bs.x - player.x;
      const dy = bs.y - player.y;
      const dot = dx * aimCos + dy * aimSin;
      if (dot > 0) {
        const perpDist = Math.abs(-dx * aimSin + dy * aimCos);
        if (perpDist <= beamHalfW + 60) {
          boss.aaxBoss.hp -= damage;
          if (boss.aaxBoss.hp <= 0) boss.aaxBoss.defeat();
        }
      }
    }
  }

  drawEffects(graphics, time) {
    if (!this.active) return;

    const elapsed = time - this.lastBeamTime;
    if (elapsed > this.beamDuration || this.lastBeamTime === 0) return;

    const player = this.scene.player;
    if (!player || !player.active) return;

    const aimAngle = this.scene.aimAngle ?? -Math.PI / 2;
    const progress = elapsed / this.beamDuration;
    const alpha = 1 - progress;
    const beamLen = 2200;
    const ex = player.x + Math.cos(aimAngle) * beamLen;
    const ey = player.y + Math.sin(aimAngle) * beamLen;

    // Wide devastation beam
    graphics.lineStyle(240, 0xffff44, alpha * 0.2);
    graphics.lineBetween(player.x, player.y, ex, ey);

    graphics.lineStyle(60, 0xffffff, alpha * 0.6);
    graphics.lineBetween(player.x, player.y, ex, ey);

    graphics.lineStyle(8, 0xffffaa, alpha * 0.9);
    graphics.lineBetween(player.x, player.y, ex, ey);

    // Side flare lines
    const perpCos = Math.cos(aimAngle + Math.PI / 2);
    const perpSin = Math.sin(aimAngle + Math.PI / 2);
    for (const sign of [-1, 1]) {
      const sx = player.x + perpCos * sign * 50;
      const sy = player.y + perpSin * sign * 50;
      const fex = sx + Math.cos(aimAngle) * beamLen;
      const fey = sy + Math.sin(aimAngle) * beamLen;
      graphics.lineStyle(10, 0xffdd00, alpha * 0.3);
      graphics.lineBetween(sx, sy, fex, fey);
    }
  }

  onCreate() {
    this.manager.mainGunOverride = 'R02';
  }

  onDestroy() {
    if (this.manager.mainGunOverride === 'R02') {
      this.manager.mainGunOverride = null;
    }
  }
}
