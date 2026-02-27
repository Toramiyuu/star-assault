import { GAME, SCORING } from "../config/constants.js";
import { WAVE_CONFIGS, ENEMY_TYPES, generateEscalationConfig } from "../config/waves.js";
import {
  fireAimedBullet,
  fireFormationLeaderBurst,
  fireDiveSpread,
} from "../entities/EnemyBehaviors.js";

const ENEMY_SCALES = {
  grunt: 0.08,
  zigzagger: 0.09,
  diver: 0.10,
  formation_leader: 0.12,
  bomber: 0.11,
};
const DEFAULT_ENEMY_SCALE = 0.08;

// Elite spawn chance (seeded)
const ELITE_CHANCE = 0.08;

export class WaveManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.currentWave = 0;
    this.waveActive = false;
    this.waveDamageTaken = false;
    this.waveElapsed = 0;
    this.spawnElapsed = 0;
  }

  getWaveConfig() {
    if (this.currentWave <= WAVE_CONFIGS.length) {
      return WAVE_CONFIGS[this.currentWave - 1];
    }
    return generateEscalationConfig(this.currentWave);
  }

  startNextWave() {
    this.currentWave++;
    this.waveDamageTaken = false;
    this.waveActive = true;
    this.waveElapsed = 0;
    this.spawnElapsed = 0;

    const config = this.getWaveConfig();
    this.scene.hud.setWave(this.currentWave);

    // Update music phase based on wave progression
    if (!config.boss) {
      this.scene.audio.setMusicPhase(this.currentWave <= 3 ? 'cruise' : 'combat');
    }

    // Update background theme
    if (this.scene.bg?.setTheme) {
      this.scene.bg.setTheme(this.currentWave);
    }

    // Wave announcement — positioned near top, fades out after 2s
    const isBoss = !!config.boss;
    const announce = this.scene.add
      .text(
        GAME.WIDTH / 2,
        200,
        isBoss ? "BOSS INCOMING" : `WAVE ${this.currentWave}`,
        {
          fontFamily: "Arial",
          fontSize: isBoss ? "72px" : "64px",
          color: isBoss ? "#ff4444" : "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        },
      )
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
      targets: announce,
      alpha: 0,
      y: announce.y - 60,
      duration: 2000,
      onComplete: () => announce.destroy(),
    });

    // Spawn boss if boss wave
    if (config.boss) {
      this.scene.time.delayedCall(1500, () => {
        if (!this.scene.isGameOver) {
          this.scene.spawnBoss(config.boss, config.bossHP);
        }
      });
    }
  }

  update(time, delta) {
    if (!this.waveActive || this.scene.isGameOver) return;

    const config = this.getWaveConfig();

    // Wave duration check — advance to next wave (skip for boss waves with duration=0)
    this.waveElapsed += delta;
    if (config.duration > 0 && this.waveElapsed >= config.duration) {
      // Award perfect wave bonus
      if (!this.waveDamageTaken) {
        this.scene.score += SCORING.PERFECT_WAVE;
        this.scene.showFloatingText(
          GAME.WIDTH / 2,
          GAME.HEIGHT / 2,
          "PERFECT WAVE! +500",
          "#00ff00",
        );
      }
      this.scene.audio.playWaveComplete();
      this.startNextWave();
      return;
    }

    // Continuous spawning
    this.spawnElapsed += delta;
    const aliveCount = this.getAliveCount();

    // Enforce minimum alive — spawn immediately if below min
    if (aliveCount < config.minAlive) {
      this.spawnEnemy(config, time);
      this.spawnElapsed = 0;
      return;
    }

    // Regular spawn interval
    if (this.spawnElapsed >= config.spawnInterval) {
      this.spawnEnemy(config, time);
      this.spawnElapsed = 0;
    }
  }

  getAliveCount() {
    return this.scene.enemies.getChildren().filter((e) => e.active).length;
  }

  spawnEnemy(config, time) {
    const enemyTypeName = this.pickEnemyType(config.enemies);
    const typeDef = ENEMY_TYPES[enemyTypeName];
    if (!typeDef) return;

    const { x, y } = this.getEdgeSpawnPosition();
    const sprite =
      typeDef.sprites[Math.floor(this.random() * typeDef.sprites.length)];

    const enemy = this.scene.enemies.create(x, y, sprite);
    let scale = ENEMY_SCALES[enemyTypeName] || DEFAULT_ENEMY_SCALE;
    enemy.body.setSize(enemy.width * 0.6, enemy.height * 0.6);

    const hpMult = config.hpMultiplier || 1;
    let hpValue = Math.round(typeDef.hp * hpMult);
    let speed = typeDef.speed;

    // Elite check (seeded, 8% chance)
    const isElite = this.random() < ELITE_CHANCE;
    if (isElite) {
      hpValue = Math.round(hpValue * 2.5);
      speed = Math.round(speed * 1.3);
      scale *= 1.4;
      enemy.setTint(0xffd700); // golden
      enemy.setData('isElite', true);

      // Elite spawn warning flash
      const flash = this.scene.add.graphics().setDepth(15);
      flash.lineStyle(3, 0xffd700, 1);
      flash.strokeCircle(x, y, 0);
      this.scene.tweens.add({
        targets: flash,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy(),
      });

      // Elite warning text
      const warn = this.scene.add.text(x, y - 40, 'ELITE', {
        fontFamily: 'Arial', fontSize: '24px', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(200);
      this.scene.tweens.add({
        targets: warn,
        y: warn.y - 30, alpha: 0, duration: 800,
        onComplete: () => warn.destroy(),
      });
    } else {
      enemy.setData('isElite', false);
      if (typeDef.tint) { enemy.setTint(typeDef.tint); enemy.setData('baseTint', typeDef.tint); }
    }

    enemy.setScale(scale);
    enemy.setData("hp", hpValue);
    enemy.setData("maxHP", hpValue);
    enemy.setData("enemyType", enemyTypeName);
    enemy.setData("speed", speed);
    enemy.setData("damaged", false);

    // Enemy shields
    const shieldPoints = typeDef.shield || 0;
    enemy.setData("shield", shieldPoints);
    enemy.setData("maxShield", shieldPoints);

    const fireRateMult = config.fireRateMultiplier || 1;
    enemy.setData(
      "fireRate",
      typeDef.fireRate * fireRateMult + this.random() * 500,
    );
    enemy.setData("lastFireTime", 0);
    enemy.setData("spawnTime", time);

    // Diver starts in pre-lunge phase
    if (enemyTypeName === "diver") {
      enemy.setData("dived", false);
    }

    // Bomber starts not detonating
    if (enemyTypeName === "bomber") {
      enemy.setData("bomberState", "approach"); // approach -> telegraph -> detonate
      enemy.setData("telegraphStart", 0);
    }
  }

  pickEnemyType(enemies) {
    const totalWeight = enemies.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.random() * totalWeight;
    for (const e of enemies) {
      roll -= e.weight;
      if (roll <= 0) return e.type;
    }
    return enemies[enemies.length - 1].type;
  }

  getEdgeSpawnPosition() {
    const edge = Math.floor(this.random() * 4);
    const player = this.scene.player;
    let x, y;

    switch (edge) {
      case 0: // top
        x = this.random() * GAME.WIDTH;
        y = -60;
        break;
      case 1: // bottom
        x = this.random() * GAME.WIDTH;
        y = GAME.HEIGHT + 60;
        break;
      case 2: // left
        x = -60;
        y = 100 + this.random() * (GAME.HEIGHT - 200);
        break;
      case 3: // right
        x = GAME.WIDTH + 60;
        y = 100 + this.random() * (GAME.HEIGHT - 200);
        break;
      default:
        x = this.random() * GAME.WIDTH;
        y = -60;
    }

    // Never spawn within 100px of player
    if (player?.active) {
      const dist = Math.hypot(x - player.x, y - player.y);
      if (dist < 100) {
        // Push spawn point away
        const angle = Math.atan2(y - player.y, x - player.x);
        x = player.x + Math.cos(angle) * 120;
        y = player.y + Math.sin(angle) * 120;
      }
    }

    return { x, y };
  }

  updateEnemy(enemy, time) {
    if (!enemy.active) return;
    const player = this.scene.player;
    if (!player?.active) return;

    const enemyType = enemy.getData("enemyType");
    const speed = enemy.getData("speed");
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    const elapsed = time - enemy.getData("spawnTime");

    // Damaged sprite swap below 50% HP
    const hp = enemy.getData("hp");
    const maxHP = enemy.getData("maxHP");
    if (hp < maxHP * 0.5 && !enemy.getData("damaged")) {
      const key = enemy.texture.key;
      if (this.scene.textures.exists(key + '_damaged')) {
        // Preserve exact display size — _damaged PNGs may have different pixel dimensions
        const savedW = enemy.displayWidth;
        const savedH = enemy.displayHeight;
        enemy.setTexture(key + '_damaged');
        enemy.setDisplaySize(savedW, savedH);
        enemy.setData("damaged", true);
      }
    }

    // Homing movement per enemy type
    switch (enemyType) {
      case "zigzagger": {
        // Homing + perpendicular sine wave offset
        const sineOffset = Math.sin(elapsed * 0.004) * 60;
        const perpX = -Math.sin(angle) * sineOffset;
        const perpY = Math.cos(angle) * sineOffset;
        enemy.body.setVelocity(
          Math.cos(angle) * speed + perpX * 2,
          Math.sin(angle) * speed + perpY * 2,
        );
        break;
      }
      case "diver": {
        if (!enemy.getData("dived")) {
          if (elapsed > 1000) {
            // LUNGE — telegraph complete, charge at player
            enemy.setData("dived", true);
            enemy.clearTint();
            enemy.setScale(ENEMY_SCALES.diver || DEFAULT_ENEMY_SCALE);
            const dist = Math.hypot(dx, dy) || 1;
            enemy.body.setVelocity(
              (dx / dist) * speed,
              (dy / dist) * speed,
            );
            fireDiveSpread(this.scene, enemy);
          } else if (elapsed > 500) {
            // TELEGRAPH — red pulse + scale up before lunge
            enemy.setTint(0xff0000);
            const pulse = 1 + 0.15 * Math.sin(elapsed * 0.02);
            enemy.setScale((ENEMY_SCALES.diver || DEFAULT_ENEMY_SCALE) * pulse);
            enemy.body.setVelocity(Math.cos(angle) * 20, Math.sin(angle) * 20);
          } else {
            // Slow creep toward player
            enemy.body.setVelocity(Math.cos(angle) * 40, Math.sin(angle) * 40);
          }
        } else {
          // After lunge, continue homing at full speed
          enemy.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
          );
        }
        break;
      }
      case "bomber": {
        const dist = Math.hypot(dx, dy);
        const state = enemy.getData("bomberState");

        if (state === "approach") {
          // Homing toward player
          enemy.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
          );
          // When within detonation range, start telegraph
          if (dist <= 220) {
            enemy.setData("bomberState", "telegraph");
            enemy.setData("telegraphStart", time);
            enemy.body.setVelocity(0, 0);
          }
        } else if (state === "telegraph") {
          // Stop and pulse orange for 1.2s
          enemy.body.setVelocity(0, 0);
          const tElapsed = time - enemy.getData("telegraphStart");
          const pulse = 1 + 0.2 * Math.sin(tElapsed * 0.015);
          const baseScale = ENEMY_SCALES.bomber || DEFAULT_ENEMY_SCALE;
          const isElite = enemy.getData("isElite");
          enemy.setScale(baseScale * (isElite ? 1.4 : 1) * pulse);
          enemy.setTint(0xff6600);

          if (tElapsed >= 1200) {
            enemy.setData("bomberState", "detonate");
            this._bomberDetonate(enemy);
          }
        }
        // detonate state: enemy destroyed in _bomberDetonate
        break;
      }
      case "formation_leader":
        // Slow drift toward player
        enemy.body.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        );
        break;
      default:
        // Grunt: pure homing
        enemy.body.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        );
        break;
    }

    // Rotate sprite to face movement direction
    enemy.setRotation(angle + Math.PI / 2);

    // Firing logic — only fire when reasonably on-screen
    const onScreen =
      enemy.x > -40 &&
      enemy.x < GAME.WIDTH + 40 &&
      enemy.y > -40 &&
      enemy.y < GAME.HEIGHT + 40;

    // Firing — only shooters fire, grunts/divers/bombers are pure rammers
    if (onScreen && enemyType !== "grunt" && enemyType !== "diver" && enemyType !== "bomber") {
      const fireRate = enemy.getData("fireRate");
      const lastFire = enemy.getData("lastFireTime");
      if (time - lastFire > fireRate) {
        enemy.setData("lastFireTime", time);
        if (enemyType === "zigzagger") {
          fireAimedBullet(this.scene, enemy);
        } else if (enemyType === "formation_leader") {
          fireFormationLeaderBurst(this.scene, enemy, time);
        } else {
          this.scene.fireEnemyBullet(enemy);
        }
      }
    }

    // Safety cleanup: destroy enemies that somehow get very far off-screen
    const margin = 600;
    if (
      enemy.x < -margin ||
      enemy.x > GAME.WIDTH + margin ||
      enemy.y < -margin ||
      enemy.y > GAME.HEIGHT + margin
    ) {
      enemy.destroy();
    }
  }

  _bomberDetonate(enemy) {
    const scene = this.scene;
    const x = enemy.x;
    const y = enemy.y;
    const radius = 180;

    // Destroy the bomber
    scene.explosions.play(x, y, 'enemy_explosion', 9, 0.15);
    enemy.destroy();
    this.onEnemyRemoved();

    // Play bomb drama if GroundDropManager exists
    if (scene.groundDrops?._playBombDrama) {
      scene.groundDrops._playBombDrama(x, y);
    } else {
      // Fallback: simple AoE
      scene.cameras.main.shake(400, 0.012);
      const dmg = (scene.playerDamage || 10) * 20;
      scene.enemies.getChildren().forEach(e => {
        if (!e.active) return;
        const edx = e.x - x;
        const edy = e.y - y;
        if (Math.sqrt(edx * edx + edy * edy) < radius) {
          let hp = e.getData('hp') - dmg;
          e.setData('hp', hp);
          if (hp <= 0) {
            scene.explosions.play(e.x, e.y, 'enemy_explosion', 9, 0.12);
            e.destroy();
            this.onEnemyRemoved();
          }
        }
      });
    }

    // Damage player if within AoE
    if (scene.player?.active) {
      const pDist = Math.hypot(scene.player.x - x, scene.player.y - y);
      if (pDist < radius) {
        scene.damagePlayer();
      }
    }
  }

  onEnemyRemoved() {
    // In horde mode, wave advancement is time-based.
    // This method kept for compatibility with collision handlers.
  }

  onBossDefeated() {
    // After boss defeated, advance to next wave
    this.scene.time.delayedCall(2500, () => {
      if (!this.scene.isGameOver) this.startNextWave();
    });
  }

  markDamageTaken() {
    this.waveDamageTaken = true;
  }
}
