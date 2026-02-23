import { GAME, SCORING } from "../config/constants.js";
import { WAVE_DEFINITIONS, generateEscalationWave } from "../config/waves.js";
import {
  updateZigzagger,
  updateArc,
  updateDiver,
  fireAimedBullet,
  fireFormationLeaderBurst,
} from "../entities/EnemyBehaviors.js";

const ENEMY_SCALE = 0.08;
const MINE_SCALE = 0.06;

export class WaveManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.currentWave = 0;
    this.enemiesRemaining = 0;
    this.waveActive = false;
    this.waveDamageTaken = false;
    this.spawnQueue = [];
    this.spawnTimer = null;
  }

  getWaveDef(waveNum) {
    if (waveNum <= WAVE_DEFINITIONS.length) {
      return WAVE_DEFINITIONS[waveNum - 1];
    }
    return generateEscalationWave(waveNum);
  }

  startNextWave() {
    this.currentWave++;
    this.waveDamageTaken = false;
    this.waveActive = true;
    const def = this.getWaveDef(this.currentWave);

    this.scene.hud.setWave(this.currentWave);

    const announce = this.scene.add
      .text(
        GAME.WIDTH / 2,
        GAME.HEIGHT / 2 - 100,
        def.boss ? `BOSS INCOMING` : `WAVE ${this.currentWave}`,
        {
          fontFamily: "Arial",
          fontSize: def.boss ? "72px" : "64px",
          color: def.boss ? "#ff4444" : "#ffffff",
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
      y: announce.y - 80,
      duration: 1500,
      onComplete: () => announce.destroy(),
    });

    if (def.boss) {
      this.scene.time.delayedCall(1500, () => {
        if (!this.scene.isGameOver) {
          this.scene.spawnBoss(def.boss, def.bossHP);
        }
      });
      return;
    }

    this.spawnQueue = [];
    for (const group of def.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ ...group, index: i });
      }
    }
    this.enemiesRemaining = this.spawnQueue.length;

    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [
        this.spawnQueue[j],
        this.spawnQueue[i],
      ];
    }

    if (def.mines) {
      for (let i = 0; i < def.mines; i++) {
        const delay = 2000 + this.random() * 5000;
        this.scene.time.delayedCall(delay, () => {
          if (!this.scene.isGameOver) this.spawnMine();
        });
      }
    }

    let spawnIndex = 0;
    this.spawnTimer = this.scene.time.addEvent({
      delay: 800 + this.random() * 400,
      repeat: this.spawnQueue.length - 1,
      callback: () => {
        if (this.scene.isGameOver || spawnIndex >= this.spawnQueue.length)
          return;
        this.spawnEnemyFromDef(this.spawnQueue[spawnIndex]);
        spawnIndex++;
      },
    });
  }

  spawnEnemyFromDef(def) {
    const x = this.getSpawnX(def.pattern, def.index, def.count);
    const enemy = this.scene.enemies.create(x, -80, def.type);
    enemy.setScale(ENEMY_SCALE);
    enemy.body.setSize(enemy.width * 0.6, enemy.height * 0.6);
    enemy.setData("hp", def.hp);
    enemy.setData("pattern", def.pattern);
    enemy.setData("enemyType", def.enemyType || "grunt");
    enemy.setData("speed", def.speed);
    enemy.setData("fireRate", def.fireRate + this.random() * 500);
    enemy.setData("lastFireTime", 0);
    enemy.setData("spawnTime", this.scene.time.now);
    enemy.setData("startX", x);
    enemy.setData("isElite", def.hp >= 2);
    if (def.tint) enemy.setTint(def.tint);

    this.applyMovementPattern(enemy, def.pattern, def.speed);
  }

  getSpawnX(pattern, index, count) {
    if (pattern === "flanker") {
      return this.random() < 0.5 ? -40 : GAME.WIDTH + 40;
    }
    if (pattern === "formation") {
      const spacing = (GAME.WIDTH - 200) / Math.max(count - 1, 1);
      return 100 + index * spacing;
    }
    return 80 + this.random() * (GAME.WIDTH - 160);
  }

  applyMovementPattern(enemy, pattern, speed) {
    switch (pattern) {
      case "straight":
        enemy.setVelocityY(speed);
        break;
      case "sine":
      case "zigzag":
        enemy.setVelocityY(speed * 0.8);
        break;
      case "flanker": {
        const fromLeft = enemy.x < GAME.WIDTH / 2;
        enemy.setVelocity(fromLeft ? speed * 1.2 : -speed * 1.2, speed * 0.6);
        break;
      }
      case "divebomber":
        enemy.setVelocityY(speed * 1.5);
        break;
      case "formation":
      case "arc":
        enemy.setVelocityY(speed * 0.7);
        break;
      case "diver":
        enemy.setVelocityY(50);
        break;
    }
  }

  updateEnemy(enemy, time) {
    if (!enemy.active) return;
    const pattern = enemy.getData("pattern");
    const enemyType = enemy.getData("enemyType") || "grunt";
    const speed = enemy.getData("speed");
    const elapsed = time - enemy.getData("spawnTime");

    if (pattern === "sine") {
      const startX = enemy.getData("startX");
      enemy.x = startX + Math.sin(elapsed * 0.003) * 120;
    } else if (pattern === "zigzag") {
      updateZigzagger(enemy, elapsed);
    } else if (pattern === "arc") {
      updateArc(enemy, elapsed);
    } else if (pattern === "diver") {
      updateDiver(enemy, time, this.scene);
    } else if (
      pattern === "divebomber" &&
      elapsed > 1500 &&
      enemy.body.velocity.y > 0
    ) {
      enemy.setVelocityY(-speed * 0.5);
      enemy.setData("spawnTime", time + 5000);
      this.scene.time.delayedCall(800, () => {
        if (enemy.active) enemy.setVelocityY(speed);
      });
    }

    const fireRate = enemy.getData("fireRate");
    const lastFire = enemy.getData("lastFireTime");
    if (
      time - lastFire > fireRate &&
      enemy.y > 0 &&
      enemy.y < GAME.HEIGHT * 0.7
    ) {
      enemy.setData("lastFireTime", time);
      if (enemyType === "zigzagger") {
        fireAimedBullet(this.scene, enemy);
      } else if (enemyType === "formation_leader") {
        fireFormationLeaderBurst(this.scene, enemy, time);
      } else if (enemyType !== "diver") {
        this.scene.fireEnemyBullet(enemy);
      }
    }

    if (
      enemy.y > GAME.HEIGHT + 100 ||
      enemy.x < -200 ||
      enemy.x > GAME.WIDTH + 200
    ) {
      enemy.destroy();
      this.onEnemyRemoved();
    }
  }

  onEnemyRemoved() {
    this.enemiesRemaining--;
    if (this.enemiesRemaining <= 0 && this.waveActive) {
      this.waveComplete();
    }
  }

  waveComplete() {
    this.waveActive = false;
    if (this.scene.isGameOver) return;

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

    this.scene.time.delayedCall(2000, () => {
      if (!this.scene.isGameOver) this.startNextWave();
    });
  }

  onBossDefeated() {
    this.waveActive = false;
    this.scene.time.delayedCall(2500, () => {
      if (!this.scene.isGameOver) this.startNextWave();
    });
  }

  markDamageTaken() {
    this.waveDamageTaken = true;
  }

  spawnMine() {
    const x = 80 + this.random() * (GAME.WIDTH - 160);
    const mineImg = `meteor_0${1 + Math.floor(this.random() * 6)}`;
    const mine = this.scene.enemies.create(x, -60, mineImg);
    mine.setScale(MINE_SCALE);
    mine.body.setSize(mine.width * 0.7, mine.height * 0.7);
    mine.setData("hp", 1);
    mine.setData("isMine", true);
    mine.setData("pattern", "straight");
    mine.setData("enemyType", "grunt");
    mine.setData("speed", 100);
    mine.setData("fireRate", 999999);
    mine.setData("lastFireTime", 0);
    mine.setData("spawnTime", this.scene.time.now);
    mine.setData("startX", x);
    mine.setData("isElite", false);
    mine.setVelocityY(100 + this.random() * 80);
    this.enemiesRemaining++;
  }
}
