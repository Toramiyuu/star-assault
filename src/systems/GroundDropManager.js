import { GAME } from '../config/constants.js';

// --- Drop type definitions ---
const DROPS = {
  heart:       { color: 0xFF4444, chance: 0.05, label: 'HP',    shape: 'heart' },
  shield:      { color: 0x44FFFF, chance: 0.08, label: 'SH',    shape: 'shield' },
  bomb:        { color: 0xFF8800, chance: 0.05, label: 'BOMB',  shape: 'bomb' },
  magnet:      { color: 0x4488FF, chance: 0.04, label: 'MAG',   shape: 'magnet' },
  boost:       { color: 0xFFFF00, chance: 0.06, label: 'SPD',   shape: 'boost' },
  elite_shard: { color: 0xAA44FF, chance: 0.03, label: 'SHARD', shape: 'elite_shard' },
};

const DROP_TYPES = Object.keys(DROPS);

// --- Constants ---
const MAX_DROPS = 12;
const LIFETIME = 10000;
const FADE_TIME = 2000;
const ATTRACT_DIST = 60;
const COLLECT_DIST = 40;
const DROP_SIZE = 16;

export class GroundDropManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.drops = [];
  }

  // -----------------------------------------------------------------
  //  Spawning
  // -----------------------------------------------------------------

  trySpawnDrop(x, y, isElite = false) {
    if (this.drops.length >= MAX_DROPS) return;

    const chanceMultiplier = isElite ? 2 : 1;

    for (let i = 0; i < DROP_TYPES.length; i++) {
      const type = DROP_TYPES[i];
      const cfg = DROPS[type];

      // elite_shard only drops from elite enemies
      if (type === 'elite_shard' && !isElite) continue;

      const roll = this.random();
      if (roll < cfg.chance * chanceMultiplier) {
        // Heart: skip if player is at full HP, re-roll another type
        if (type === 'heart') {
          if (this.scene.hp >= this.scene.playerMaxHP) {
            // Re-roll: pick a random non-heart, non-elite_shard type
            const alternates = DROP_TYPES.filter(t => t !== 'heart' && (t !== 'elite_shard' || isElite));
            if (alternates.length > 0) {
              const rerolled = alternates[Math.floor(this.random() * alternates.length)];
              this._createDrop(x, y, rerolled);
              return;
            }
            return;
          }
        }

        this._createDrop(x, y, type);
        return;
      }
    }
    // No drop rolls succeeded — no drop spawned
  }

  spawnGuaranteed(x, y, type) {
    this._createDrop(x, y, type);
  }

  spawnBossDrops(x, y) {
    // Guaranteed drops
    this._createDrop(x, y - 30, 'heart');
    this._createDrop(x - 40, y, 'shield');
    this._createDrop(x + 40, y, 'bomb');

    // Cluster of 5 XP orbs, 100 XP each, spread around position
    if (this.scene.xpManager) {
      for (let i = 0; i < 5; i++) {
        const ox = (this.random() - 0.5) * 120;
        const oy = (this.random() - 0.5) * 80;
        this.scene.xpManager.spawnOrb(x + ox, y + oy, 100);
      }
    }
  }

  // -----------------------------------------------------------------
  //  Internal — create a single drop object
  // -----------------------------------------------------------------

  _createDrop(x, y, type) {
    const cfg = DROPS[type];
    if (!cfg) return;

    const gfx = this.scene.add.graphics();
    gfx.setPosition(x, y);
    gfx.setDepth(8);

    this._drawShape(gfx, cfg.shape, cfg.color);

    // Label above drop
    const label = this.scene.add.text(x, y - DROP_SIZE - 4, cfg.label, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9);

    // Pulsing tween
    this.scene.tweens.add({
      targets: gfx,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Spin tween
    this.scene.tweens.add({
      targets: gfx,
      angle: 360,
      duration: 800,
      repeat: -1,
    });

    const drop = {
      x,
      y,
      type,
      color: cfg.color,
      spawnTime: this.scene.time.now,
      gfx,
      label,
      collected: false,
    };

    this.drops.push(drop);
  }

  _drawShape(gfx, shape, color) {
    switch (shape) {
      case 'heart':
        // Filled circle, 10px radius
        gfx.fillStyle(color, 1);
        gfx.fillCircle(0, 0, 10);
        break;

      case 'shield':
        // Hexagon (6-sided polygon, radius 8)
        gfx.fillStyle(color, 1);
        gfx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const px = Math.cos(angle) * 8;
          const py = Math.sin(angle) * 8;
          if (i === 0) gfx.moveTo(px, py);
          else gfx.lineTo(px, py);
        }
        gfx.closePath();
        gfx.fillPath();
        break;

      case 'bomb':
        // Filled circle, 9px radius
        gfx.fillStyle(color, 1);
        gfx.fillCircle(0, 0, 9);
        break;

      case 'magnet':
        // Ring (strokeCircle)
        gfx.lineStyle(3, color, 1);
        gfx.strokeCircle(0, 0, 8);
        break;

      case 'boost':
        // Diamond (4 points)
        gfx.fillStyle(color, 1);
        gfx.beginPath();
        gfx.moveTo(0, -8);
        gfx.lineTo(6, 0);
        gfx.lineTo(0, 8);
        gfx.lineTo(-6, 0);
        gfx.closePath();
        gfx.fillPath();
        break;

      case 'elite_shard':
        // Triangle (3 points)
        gfx.fillStyle(color, 1);
        gfx.beginPath();
        gfx.moveTo(0, -8);
        gfx.lineTo(7, 6);
        gfx.lineTo(-7, 6);
        gfx.closePath();
        gfx.fillPath();
        break;
    }
  }

  // -----------------------------------------------------------------
  //  Update loop
  // -----------------------------------------------------------------

  update(time, delta) {
    const player = this.scene.player;
    if (!player?.active) return;

    const px = player.x;
    const py = player.y;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if (drop.collected) {
        this.drops.splice(i, 1);
        continue;
      }

      const age = time - drop.spawnTime;

      // Lifetime expired — destroy
      if (age > LIFETIME) {
        this._destroyDrop(drop);
        this.drops.splice(i, 1);
        continue;
      }

      // Fade during last FADE_TIME ms
      if (age > LIFETIME - FADE_TIME) {
        const remaining = LIFETIME - age;
        const alpha = remaining / FADE_TIME;
        drop.gfx.setAlpha(alpha);
        drop.label.setAlpha(alpha);
      }

      // Distance to player
      const dx = px - drop.x;
      const dy = py - drop.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Collection
      if (dist < COLLECT_DIST) {
        this._collectDrop(drop);
        drop.collected = true;
        this.drops.splice(i, 1);
        continue;
      }

      // Attraction — slide toward player
      if (dist < ATTRACT_DIST) {
        drop.x += dx * 0.1;
        drop.y += dy * 0.1;
        drop.gfx.setPosition(drop.x, drop.y);
        drop.label.setPosition(drop.x, drop.y - DROP_SIZE - 4);
      }
    }
  }

  // -----------------------------------------------------------------
  //  Collection effects
  // -----------------------------------------------------------------

  _collectDrop(drop) {
    const scene = this.scene;

    switch (drop.type) {
      case 'heart': {
        scene.hp = Math.min(scene.hp + 1, scene.playerMaxHP);
        scene.showFloatingText(drop.x, drop.y - 20, '+1 HP', '#44ff44');
        if (scene.hud) scene.hud.update(scene.score, scene.hp);
        break;
      }

      case 'shield': {
        scene.playerShieldCurrent = Math.min(
          scene.playerShieldCurrent + 1,
          scene.playerShield
        );
        scene.showFloatingText(drop.x, drop.y - 20, '+1 SHIELD', '#44ffff');
        if (scene.hud) scene.hud.update(scene.score, scene.hp);
        break;
      }

      case 'bomb': {
        this._playBombDrama(drop.x, drop.y);
        break;
      }

      case 'magnet': {
        // Pull all XP orbs to player instantly
        if (scene.xpManager) {
          const px = scene.player.x;
          const py = scene.player.y;
          scene.xpManager.orbGroup.getChildren().forEach(orb => {
            if (!orb.active) return;
            orb.x = px;
            orb.y = py;
            orb.setVelocity(0, 0);
          });
        }
        scene.showFloatingText(drop.x, drop.y - 20, 'MAGNET!', '#4488ff');
        break;
      }

      case 'boost': {
        // +50% fire rate for 8 seconds
        if (scene.playerStats) {
          scene.playerStats.addPercent('playerFireRate', 0.5);
          scene.time.delayedCall(8000, () => {
            scene.playerStats.removePercent('playerFireRate', 0.5);
          });
        }
        scene.showFloatingText(drop.x, drop.y - 20, 'BOOST!', '#ffff00');
        break;
      }

      case 'elite_shard': {
        scene.killStreak = (scene.killStreak || 0) + 1;
        scene.isInvulnerable = true;
        scene.time.delayedCall(500, () => {
          scene.isInvulnerable = false;
          if (scene.player?.active) scene.player.setAlpha(1);
        });
        scene.showFloatingText(drop.x, drop.y - 20, '+STREAK', '#aa44ff');
        break;
      }
    }

    // Destroy visuals
    this._destroyDrop(drop);
  }

  // -----------------------------------------------------------------
  //  Bomb drama — PRD Section 12
  // -----------------------------------------------------------------

  _playBombDrama(x, y) {
    const scene = this.scene;

    // 1. Slow-mo: timeScale 0.2 for 300ms, then restore
    scene.time.timeScale = 0.2;
    scene.time.delayedCall(300, () => {
      scene.time.timeScale = 1.0;
    });

    // 2. White flash: fullscreen rect, alpha 0.4, fade to 0
    const flash = scene.add.graphics().setDepth(400).setScrollFactor(0);
    flash.fillStyle(0xffffff, 0.4);
    flash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // 3. Expanding ring
    const ring = scene.add.graphics().setDepth(300);
    ring.setPosition(x, y);
    ring.lineStyle(4, 0xFF8800, 1);
    ring.strokeCircle(0, 0, 72); // base radius; scale tween handles expansion
    ring.setScale(0);
    scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 4. Camera shake
    scene.cameras.main.shake(400, 0.012);

    // 5. Particle burst — 16 small circles
    for (let i = 0; i < 16; i++) {
      const p = scene.add.graphics().setDepth(300);
      p.setPosition(x, y);
      const pColor = this.random() > 0.5 ? 0xFF8800 : 0xFF4400;
      p.fillStyle(pColor, 1);
      p.fillCircle(0, 0, 3);

      const angle = (Math.PI * 2 / 16) * i + (this.random() - 0.5) * 0.4;
      const speed = 80 + this.random() * 120;
      const tx = x + Math.cos(angle) * speed;
      const ty = y + Math.sin(angle) * speed;

      scene.tweens.add({
        targets: p,
        x: tx,
        y: ty,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    // 6. "BOOM!" text — bigger than normal floating text
    const boomText = scene.add.text(x, y, 'BOOM!', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#FF8800',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);

    scene.tweens.add({
      targets: boomText,
      y: y - 80,
      alpha: 0,
      duration: 1200,
      onComplete: () => boomText.destroy(),
    });

    // 7. Damage enemies within 180px
    const dmg = (scene.playerDamage || 10) * 20;
    scene.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const dx = e.x - x;
      const dy = e.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        let hp = e.getData('hp') - dmg;
        e.setData('hp', hp);

        // Knockback
        const kbAngle = Math.atan2(dy, dx);
        e.x += Math.cos(kbAngle) * 40;
        e.y += Math.sin(kbAngle) * 40;

        // Orange tint flash
        e.setTint(0xff8800);
        scene.time.delayedCall(150, () => {
          if (e.active) e.clearTint();
        });

        if (hp <= 0) {
          scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
          if (scene.xpManager) {
            const enemyType = e.getData('enemyType') || 'grunt';
            scene.xpManager.spawnOrb(e.x, e.y, scene.xpManager.getXPForEnemy(enemyType));
          }
          e.destroy();
          scene.waveManager.onEnemyRemoved();
        }
      }
    });
  }

  // -----------------------------------------------------------------
  //  Helpers
  // -----------------------------------------------------------------

  _destroyDrop(drop) {
    if (drop.gfx) {
      this.scene.tweens.killTweensOf(drop.gfx);
      drop.gfx.destroy();
      drop.gfx = null;
    }
    if (drop.label) {
      drop.label.destroy();
      drop.label = null;
    }
  }

  destroy() {
    for (const drop of this.drops) {
      this._destroyDrop(drop);
    }
    this.drops.length = 0;
  }
}
