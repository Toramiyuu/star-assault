import { GAME } from '../config/constants.js';
import { MainGun } from '../weapons/MainGun.js';
import { SpreadCannon } from '../weapons/SpreadCannon.js';
import { RearGuard } from '../weapons/RearGuard.js';
import { PlasmaBurst } from '../weapons/PlasmaBurst.js';
import { SeekerDrone } from '../weapons/SeekerDrone.js';
import { TwinLaser } from '../weapons/TwinLaser.js';
import { OrbitalCannon } from '../weapons/OrbitalCannon.js';
import { BlackHole } from '../weapons/BlackHole.js';
import { WarpStrike } from '../weapons/WarpStrike.js';
import { EventHorizon } from '../weapons/EventHorizon.js';
import { PhotonDevastator } from '../weapons/PhotonDevastator.js';
import { BulletStorm } from '../weapons/BulletStorm.js';
import { NebulaRounds } from '../weapons/NebulaRounds.js';

const WEAPON_CLASSES = {
  MAIN: MainGun,
  B01: SpreadCannon,
  B02: RearGuard,
  B03: PlasmaBurst,
  B04: SeekerDrone,
  B07: NebulaRounds,
  P01: TwinLaser,
  P02: OrbitalCannon,
  P03: BlackHole,
  P08: WarpStrike,
  R01: EventHorizon,
  R02: PhotonDevastator,
  R04: BulletStorm,
};

export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.weapons = new Map();
    this.mainGunOverride = null; // 'P01' or 'R02' when active
    this.bulletStormActive = false;
    this.weaponBullets = null;
    this.aoeGraphics = null;
  }

  init() {
    // Shared bullet pool for weapon subsystems
    this.weaponBullets = this.scene.physics.add.group({
      defaultKey: 'player_bullet_1',
      maxSize: 80,
      runChildUpdate: true,
    });

    // Shared graphics for AoE/laser effects
    this.aoeGraphics = this.scene.add.graphics().setDepth(15);

    // Always start with main gun
    this.addWeapon('MAIN', 1);
  }

  addWeapon(id, level) {
    if (this.weapons.has(id)) {
      const weapon = this.weapons.get(id);
      weapon.setLevel(level);
      return;
    }

    const WeaponClass = WEAPON_CLASSES[id];
    if (!WeaponClass) return;

    const weapon = new WeaponClass(this.scene, this, id);
    weapon.setLevel(level);
    weapon.onCreate();
    this.weapons.set(id, weapon);

    // Handle main gun overrides
    if (id === 'P01' || id === 'R02') {
      this.mainGunOverride = id;
    }
    if (id === 'B01') {
      // Spread Cannon modifies main gun behavior
      const mainGun = this.weapons.get('MAIN');
      if (mainGun) mainGun.spreadCannonActive = true;
    }
  }

  removeWeapon(id) {
    const weapon = this.weapons.get(id);
    if (weapon) {
      weapon.onDestroy();
      this.weapons.delete(id);
    }
    if (this.mainGunOverride === id) {
      this.mainGunOverride = null;
    }
  }

  update(time, delta) {
    this.aoeGraphics.clear();
    for (const [id, weapon] of this.weapons) {
      weapon.update(time, delta);
      weapon.drawEffects(this.aoeGraphics, time);
    }
  }

  getCooldownMultiplier() {
    const cd = this.scene.playerCooldown || 0;
    return Math.max(0.1, 1 - cd);
  }

  calculateDamage() {
    return this.scene.playerDamage || 10;
  }

  rollCrit() {
    if (this.scene.upgradeManager) {
      return this.scene.upgradeManager.rollCrit();
    }
    return this.scene.random() < (this.scene.playerCrit || 0.05);
  }

  getFinalDamage(isCrit) {
    const base = this.calculateDamage();
    if (this.scene.upgradeManager) {
      return this.scene.upgradeManager.calculateDamage(base, isCrit);
    }
    return isCrit ? base * 2 : base;
  }

  spawnBullet(x, y, vx, vy, opts = {}) {
    const pool = opts.useMainPool ? this.scene.playerBullets : this.weaponBullets;
    const b = pool.get(x, y);
    if (!b) return null;

    b.setActive(true).setVisible(true);
    b.setScale(opts.scale || 0.08);
    b.body.enable = true;
    b.setVelocity(vx, vy);
    b.body.setSize(b.width * 0.4, b.height * 0.6);

    if (opts.tint) b.setTint(opts.tint);
    else b.clearTint();

    const isCrit = opts.isCrit !== undefined ? opts.isCrit : this.rollCrit();
    const damage = opts.damage || this.getFinalDamage(isCrit);
    const pierce = opts.pierce !== undefined ? opts.pierce : (this.scene.playerPierce || 0);

    b.setData('damage', damage);
    b.setData('isCrit', isCrit);
    b.setData('pierce', pierce);
    b.setData('pierceCount', 0);

    b.update = function () {
      if (this.y < -50 || this.y > GAME.HEIGHT + 50 || this.x < -50 || this.x > GAME.WIDTH + 50) {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
      }
    };

    return b;
  }

  getEnemiesInRadius(cx, cy, radius) {
    const result = [];
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const dx = e.x - cx;
      const dy = e.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        result.push(e);
      }
    });
    // Also check boss
    const boss = this.scene.boss;
    if (boss?.active && boss.aaxBoss?.sprite?.active) {
      const bx = boss.aaxBoss.sprite.x - cx;
      const by = boss.aaxBoss.sprite.y - cy;
      if (Math.sqrt(bx * bx + by * by) < radius) {
        result.push(boss.aaxBoss.sprite);
      }
    }
    return result;
  }

  damageEnemiesInRadius(cx, cy, radius, damage) {
    const enemies = this.getEnemiesInRadius(cx, cy, radius);
    for (const e of enemies) {
      // Check if it's a boss sprite
      if (this.scene.boss?.aaxBoss?.sprite === e) {
        this.scene.boss.aaxBoss.hp -= damage;
        if (this.scene.boss.aaxBoss.hp <= 0) {
          this.scene.boss.aaxBoss.defeat();
        }
        continue;
      }
      let hp = e.getData('hp') - damage;
      e.setData('hp', hp);
      if (hp <= 0) {
        this.scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
        this.scene.audio.playEnemyExplosion();
        const enemyType = e.getData('enemyType') || 'grunt';
        if (this.scene.xpManager) {
          this.scene.xpManager.spawnOrb(e.x, e.y, this.scene.xpManager.getXPForEnemy(enemyType));
        }
        e.destroy();
        this.scene.waveManager.onEnemyRemoved();
      }
    }
  }

  destroy() {
    for (const [id, weapon] of this.weapons) {
      weapon.onDestroy();
    }
    this.weapons.clear();
    if (this.weaponBullets) this.weaponBullets.destroy(true);
    if (this.aoeGraphics) this.aoeGraphics.destroy();
  }
}
