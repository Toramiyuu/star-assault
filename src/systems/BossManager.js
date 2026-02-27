import { GAME } from "../config/constants.js";
import { AAXBoss } from "../entities/AAXBoss.js";
import { triggerVictory } from "../scenes/GameScenePlayer.js";

const BOSS_SCALE = 0.5;
const ENEMY_BULLET_SCALE = 0.15;

export class BossManager {
  constructor(scene, random) {
    this.scene = scene;
    this.random = random;
    this.sprite = null;
    this.hp = 0;
    this.maxHP = 0;
    this.phase = 1;
    this.active = false;
    this.fireTimer = null;
    this.aaxBoss = null;
  }

  spawn(bossKey, hp, instant) {
    // Switch to epic boss music
    this.scene.audio.setMusicPhase('boss');

    if (bossKey === "boss_aax") {
      this.aaxBoss = new AAXBoss(this.scene, this.random, this);
      this.aaxBoss.spawn(hp, instant);
      this.active = true;
      return;
    }

    const scene = this.scene;
    this.active = true;
    this.hp = hp;
    this.maxHP = hp;
    this.phase = 1;
    this.sprite = scene.physics.add.image(GAME.WIDTH / 2, -200, bossKey);
    this.sprite.setScale(BOSS_SCALE).setDepth(12);
    this.sprite.body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);

    scene.tweens.add({
      targets: this.sprite,
      y: 250,
      duration: 2000,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.sprite) this.sprite.setVisible(true).setActive(true);
        this.startAttack();
      },
    });

    scene.hud.showBossHP(this.hp, this.maxHP);
    scene.physics.add.overlap(
      scene.playerBullets,
      this.sprite,
      null,
      (a, b) => {
        const bullet = a.texture?.key?.startsWith("boss_") ? b : a;
        this.onBulletHit(bullet);
        return false;
      },
      this,
    );
    scene.physics.add.overlap(
      this.sprite,
      scene.player,
      null,
      () => {
        scene.damagePlayer();
        return false;
      },
      this,
    );
  }

  update(time, delta) {
    if (this.aaxBoss?.active) {
      this.aaxBoss.update(time, delta);
      this.sprite = this.aaxBoss.sprite;
    }
  }

  onAAXBossDefeated() {
    this.active = false;
    this.aaxBoss = null;
    this.sprite = null;
    triggerVictory(this.scene);
  }

  startAttack() {
    if (!this.active || this.scene.isGameOver) return;
    const delay = this.phase === 3 ? 600 : this.phase === 2 ? 900 : 1200;
    this.fireTimer = this.scene.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        if (!this.active || this.scene.isGameOver) return;
        this.fireBullets();
      },
    });

    this.scene.tweens.add({
      targets: this.sprite,
      x: { from: 200, to: GAME.WIDTH - 200 },
      duration: 3000 / this.phase,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  fireBullets() {
    if (!this.sprite?.active) return;
    const scene = this.scene;
    const bx = this.sprite.x;
    const by = this.sprite.y + 80;

    if (this.phase >= 1) {
      scene.fireEnemyBullet({ x: bx, y: by });
    }
    if (this.phase >= 2) {
      scene.fireEnemyBullet({ x: bx - 60, y: by });
      scene.fireEnemyBullet({ x: bx + 60, y: by });
    }
    if (this.phase >= 3) {
      const angle = Math.atan2(scene.player.y - by, scene.player.x - bx);
      const b = scene.enemyBullets.get(bx, by);
      if (b) {
        b.setActive(true)
          .setVisible(true)
          .setScale(ENEMY_BULLET_SCALE * 1.3)
          .setTintFill(0xff0000);
        b.body.enable = true;
        b.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
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
      // Grunt harassment during boss fight is handled by WaveManager's
      // continuous spawning system (boss wave configs include minAlive grunts)
    }
  }

  onBulletHit(bullet) {
    if (!this.active || !bullet.active) return;
    const scene = this.scene;
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
    scene.scoreManager.shotsHit++;
    this.hp--;

    const ratio = this.hp / this.maxHP;
    if (ratio <= 0.33 && this.phase < 3) {
      this.phase = 3;
      scene.cameras.main.shake(300, 0.01);
      scene.showFloatingText(GAME.WIDTH / 2, 400, "PHASE 3!", "#ff0000");
      if (this.fireTimer) this.fireTimer.destroy();
      this.startAttack();
    } else if (ratio <= 0.66 && this.phase < 2) {
      this.phase = 2;
      scene.cameras.main.shake(200, 0.008);
      scene.showFloatingText(GAME.WIDTH / 2, 400, "PHASE 2!", "#ff8800");
      if (this.fireTimer) this.fireTimer.destroy();
      this.startAttack();
    }

    scene.hud.showBossHP(this.hp, this.maxHP);
    this.sprite.setTint(0xff0000);
    scene.time.delayedCall(50, () => {
      if (this.sprite?.active) this.sprite.clearTint();
    });

    if (this.hp <= 0) this.defeat();
  }

  defeat() {
    const scene = this.scene;
    this.active = false;
    if (this.fireTimer) this.fireTimer.destroy();
    const pts = scene.scoreManager.addBossKill(scene.waveManager.currentWave);
    scene.score = scene.scoreManager.score;
    scene.explosions.play(
      this.sprite.x,
      this.sprite.y,
      "player_explosion",
      7,
      0.3,
    );
    scene.cameras.main.shake(500, 0.02);
    scene.audio.playBossExplosion();
    scene.showFloatingText(
      this.sprite.x,
      this.sprite.y - 80,
      `+${pts}`,
      "#ffcc00",
    );
    this.sprite.destroy();
    this.sprite = null;
    scene.hud.hideBossHP();
    scene.waveManager.onBossDefeated();
  }
}
