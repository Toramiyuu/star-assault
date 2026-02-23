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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const PLAYER_SCALE = 0.1;
const BULLET_SCALE = 0.08;
const ENEMY_BULLET_SCALE = 0.15;

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
    this.hp = PLAYER.MAX_HP;
    this.isInvulnerable = false;
    this.isGameOver = false;
    this.godMode = false;
    this.lastFireTime = 0;
    this.touchTarget = null;
    this.shieldActive = false;

    this.audio = new AudioManager();
    this.audio.init();
    this.bg = new ScrollingBackground(this);
    this.explosions = new Explosions(this);
    this.hud = new HUD(this);
    this.boss = new BossManager(this, this.random);

    this.createPlayer();
    this.createBulletGroups();
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    this.powerups = new PowerUpManager(this, this.random);
    this.waveManager = new WaveManager(this, this.random);

    this.setupInput();
    this.setupCollisions();

    if (this.devMode) {
      this.add
        .text(8, 8, "DEV | no dmg | B=boss", {
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

  createPlayer() {
    this.player = this.physics.add.image(GAME.WIDTH / 2, 1600, "player");
    this.player.setScale(PLAYER_SCALE).setCollideWorldBounds(true).setDepth(10);
    this.player.body.setSize(this.player.width * 0.6, this.player.height * 0.7);
    this.exhaustFrame = 0;
    this.exhaustTimer = 0;
    this.exhaust = this.add.image(GAME.WIDTH / 2, 1645, "exhaust_0");
    this.exhaust.setScale(PLAYER_SCALE * 0.8).setDepth(9);
  }

  updateExhaust(delta) {
    this.exhaustTimer += delta;
    if (this.exhaustTimer > 50) {
      this.exhaustTimer = 0;
      this.exhaustFrame = (this.exhaustFrame + 1) % 10;
      this.exhaust.setTexture(`exhaust_${this.exhaustFrame}`);
    }
    this.exhaust.setPosition(this.player.x, this.player.y + 45);
  }

  createBulletGroups() {
    this.playerBullets = this.physics.add.group({
      defaultKey: "player_bullet_1",
      maxSize: 60,
      runChildUpdate: true,
    });
    this.enemyBullets = this.physics.add.group({
      defaultKey: "enemy_bullet_1",
      maxSize: 80,
      runChildUpdate: true,
    });
  }

  firePlayerBullet() {
    this.scoreManager.shotsFired++;
    const spread = this.powerups.has("spread_shot");
    const offsets = spread ? [-30, 0, 30] : [0];
    for (const ox of offsets) {
      const b = this.playerBullets.get(this.player.x + ox, this.player.y - 50);
      if (!b) continue;
      b.setActive(true).setVisible(true).setScale(BULLET_SCALE);
      b.body.enable = true;
      b.setVelocity(spread ? ox * 3 : 0, PLAYER.BULLET_SPEED);
      b.body.setSize(b.width * 0.4, b.height * 0.6);
      b.update = function () {
        if (this.y < -50) {
          this.setActive(false).setVisible(false);
          this.body.enable = false;
        }
      };
    }

    if (this.powerups.has("missile")) {
      const target = this.getClosestEnemy();
      if (target) {
        const m = this.playerBullets.get(this.player.x, this.player.y - 40);
        if (m) {
          m.setActive(true)
            .setVisible(true)
            .setScale(BULLET_SCALE * 0.8)
            .setTint(0xff4444);
          m.body.enable = true;
          const angle = Math.atan2(
            target.y - this.player.y,
            target.x - this.player.x,
          );
          m.setVelocity(Math.cos(angle) * 600, Math.sin(angle) * 600);
          m.body.setSize(m.width * 0.4, m.height * 0.6);
          m.update = function () {
            if (
              this.y < -50 ||
              this.y > GAME.HEIGHT + 50 ||
              this.x < -50 ||
              this.x > GAME.WIDTH + 50
            ) {
              this.setActive(false).setVisible(false);
              this.body.enable = false;
            }
          };
        }
      }
    }
    this.audio.playShoot();
  }

  getClosestEnemy() {
    let closest = null,
      minDist = Infinity;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = Math.abs(e.x - this.player.x) + Math.abs(e.y - this.player.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    });
    if (this.boss.active && this.boss.sprite?.active) {
      const d =
        Math.abs(this.boss.sprite.x - this.player.x) +
        Math.abs(this.boss.sprite.y - this.player.y);
      if (d < minDist) closest = this.boss.sprite;
    }
    return closest;
  }

  fireEnemyBullet(enemy) {
    const b = this.enemyBullets.get(enemy.x, enemy.y + 30);
    if (!b) return;
    b.setActive(true).setVisible(true).setScale(ENEMY_BULLET_SCALE);
    b.body.enable = true;
    b.setVelocityY(ENEMIES.BULLET_SPEED);
    b.body.setSize(b.width * 0.5, b.height * 0.5);
    b.update = function () {
      if (this.y > GAME.HEIGHT + 50) {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
      }
    };
  }

  spawnBoss(bossKey, hp) {
    this.boss.spawn(bossKey, hp);
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
    this.input.keyboard.on("keydown-B", () => {
      if (!this.isGameOver) this.skipToBoss();
    });
    this.input.keyboard.on("keydown-I", () => {
      this.godMode = !this.godMode;
      this.showFloatingText(
        GAME.WIDTH / 2,
        GAME.HEIGHT / 2,
        this.godMode ? "GOD MODE ON" : "GOD MODE OFF",
        this.godMode ? "#00ff00" : "#ff4444",
      );
    });
  }

  skipToBoss() {
    if (this.waveManager.spawnTimer) {
      this.waveManager.spawnTimer.destroy();
      this.waveManager.spawnTimer = null;
    }
    this.enemies.getChildren().forEach((e) => e.destroy());
    this.enemyBullets.getChildren().forEach((b) => {
      b.setActive(false).setVisible(false);
      b.body.enable = false;
    });
    this.waveManager.currentWave = 9;
    this.waveManager.waveActive = false;
    this.waveManager.enemiesRemaining = 0;
    this.waveManager.spawnQueue = [];
    this.waveManager.startNextWave();
  }

  handleInput(delta) {
    const speed = PLAYER.SPEED * (delta / 16) * 60;
    if (this.touchTarget) {
      const dx = this.touchTarget.x - this.player.x;
      const dy = this.touchTarget.y - 60 - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const ms = Math.min(speed, dist);
        this.player.x += (dx / dist) * ms;
        this.player.y += (dy / dist) * ms;
      }
    }
    let kbX = 0,
      kbY = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) kbX = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) kbX = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) kbY = -1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) kbY = 1;
    if (kbX || kbY) {
      const len = Math.sqrt(kbX * kbX + kbY * kbY);
      this.player.x += (kbX / len) * speed;
      this.player.y += (kbY / len) * speed;
    }
    this.player.x = clamp(this.player.x, 40, GAME.WIDTH - 40);
    this.player.y = clamp(this.player.y, 40, GAME.HEIGHT - 40);
  }

  setupCollisions() {
    this.physics.add.overlap(
      this.playerBullets,
      this.enemies,
      this.onBulletHitEnemy,
      null,
      this,
    );
    this.physics.add.overlap(
      this.enemyBullets,
      this.player,
      this.onEnemyBulletHitPlayer,
      null,
      this,
    );
    this.physics.add.overlap(
      this.enemies,
      this.player,
      this.onEnemyHitPlayer,
      null,
      this,
    );
    this.physics.add.overlap(
      this.powerups.group,
      this.player,
      this.onCollectPowerUp,
      null,
      this,
    );
  }

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
    this.scoreManager.shotsHit++;
    let hp = enemy.getData("hp") - 1;
    enemy.setData("hp", hp);
    if (hp <= 0) {
      const isMine = enemy.getData("isMine");
      const isElite = enemy.getData("isElite");
      const killType = isMine ? "mine" : isElite ? "elite" : "basic";
      const pts =
        this.scoreManager.addKill(killType) *
        this.powerups.getScoreMultiplier();
      this.score = this.scoreManager.score;
      this.explosions.play(enemy.x, enemy.y, "enemy_explosion", 9, 0.12);
      this.audio.playEnemyExplosion();
      this.cameras.main.shake(80, 0.003);
      this.showFloatingText(enemy.x, enemy.y - 30, `+${pts}`, "#ffffff");
      if (!isMine) this.powerups.tryDrop(enemy.x, enemy.y);
      enemy.destroy();
      this.waveManager.onEnemyRemoved();
    } else {
      enemy.setTint(0xff0000);
      this.time.delayedCall(80, () => {
        if (enemy.active) enemy.clearTint();
      });
    }
  }

  onEnemyBulletHitPlayer(_player, bullet) {
    if (!bullet.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
    this.damagePlayer();
  }

  onEnemyHitPlayer(_player, enemy) {
    if (!enemy.active) return;
    this.explosions.play(enemy.x, enemy.y, "enemy_explosion", 9, 0.12);
    enemy.destroy();
    this.waveManager.onEnemyRemoved();
    this.damagePlayer();
  }

  onCollectPowerUp(_player, powerup) {
    if (!powerup.active) return;
    this.powerups.collect(powerup);
    this.scoreManager.addPowerup();
    this.score = this.scoreManager.score;
  }

  damagePlayer() {
    if (this.godMode || this.isInvulnerable || this.isGameOver) return;
    if (this.powerups.useShield()) return;
    this.hp--;
    this.waveManager.markDamageTaken();
    this.audio.playPlayerHit();
    this.cameras.main.shake(150, 0.008);
    if (this.hp <= 0) {
      this.playerDeath();
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

  playerDeath() {
    this.isGameOver = true;
    this.player.setVisible(false);
    this.player.body.enable = false;
    this.exhaust.setVisible(false);
    this.audio.stopMusic();
    this.scoreManager.waveReached = this.waveManager.currentWave;
    this.explosions.play(
      this.player.x,
      this.player.y,
      "player_explosion",
      7,
      0.15,
    );
    this.cameras.main.shake(400, 0.015);
    this.time.delayedCall(2000, () => {
      const breakdown = this.scoreManager.getBreakdown();
      this.scene.start("Results", {
        breakdown,
        seed: this.registry.get("seed"),
      });
    });
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

  update(time, delta) {
    if (this.isGameOver) return;
    this.bg.update(delta);
    this.handleInput(delta);
    this.updateExhaust(delta);

    const fireRate = PLAYER.FIRE_RATE * this.powerups.getFireRate();
    if (time - this.lastFireTime > fireRate) {
      this.lastFireTime = time;
      this.firePlayerBullet();
    }

    this.boss.update(time, delta);
    this.enemies.getChildren().forEach((e) => {
      if (e.active) this.waveManager.updateEnemy(e, time);
    });

    this.powerups.update();
    this.powerups.drawGlow();
    this.hud.update(this.score, this.hp);
    this.scoreManager.scoreMultiplier = this.powerups.getScoreMultiplier();
  }
}
