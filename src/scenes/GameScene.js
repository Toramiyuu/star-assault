import { Scene } from "phaser";
import { GAME, PLAYER, ENEMIES } from "../config/constants.js";
import { ScrollingBackground } from "../systems/ScrollingBackground.js";
import { HUD } from "../systems/HUD.js";
import { Explosions } from "../systems/Explosions.js";
import { WaveManager } from "../systems/WaveManager.js";
import { PowerUpManager } from "../systems/PowerUpManager.js";
import { ScoreManager } from "../systems/ScoreManager.js";
import { AudioManager } from "../systems/AudioManager.js";
import { BossManager } from "../systems/BossManager.js";
import { createSeededRandom } from "../systems/SeededRandom.js";
import {
  createPlayer,
  updateExhaust,
  handleInput,
  playerDeath,
  getClosestEnemy,
} from "./GameScenePlayer.js";
import { setupCollisions } from "./GameSceneCollisions.js";
import { handleDevKey } from "./GameSceneDevTools.js";
import { PlayerStats } from "../systems/PlayerStats.js";
import { XPManager } from "../systems/XPManager.js";
import { UpgradeManager } from "../systems/UpgradeManager.js";
import { WeaponManager } from "../systems/WeaponManager.js";
import { GroundDropManager } from "../systems/GroundDropManager.js";

const ENEMY_BULLET_SCALE = 0.15;

// Shield recharge constants
const SHIELD_RECHARGE_COOLDOWN = 4000; // 4s after last damage
const SHIELD_RECHARGE_RATE = 1000; // 1 charge per second

export class GameScene extends Scene {
  constructor() {
    super("Game");
  }

  create(data) {
    const seed = data?.seed || "starassault-default";
    this.random = createSeededRandom(seed);
    this.devMode = data?.dev || false;

    this.scoreManager = new ScoreManager();
    this.score = 0;
    this.isInvulnerable = false;
    this.isGameOver = false;
    this.godMode = false;
    this.cutscenePlaying = false;
    this.lastFireTime = 0;
    this.touchTarget = null;
    this.shieldActive = false;

    // Upgrade system
    this.playerStats = new PlayerStats(this);
    this.xpManager = new XPManager(this, this.random);
    this.upgradeManager = new UpgradeManager(this, this.random);
    this.weaponManager = new WeaponManager(this);
    this.upgradePaused = false;

    // HP uses playerCurrentHP from PlayerStats reset
    this.hp = this.playerCurrentHP || this.playerMaxHP || 5;

    // Shield recharge state
    this.shieldDamageCooldown = 0; // ms since last damage
    this.shieldRechargeTimer = 0;
    this.shieldRecharging = false;

    this.audio = new AudioManager();
    this.audio.init(this);
    this.bg = new ScrollingBackground(this);
    this.explosions = new Explosions(this);
    this.hud = new HUD(this);
    this.boss = new BossManager(this, this.random);

    createPlayer(this);
    this.createBulletGroups();
    this.weaponManager.init();
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    this.powerups = new PowerUpManager(this, this.random);
    this.waveManager = new WaveManager(this, this.random);
    this.groundDrops = new GroundDropManager(this, this.random);

    this.setupInput();
    setupCollisions(this);
    this.enemyHPBars = this.add.graphics().setDepth(50);

    if (this.devMode) {
      this.godMode = true;
      this.add
        .text(8, 8, "DEV  I=god  B=boss  N=next  K=kill  U=lvlup  X=+50xp", {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#ff4444",
        })
        .setDepth(500)
        .setScrollFactor(0);
    }

    this.showCountdown(() => {
      this.audio.resume();
      this.audio.startMusic();
      this.waveManager.startNextWave();
    });
  }

