import { GAME } from "../config/constants.js";
import {
  fireLasers,
  fireMouthSpread,
  fireSpiralBurst,
  fireScreamBlast,
} from "./AAXBossAttacks.js";

const PHASE_NAMES = [
  "PHASE 1: AAX AWAKENS",
  "PHASE 2: STAY HUMBLE LOL",
  "PHASE 3: AAX IS PISSED",
  "PHASE 4: FULL SEND",
];

const PHASE_FRAMES = [
  [3, 4, 5],
  [6, 7, 8],
  [0, 1, 2],
  [0, 1, 2, 9, 10, 11],
];
const PAIN_FRAME = 7;

export class AAXBoss {
  constructor(scene, random, bossManager) {
    this.scene = scene;
    this.random = random;
    this.bossManager = bossManager;
    this.active = false;
    this.sprite = null;
    this.aura = null;
    this.horns = null;
    this.hp = 0;
    this.maxHP = 0;
    this.phase = 1;
    this.entryComplete = false;

    this.animFrame = 0;
    this.animTimer = 0;
    this.painTimer = 0;
    this.painTint = false;

    this.lastLaserTime = -10000;
    this.lastMouthTime = -10000;
    this.lastSpiralTime = -10000;
    this.lastScreamTime = -10000;
    this.activeLasers = [];
    this.spiralAngle = 0;

    this.hudBg = null;
    this.hudFill = null;
    this.hudLabel = null;
  }

