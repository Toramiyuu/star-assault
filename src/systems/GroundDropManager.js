import { GAME } from '../config/constants.js';

// Safe spawn area — drops outside this range can't be reached by the player
const SPAWN_X_MIN = 80;
const SPAWN_X_MAX = GAME.WIDTH - 80;   // 1000
const SPAWN_Y_MIN = 200;
const SPAWN_Y_MAX = GAME.HEIGHT - 220; // 1700

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
const MAX_DROPS   = 12;
const LIFETIME    = 10000;
const FADE_TIME   = 2000;
const ATTRACT_DIST = 60;
const COLLECT_DIST = 40;

// Bob and flicker constants
const BOB_AMPLITUDE = 8;
const BOB_SPEED     = 0.00418; // rad/ms — 1.5s full cycle (2π / 1500)
const FLICKER_START = 7000;    // ms — begin urgency flicker at 7s

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
  //  Internal — create a single drop object (sprite-based)
  // -----------------------------------------------------------------

  _createDrop(rawX, rawY, type) {
    const cfg = DROPS[type];
    if (!cfg) return;

    // Clamp to safe play area — prevent spawning in unreachable top/bottom strips
    const x = Math.max(SPAWN_X_MIN, Math.min(SPAWN_X_MAX, rawX));
    const y = Math.max(SPAWN_Y_MIN, Math.min(SPAWN_Y_MAX, rawY));

    const sprite = this.scene.add.image(x, y, `drop_${type}`);
    sprite.setDepth(8);
    // Scale to ~60 game units regardless of texture size (AI PNG ~1024px vs programmatic 80px)
    const texW = sprite.width || 80;
    sprite.setScale(60 / texW);

    const drop = {
      x,
      y,
      baseY: y,
      type,
      color: cfg.color,
      spawnTime: this.scene.time.now,
      bobPhase: this.random() * Math.PI * 2, // random phase so drops don't sync
      sprite,
      collected: false,
      attracting: false,
      sparkleTimer: 0,
    };

    this.drops.push(drop);
  }

  // -----------------------------------------------------------------
  //  Internal — destroy a single drop's sprite
  // -----------------------------------------------------------------

  _destroyDrop(drop) {
    if (drop.sprite) {
      this.scene.tweens.killTweensOf(drop.sprite);
      drop.sprite.destroy();
      drop.sprite = null;
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

      if (!drop.sprite) {
        this.drops.splice(i, 1);
        continue;
      }

      const age = time - drop.spawnTime;

      if (age > LIFETIME) {
        this._destroyDrop(drop);
        this.drops.splice(i, 1);
        continue;
      }

      // --- Alpha / flicker ---
      if (drop.attracting) {
        drop.sprite.setAlpha(1);
      } else if (age > FLICKER_START) {
        const urgencyT = (age - FLICKER_START) / (LIFETIME - FLICKER_START);
        const freq = 0.01 + urgencyT * 0.04;
        drop.sprite.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(time * freq)));
      } else if (age > LIFETIME - FADE_TIME) {
        drop.sprite.setAlpha((LIFETIME - age) / FADE_TIME);
      } else {
        drop.sprite.setAlpha(1);
      }

      // --- Distance ---
      const dx = px - drop.x;
      const dy = py - drop.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < COLLECT_DIST) {
        this._collectDrop(drop);
        drop.collected = true;
        this.drops.splice(i, 1);
        continue;
      }

      if (dist < ATTRACT_DIST) {
        drop.attracting = true;
        drop.x += dx * 0.1;
        drop.y += dy * 0.1;
        drop.sprite.setPosition(drop.x, drop.y);
      } else {
        // Sinusoidal bob — stopped when attracting
        const bobY = drop.baseY + BOB_AMPLITUDE * Math.sin(time * BOB_SPEED + drop.bobPhase);
        drop.sprite.setPosition(drop.x, bobY);

        // EliteShard sparkles while idle
        if (drop.type === 'elite_shard') {
          this._updateEliteShardSparkle(drop, delta);
        }
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
        if (scene.hud) scene.hud.update(scene.score, scene.hp);
        break;
      }

      case 'shield': {
        scene.playerShieldCurrent = Math.min(
          scene.playerShieldCurrent + 1,
          scene.playerShield
        );
        if (scene.hud) scene.hud.update(scene.score, scene.hp);
        break;
      }

      case 'bomb': {
        // Bomb drama is the feedback — skip collect burst; destroy sprite immediately
        if (drop.sprite) { drop.sprite.destroy(); drop.sprite = null; }
        this._playBombDrama(drop.x, drop.y);
        return; // early return — sprite already gone, skip _playCollectBurst below
      }

      case 'magnet': {
        // Tween all orbs toward player so they visibly rush in (no instant teleport)
        if (scene.xpManager && scene.xpManager.orbs) {
          const px = scene.player.x;
          const py = scene.player.y;
          scene.xpManager.orbs.forEach((orb, i) => {
            if (orb.magnetized) return;
            orb.magnetized = true;
            scene.tweens.add({
              targets: orb,
              x: px,
              y: py,
              duration: 700,
              delay: i * 35,
              ease: 'Cubic.easeIn',
            });
          });
        }
        if (drop.sprite) { drop.sprite.destroy(); drop.sprite = null; }
        this._playMagnetPulse(scene.player.x, scene.player.y);
        return; // skip _playCollectBurst — pulse ring is the feedback
      }

      case 'boost': {
        if (scene.playerStats) {
          scene.playerStats.addPercent('playerFireRate', 0.5);
          scene.time.delayedCall(8000, () => {
            scene.playerStats.removePercent('playerFireRate', 0.5);
          });
        }
        break;
      }

      case 'elite_shard': {
        scene.killStreak = (scene.killStreak || 0) + 1;
        scene.isInvulnerable = true;
        scene.time.delayedCall(500, () => {
          scene.isInvulnerable = false;
          if (scene.player?.active) scene.player.setAlpha(1);
        });
        break;
      }
    }

    // Collect burst for all non-bomb drops
    this._playCollectBurst(drop.sprite);
    drop.sprite = null; // burst tween owns the sprite now
  }

  // -----------------------------------------------------------------
  //  Collect burst — scale 1→1.5x + white flash + fade
  // -----------------------------------------------------------------

  _playCollectBurst(sprite) {
    if (!sprite) return;
    this.scene.tweens.killTweensOf(sprite);
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 0.09,
      scaleY: 0.09,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        sprite.setTint(0xffffff);
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: 100,
          onComplete: () => sprite.destroy(),
        });
      },
    });
  }

  // -----------------------------------------------------------------
  //  Magnet pulse — cyan rings expand from player + floating text
  // -----------------------------------------------------------------

  _playMagnetPulse(x, y) {
    const scene = this.scene;

    const makeRing = (delay, radius, color, alpha, duration) => {
      const ring = scene.add.graphics().setDepth(20);
      ring.lineStyle(3, color, alpha);
      ring.strokeCircle(0, 0, radius);
      ring.setPosition(x, y);
      scene.tweens.add({
        targets: ring,
        scaleX: 7, scaleY: 7,
        alpha: 0,
        duration,
        delay,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    };

    makeRing(0,   45, 0x00DDFF, 0.9, 550);
    makeRing(120, 45, 0x44AAFF, 0.6, 450);
    makeRing(240, 45, 0x0088CC, 0.4, 380);

    const txt = scene.add.text(x, y - 50, 'MAGNET!', {
      fontFamily: 'Arial',
      fontSize: '34px',
      color: '#00DDFF',
      fontStyle: 'bold',
      stroke: '#003366',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21);
    scene.tweens.add({
      targets: txt,
      y: y - 130,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  // -----------------------------------------------------------------
  //  EliteShard sparkle — 1 purple/gold particle every 300ms while idle
  // -----------------------------------------------------------------

  _updateEliteShardSparkle(drop, delta) {
    drop.sparkleTimer += delta;
    if (drop.sparkleTimer < 300) return;
    drop.sparkleTimer = 0;

    const originX = drop.x;
    const originY = drop.sprite ? drop.sprite.y : drop.y;
    const angle   = this.random() * Math.PI * 2;
    const radius  = 20 + this.random() * 20;
    const tx      = originX + Math.cos(angle) * radius;
    const ty      = originY + Math.sin(angle) * radius;
    const color   = this.random() > 0.5 ? 0xAA44FF : 0xFFCC00;

    const p = this.scene.add.graphics().setDepth(9);
    p.setPosition(originX, originY);
    p.fillStyle(color, 0.9);
    p.fillCircle(0, 0, 3); // draw at (0,0) relative to Graphics position

    this.scene.tweens.add({
      targets: p,
      x: tx,
      y: ty,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 500 + this.random() * 300,
      ease: 'Quad.easeOut',
      onComplete: () => p.destroy(),
    });
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
  //  Cleanup
  // -----------------------------------------------------------------

  destroy() {
    for (const drop of this.drops) {
      this._destroyDrop(drop);
    }
    this.drops.length = 0;
  }
}