  showCountdown(onComplete) {
    let count = 3;
    const txt = this.add
      .text(GAME.WIDTH / 2, GAME.HEIGHT / 2, "3", {
        fontFamily: "Arial",
        fontSize: "120px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(300);

    const timer = this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          txt.setText(String(count));
        } else if (count === 0) {
          txt.setText("GO!");
          txt.setColor("#ffcc00");
        } else {
          txt.destroy();
          timer.destroy();
          onComplete();
        }
      },
    });
  }

  createBulletGroups() {
    this.playerBullets = this.physics.add.group({
      defaultKey: "player_bullet_1",
      maxSize: 100,
      runChildUpdate: true,
    });
    this.enemyBullets = this.physics.add.group({
      defaultKey: "enemy_bullet_1",
      maxSize: 80,
      runChildUpdate: true,
    });
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
    });
    this.input.on("pointerdown", (p) => {
      this.touchTarget = { x: p.x, y: p.y };
      this.audio.resume();
    });
    this.input.on("pointermove", (p) => {
      if (p.isDown) this.touchTarget = { x: p.x, y: p.y };
    });
    this.input.on("pointerup", () => {
      this.touchTarget = null;
    });
    this._devKeyState = {};
    this._onDevKeyDown = (e) => {
      const key = e.key.toUpperCase();
      if (!this._devKeyState[key]) {
        this._devKeyState[key] = true;
        handleDevKey(this, key);
      }
    };
    this._onDevKeyUp = (e) => {
      this._devKeyState[e.key.toUpperCase()] = false;
    };
    window.addEventListener("keydown", this._onDevKeyDown);
    window.addEventListener("keyup", this._onDevKeyUp);
  }

  spawnBoss(bossKey, hp, instant) {
    this.boss.spawn(bossKey, hp, instant);
  }

  fireEnemyBullet(enemy) {
    const b = this.enemyBullets.get(enemy.x, enemy.y);
    if (!b) return;
    b.setActive(true).setVisible(true).setScale(ENEMY_BULLET_SCALE).setTintFill(0xff4444);
    b.body.enable = true;
    // Aim toward player
    const player = this.player;
    if (player?.active) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      b.setVelocity(
        Math.cos(angle) * ENEMIES.BULLET_SPEED,
        Math.sin(angle) * ENEMIES.BULLET_SPEED,
      );
    } else {
      b.setVelocityY(ENEMIES.BULLET_SPEED);
    }
    b.body.setSize(b.width * 0.5, b.height * 0.5);
    b.update = function () {
      if (
        this.y > GAME.HEIGHT + 50 ||
        this.y < -50 ||
        this.x < -50 ||
        this.x > GAME.WIDTH + 50
      ) {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
      }
    };
  }

  damagePlayer() {
    if (
      this.godMode ||
      this.isInvulnerable ||
      this.isGameOver ||
      this.cutscenePlaying
    )
      return;

    // Reset shield recharge cooldown on any damage
    this.shieldDamageCooldown = 0;
    this.shieldRechargeTimer = 0;
    this.shieldRecharging = false;

    // Reset kill streak
    if (this.killStreak > 0) {
      this.showFloatingText(this.player.x, this.player.y - 80, 'STREAK BROKEN', '#999999');
      this.killStreak = 0;
      this.killStreakBonus = 0;
    }

    if (this.playerShieldCurrent > 0) {
      this.playerShieldCurrent--;
      this.showFloatingText(this.player.x, this.player.y - 60, 'BLOCKED!', '#44ffff');
      this.audio.playShieldHit();

      // Camera shake on shield hit
      this.cameras.main.shake(180, 0.004);

      // Shield break effects
      if (this.playerShieldCurrent <= 0) {
        this.showFloatingText(this.player.x, this.player.y - 90, 'SHIELD DOWN!', '#ff4444');
        this.audio.playShieldBreak();
        // Brief white flash
        const flash = this.add.graphics().setDepth(400).setScrollFactor(0);
        flash.fillStyle(0xffffff, 0.15);
        flash.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        this.time.delayedCall(60, () => flash.destroy());

        // Pulsar Shield burst on shield break
        if (this.upgradeManager?.pulsarBurstDamage > 0) {
          const burstDmg = this.upgradeManager.pulsarBurstDamage;
          const radius = 150 * (this.playerBlastArea || 1);
          this.weaponManager?.damageEnemiesInRadius(this.player.x, this.player.y, radius, burstDmg);
          this.explosions.play(this.player.x, this.player.y, 'enemy_explosion', 9, 0.15);
        }
      }
      return;
    }
    if (this.powerups.useShield()) return;

    // Quantum Phase: extended invulnerability
    if (this.upgradeManager?.quantumPhaseTime > 0) {
      this.isInvulnerable = true;
      const phaseTime = this.upgradeManager.quantumPhaseTime;
      this.time.delayedCall(phaseTime, () => {
        this.isInvulnerable = false;
        if (this.player?.active) this.player.setAlpha(1);
      });
    }

    this.hp--;
    this.waveManager.markDamageTaken();
    this.audio.playPlayerHit();
    this.cameras.main.shake(180, 0.004);

    // Red edge vignette
    const vignette = this.add.graphics().setDepth(399).setScrollFactor(0);
    vignette.fillStyle(0xff0000, 0.12);
    vignette.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    this.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: 200,
      onComplete: () => vignette.destroy(),
    });

    if (this.hp <= 0) {
      if (this.upgradeManager?.checkUndying()) {
        this.player.setVisible(true);
        this.player.body.enable = true;
        return;
      }
      playerDeath(this);
      return;
    }
    this.isInvulnerable = true;
    this.tweens.add({
      targets: this.player,
      alpha: { from: 0.2, to: 1 },
      duration: 150,
      repeat: Math.floor(PLAYER.INVULNERABILITY_DURATION / 300),
      onComplete: () => {
        this.isInvulnerable = false;
        this.player.setAlpha(1);
      },
    });
  }

  updateShieldRecharge(delta) {
    // No shield regen if shield is full or max shield is 0
    if (this.playerShield <= 0) return;
    if (this.playerShieldCurrent >= this.playerShield) {
      this.shieldRecharging = false;
      return;
    }

    this.shieldDamageCooldown += delta;

    // Wait for cooldown before recharging
    if (this.shieldDamageCooldown < SHIELD_RECHARGE_COOLDOWN) {
      this.shieldRecharging = false;
      return;
    }

    this.shieldRecharging = true;
    this.shieldRechargeTimer += delta;

    if (this.shieldRechargeTimer >= SHIELD_RECHARGE_RATE) {
      this.shieldRechargeTimer -= SHIELD_RECHARGE_RATE;
      this.playerShieldCurrent = Math.min(
        this.playerShieldCurrent + 1,
        this.playerShield
      );
      this.audio.playShieldRecharge();
      if (this.hud) this.hud.update(this.score, this.hp);
    }
  }

  showFloatingText(x, y, text, color) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "Arial",
        fontSize: "32px",
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      onComplete: () => t.destroy(),
    });
  }

  drawEnemyHealthBars() {
    // Must redraw every frame — enemies move, so bar positions change even when HP doesn't.
    this.enemyHPBars.clear();
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const hp = e.getData('hp');
      const maxHP = e.getData('maxHP');
      if (!maxHP || hp <= 0) return;
      const ratio = Math.max(0, hp / maxHP);
      const barW = 50;
      const barH = 5;
      const x = e.x - barW / 2;
      let y = e.y - 45;

      // Draw shield bar above health bar for shielded enemies
      const shield = e.getData('shield') || 0;
      const maxShield = e.getData('maxShield') || 0;
      if (maxShield > 0) {
        const shieldBarH = 4;
        const shieldY = y - shieldBarH - 2;
        // Shield background
        this.enemyHPBars.fillStyle(0x000000, 0.5);
        this.enemyHPBars.fillRect(x - 1, shieldY - 1, barW + 2, shieldBarH + 2);
        // Shield pips
        if (shield > 0) {
          const pipW = (barW / maxShield) - 1;
          for (let i = 0; i < shield; i++) {
            this.enemyHPBars.fillStyle(0x44ffff, 0.9);
            this.enemyHPBars.fillRect(x + i * (pipW + 1), shieldY, pipW, shieldBarH);
          }
        }
      }

      // Health bar background
      this.enemyHPBars.fillStyle(0x000000, 0.5);
      this.enemyHPBars.fillRect(x - 1, y - 1, barW + 2, barH + 2);
      const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
      this.enemyHPBars.fillStyle(color, 0.9);
      this.enemyHPBars.fillRect(x, y, barW * ratio, barH);
    });
  }

  shutdown() {
    if (this._onDevKeyDown) {
      window.removeEventListener("keydown", this._onDevKeyDown);
      window.removeEventListener("keyup", this._onDevKeyUp);
    }
  }

  updateAimAngle() {
    if (!this.player?.active) return;
    const closest = getClosestEnemy(this);
    if (closest) {
      this.aimAngle = Math.atan2(
        closest.y - this.player.y,
        closest.x - this.player.x,
      );
    } else {
      this.aimAngle = -Math.PI / 2; // straight up
    }
    // Ship stays upright — no rotation. Weapons aim via aimAngle independently.
  }

  update(time, delta) {
    if (this.isGameOver) return;
    if (this.upgradePaused) return;
    this.bg.update(delta);
    handleInput(this, delta);
    updateExhaust(this, delta);
    this.updateAimAngle();

    if (!this.cutscenePlaying) {
      this.weaponManager.update(time, delta);
    }

    this.waveManager.update(time, delta);
    this.boss.update(time, delta);
    this.enemies.getChildren().forEach((e) => {
      if (e.active) this.waveManager.updateEnemy(e, time);
    });

    // Shield recharge
    this.updateShieldRecharge(delta);

    // Ground drops
    if (this.groundDrops) {
      this.groundDrops.update(time, delta);
    }

    this.drawEnemyHealthBars();
    this.hud.update(this.score, this.hp);
    this.xpManager.update(time, delta);
    this.hud.updateStreak(this.killStreak || 0);
    if (this.upgradeManager) {
      this.upgradeManager.updateVoidShield(delta);
    }
    if (this.hud.updateXPBar && this.xpManager) {
      this.hud.updateXPBar(this.xpManager.xp, this.xpManager.getThreshold(), this.xpManager.level);
    }

    // Kill streak bonus: fire rate boost
    this.killStreakBonus = Math.min(0.5, (this.killStreak || 0) * 0.025);
  }
}