  spawn(hp) {
    this.active = true;
    this.hp = hp;
    this.maxHP = hp;
    this.phase = 1;
    const scene = this.scene;

    const hasSheet = scene.textures.exists("boss-aax");
    const texKey = hasSheet ? "boss-aax" : "boss_01";
    const initFrame = hasSheet ? 3 : undefined;
    this.sprite = scene.physics.add.image(
      GAME.WIDTH / 2,
      -300,
      texKey,
      initFrame,
    );

    if (hasSheet) {
      const src = scene.textures.get("boss-aax").source[0];
      const scale = 280 / Math.max(src.width / 3, src.height / 4);
      this.sprite.setScale(scale);
    } else {
      this.sprite.setScale(0.5);
    }
    this.sprite.setDepth(12);
    this.sprite.body.setSize(
      this.sprite.displayWidth * 0.7,
      this.sprite.displayHeight * 0.7,
    );

    this.aura = scene.add.graphics().setDepth(11);
    this._buildHUD();

    scene.physics.add.overlap(
      scene.playerBullets,
      this.sprite,
      null,
      (bullet) => {
        if (bullet.active && this.active) this.onBulletHit(bullet);
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

    scene.tweens.add({
      targets: this.sprite,
      y: 250,
      duration: 1500,
      ease: "Bounce.easeOut",
      onComplete: () => {
        this.entryComplete = true;
        this.announcePhase(1);
      },
    });
  }

  _buildHUD() {
    const barW = 900,
      barH = 28;
    const barX = (GAME.WIDTH - barW) / 2,
      barY = 90;
    this.hudBg = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
    this.hudFill = this.scene.add.graphics().setDepth(101).setScrollFactor(0);
    this.hudLabel = this.scene.add
      .text(GAME.WIDTH / 2, barY - 6, "AAX \u2014 THE FINAL BOSS", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ff4444",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(102)
      .setScrollFactor(0);
    this.hudBg.fillStyle(0x330000, 0.9);
    this.hudBg.fillRect(barX, barY, barW, barH);
    this.hudBg.lineStyle(2, 0xff4444, 1);
    this.hudBg.strokeRect(barX, barY, barW, barH);
    this._redrawHUDFill();
  }

  _redrawHUDFill() {
    if (!this.hudFill) return;
    const barW = 900,
      barH = 28;
    const barX = (GAME.WIDTH - barW) / 2,
      barY = 90;
    const ratio = Math.max(0, this.hp / this.maxHP);
    const color =
      ratio > 0.75
        ? 0x00cc44
        : ratio > 0.5
          ? 0xcccc00
          : ratio > 0.25
            ? 0xff8800
            : 0xff2200;
    this.hudFill.clear();
    this.hudFill.fillStyle(color, 1);
    this.hudFill.fillRect(barX + 2, barY + 2, (barW - 4) * ratio, barH - 4);
  }

  update(time, delta) {
    if (!this.active || !this.sprite?.active) return;
    this._updateAnimation(delta);
    this._updateMovement(time);
    this._updateAura(time);
    this._updateHorns();
    this._updateLaserCollisions();
    if (!this.entryComplete) return;

    const spd = this.phase >= 4 ? 1.4 : 1.0;

    if (time - this.lastLaserTime > (this.phase >= 2 ? 2000 : 2500) / spd) {
      this.lastLaserTime = time;
      fireLasers(this);
      if (this.phase >= 3)
        this.scene.time.delayedCall(280, () => {
          if (this.active) fireLasers(this);
        });
    }

    if (
      this.phase >= 2 &&
      time - this.lastMouthTime > (this.phase >= 3 ? 1500 : 2000) / spd
    ) {
      this.lastMouthTime = time;
      fireMouthSpread(this);
      if (this.phase >= 3) {
        this.scene.time.delayedCall(400, () => {
          if (this.active) fireMouthSpread(this);
        });
        this.scene.time.delayedCall(800, () => {
          if (this.active) fireMouthSpread(this);
        });
      }
    }

    if (this.phase >= 3 && time - this.lastSpiralTime > 800 / spd) {
      this.lastSpiralTime = time;
      fireSpiralBurst(this);
    }

    if (this.phase >= 4 && time - this.lastScreamTime > 4000 / spd) {
      this.lastScreamTime = time;
      fireScreamBlast(this);
    }
  }

  _updateAnimation(delta) {
    if (this.painTimer > 0) {
      this.painTimer -= delta;
      if (this.painTimer <= 0) {
        this.painTimer = 0;
        if (this.sprite?.active) this.sprite.clearTint();
      }
      return;
    }
    this.animTimer += delta;
    const fps = this.phase >= 4 ? 16 : 8;
    if (this.animTimer > 1000 / fps) {
      this.animTimer = 0;
      const frames = PHASE_FRAMES[this.phase - 1];
      this.animFrame = (this.animFrame + 1) % frames.length;
      if (this.sprite?.active && this.scene.textures.exists("boss-aax")) {
        this.sprite.setFrame(frames[this.animFrame]);
      }
    }
  }

  _updateMovement(time) {
    if (!this.entryComplete || !this.sprite?.active) return;
    const amplitude = this.phase >= 4 ? 360 : 180;
    const newX =
      GAME.WIDTH / 2 + Math.sin((time / 3000) * Math.PI * 2) * amplitude;
    this.sprite.body.reset(newX, 250);
  }

  _updateAura(time) {
    if (!this.aura || !this.sprite?.active) return;
    const colors = [0x0044ff, 0x00ffaa, 0xff8800, 0xff0000];
    const color =
      this.phase >= 4 && Math.floor(time / 150) % 2 === 0
        ? 0xff6600
        : colors[this.phase - 1];
    this.aura.clear();
    this.aura.fillStyle(color, 0.25);
    this.aura.fillCircle(
      this.sprite.x,
      this.sprite.y,
      this.sprite.displayWidth * 0.65,
    );
    this.aura.fillStyle(color, 0.12);
    this.aura.fillCircle(
      this.sprite.x,
      this.sprite.y,
      this.sprite.displayWidth * 0.85,
    );
  }

  _updateHorns() {
    if (this.phase < 4) {
      if (this.horns) this.horns.setVisible(false);
      return;
    }
    if (!this.horns) this.horns = this.scene.add.graphics().setDepth(13);
    const cx = this.sprite.x;
    const topY = this.sprite.y - this.sprite.displayHeight * 0.5 - 10;
    this.horns.setVisible(true).clear().fillStyle(0xcc0000, 1);
    this.horns.fillTriangle(cx - 50, topY - 60, cx - 90, topY, cx - 20, topY);
    this.horns.fillTriangle(cx + 50, topY - 60, cx + 20, topY, cx + 90, topY);
  }

  _updateLaserCollisions() {
    this.activeLasers = this.activeLasers.filter((l) => !l.done);
    const player = this.scene.player;
    if (!player?.active || this.scene.isInvulnerable) return;
    const px = player.x,
      py = player.y,
      pw = 35;
    for (const laser of this.activeLasers) {
      const hitL =
        Math.abs(px - laser.eyeL.x) < pw &&
        py >= laser.eyeL.y &&
        py <= laser.eyeL.y + laser.length;
      const hitR =
        Math.abs(px - laser.eyeR.x) < pw &&
        py >= laser.eyeR.y &&
        py <= laser.eyeR.y + laser.length;
      if (hitL || hitR) {
        this.scene.damagePlayer();
        return;
      }
    }
  }

  _checkPhase() {
    const ratio = this.hp / this.maxHP;
    const newPhase = ratio > 0.75 ? 1 : ratio > 0.5 ? 2 : ratio > 0.25 ? 3 : 4;
    if (newPhase > this.phase) {
      this.phase = newPhase;
      this.animFrame = 0;
      this.scene.cameras.main.shake(300, 0.012);
      this.announcePhase(newPhase);
    }
  }

  announcePhase(n) {
    const t = this.scene.add
      .text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 80, PHASE_NAMES[n - 1], {
        fontFamily: "Arial",
        fontSize: "60px",
        color: "#ff4444",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(0);
    this.scene.tweens.add({
      targets: t,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
          this.scene.tweens.add({
            targets: t,
            alpha: 0,
            duration: 300,
            onComplete: () => t.destroy(),
          });
        });
      },
    });
  }

  onBulletHit(bullet) {
    if (!this.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
    this.scene.scoreManager.shotsHit++;
    this.hp--;
    this.sprite.setTint(0xff0000);
    this.painTimer = 700;
    this.painTint = true;
    this.scene.time.delayedCall(200, () => {
      this.painTint = false;
      if (this.sprite?.active) {
        this.sprite.clearTint();
        if (this.scene.textures.exists("boss-aax"))
          this.sprite.setFrame(PAIN_FRAME);
      }
    });
    this._checkPhase();
    this._redrawHUDFill();
    if (this.hp <= 0) this.defeat();
  }

  defeat() {
    this.active = false;
    const pts = this.scene.scoreManager.addBossKill(
      this.scene.waveManager.currentWave,
    );
    this.scene.score = this.scene.scoreManager.score;
    this.scene.cameras.main.shake(600, 0.025);
    this.scene.audio.playBossExplosion();
    [this.hudBg, this.hudFill, this.hudLabel].forEach((o) => o?.destroy());
    this.hudBg = this.hudFill = this.hudLabel = null;

    this.scene.showFloatingText(
      this.sprite.x,
      this.sprite.y - 100,
      `+${pts}`,
      "#ffcc00",
    );

    const defeatText = this.scene.add
      .text(GAME.WIDTH / 2, GAME.HEIGHT / 2, "AAX HAS BEEN\nDEFEATED", {
        fontFamily: "Arial",
        fontSize: "80px",
        color: "#ffcc00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(300)
      .setScale(0.1);
    this.scene.tweens.add({
      targets: defeatText,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
    });

    let cycleIdx = 0;
    const allFrames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    this.scene.time.addEvent({
      delay: 50,
      repeat: 39,
      callback: () => {
        if (this.sprite?.active && this.scene.textures.exists("boss-aax")) {
          this.sprite.setFrame(allFrames[cycleIdx % allFrames.length]);
        }
        cycleIdx++;
      },
    });
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 2,
      scaleY: this.sprite.scaleY * 2,
      duration: 700,
    });

    this.scene.time.addEvent({
      delay: 150,
      repeat: 8,
      callback: () => {
        if (!this.sprite) return;
        const ox = (this.random() - 0.5) * 180;
        const oy = (this.random() - 0.5) * 180;
        this.scene.explosions.play(
          this.sprite.x + ox,
          this.sprite.y + oy,
          "enemy_explosion",
          9,
          0.2,
        );
      },
    });

    this.scene.time.delayedCall(2000, () => {
      if (this.sprite) {
        this.scene.explosions.play(
          this.sprite.x,
          this.sprite.y,
          "player_explosion",
          7,
          0.4,
        );
        this.sprite.destroy();
        this.sprite = null;
      }
      if (this.aura) {
        this.aura.destroy();
        this.aura = null;
      }
      if (this.horns) {
        this.horns.destroy();
        this.horns = null;
      }
      for (const l of this.activeLasers) {
        if (l.graphics?.active !== false) l.graphics?.destroy();
      }
      this.activeLasers = [];
      this.scene.time.delayedCall(1500, () => {
        defeatText.destroy();
        this.bossManager.onAAXBossDefeated();
      });
    });
  }
}
