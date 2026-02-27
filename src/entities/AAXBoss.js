import { GAME } from "../config/constants.js";
import {
  fireLasers,
  fireMouthSpread,
  fireSpiralBurst,
  fireScreamBlast,
} from "./AAXBossAttacks.js";
import { triggerHornModeTransition, defeatBoss } from "./AAXBossHornMode.js";
import { buildHUD, redrawHUDFill } from "./AAXBossHUD.js";
import {
  updateAura,
  updateLaserCollisions,
  announcePhase,
} from "./AAXBossEffects.js";

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
    this.hp = 0;
    this.maxHP = 0;
    this.phase = 1;
    this.entryComplete = false;
    this.hornModeActive = false;
    this.cutsceneActive = false;

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

    this.movementPauseCount = 0;
    this.pauseTimeAccumulator = 0;
    this.lastPauseStart = 0;

    this.diveState = 'none';
    this.diveTimer = 0;
    this.lastDiveTime = -10000;
    this.diveTargetX = 0;
    this.diveStartX = GAME.WIDTH / 2;
    this.diveStartY = 340;
    this._returnStartY = 340;
    this._returnStartX = GAME.WIDTH / 2;
    this._diveBurstFired = false;

    this.hudBg = null;
    this.hudFill = null;
    this.hudLabel = null;
  }

  spawn(hp, instant) {
    this.active = true;
    this.hp = hp;
    this.maxHP = hp;
    this.phase = 1;
    const scene = this.scene;

    const hasSheet = scene.textures.exists("boss-aax");
    const texKey = hasSheet ? "boss-aax" : "boss_01";
    const initFrame = hasSheet ? 3 : undefined;
    this.sprite = scene.add.image(
      GAME.WIDTH / 2,
      instant ? 340 : -300,
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

    this.aura = scene.add.graphics().setDepth(11);
    buildHUD(this);

    if (instant) {
      this.entryComplete = true;
      this.announcePhase(1);
      scene.audio.playBossLaughEntry();
    } else {
      scene.tweens.add({
        targets: this.sprite,
        y: 340,
        duration: 1500,
        ease: "Bounce.easeOut",
        onComplete: () => {
          this.entryComplete = true;
          this.announcePhase(1);
          scene.audio.playBossLaughEntry();
        },
      });
    }
  }

  _redrawHUDFill() {
    redrawHUDFill(this);
  }

  announcePhase(n) {
    announcePhase(this, n);
  }

  update(time, delta) {
    if (!this.active || !this.sprite?.active) {
      if (this._wasActive !== false) {
        console.warn(
          "[BOSS] update stopped — active:",
          this.active,
          "sprite:",
          this.sprite?.active,
        );
        this._wasActive = false;
      }
      return;
    }
    this._wasActive = true;
    this._updateAnimation(delta);
    this._updateMovement(time);
    updateAura(this, time);
    updateLaserCollisions(this);
    this._checkBulletHits();
    this._checkPlayerCollision();
    if (!this.entryComplete || this.cutsceneActive) return;
    this._updateDive(time, delta);

    const spd = this.phase >= 4 ? 1.4 : 1.0;

    if (this.diveState !== 'none') return;

    const laserInterval = this.phase >= 3 ? 2500 : this.phase >= 2 ? 3000 : 3500;
    if (time - this.lastLaserTime > laserInterval / spd) {
      this.lastLaserTime = time;
      fireLasers(this);
      if (this.phase >= 4)
        this.scene.time.delayedCall(280, () => {
          if (this.active) fireLasers(this);
        });
    }

    if (
      this.phase >= 2 &&
      time - this.lastMouthTime > (this.phase >= 3 ? 2000 : 2800) / spd
    ) {
      this.lastMouthTime = time;
      fireMouthSpread(this);
      if (this.phase >= 4) {
        this.scene.time.delayedCall(400, () => {
          if (this.active) fireMouthSpread(this);
        });
        this.scene.time.delayedCall(800, () => {
          if (this.active) fireMouthSpread(this);
        });
      }
    }

    if (this.phase >= 3 && time - this.lastSpiralTime > 1500 / spd) {
      this.lastSpiralTime = time;
      fireSpiralBurst(this);
    }

    if (this.phase >= 4 && time - this.lastScreamTime > 4000 / spd) {
      this.lastScreamTime = time;
      fireScreamBlast(this);
    }
  }

  _updateAnimation(delta) {
    if (this.cutsceneActive) return;
    if (this.painTimer > 0) {
      this.painTimer -= delta;
      if (this.painTimer <= 0) {
        this.painTimer = 0;
        if (this.sprite?.active) this.sprite.clearTint();
      }
      return;
    }
    this.animTimer += delta;
    const fps = this.hornModeActive ? 6 : 8;
    if (this.animTimer > 1000 / fps) {
      this.animTimer = 0;
      if (this.hornModeActive) {
        this.animFrame = (this.animFrame + 1) % 9;
        if (this.sprite?.active) this.sprite.setFrame(this.animFrame);
      } else {
        const frames = PHASE_FRAMES[this.phase - 1];
        this.animFrame = (this.animFrame + 1) % frames.length;
        if (this.sprite?.active && this.scene.textures.exists("boss-aax")) {
          this.sprite.setFrame(frames[this.animFrame]);
        }
      }
    }
  }

  pauseMovement() {
    if (this.movementPauseCount === 0) {
      this.lastPauseStart = this.scene.time.now;
    }
    this.movementPauseCount++;
  }

  resumeMovement() {
    this.movementPauseCount = Math.max(0, this.movementPauseCount - 1);
    if (this.movementPauseCount === 0 && this.lastPauseStart > 0) {
      this.pauseTimeAccumulator += this.scene.time.now - this.lastPauseStart;
      this.lastPauseStart = 0;
    }
  }

  _updateMovement(time) {
    if (!this.entryComplete || !this.sprite?.active || this.cutsceneActive)
      return;
    if (this.movementPauseCount > 0 || this.diveState !== 'none') return;
    const effectiveTime = time - this.pauseTimeAccumulator;
    const amplitude = this.phase >= 4 ? 400 : this.phase >= 3 ? 350 : 250;
    const speed = this.phase >= 4 ? 1800 : this.phase >= 3 ? 2200 : 2800;
    const newX =
      GAME.WIDTH / 2 + Math.sin((effectiveTime / speed) * Math.PI * 2) * amplitude;
    const bobY = 340 + Math.sin((effectiveTime / 1500) * Math.PI * 2) * 30;
    this.sprite.setPosition(newX, bobY);
  }

  _updateDive(time, delta) {
    if (this.diveState === 'none') {
      if (this.phase < 2 || this.cutsceneActive) return;
      const interval = this.phase >= 4 ? 5000 : this.phase >= 3 ? 6000 : 8000;
      if (time - this.lastDiveTime > interval) {
        this.diveState = 'warning';
        this.diveTimer = 0;
        this.pauseMovement();
        if (this.sprite?.active) {
          this.diveStartX = this.sprite.x;
          this.diveStartY = this.sprite.y;
        }
      }
      return;
    }

    this.diveTimer += delta;

    switch (this.diveState) {
      case 'warning':
        if (this.sprite?.active) {
          const shakeX = (this.random() - 0.5) * 6;
          const shakeY = (this.random() - 0.5) * 6;
          this.sprite.setPosition(this.diveStartX + shakeX, this.diveStartY + shakeY);
          if (Math.floor(this.diveTimer / 100) % 2 === 0) {
            this.sprite.setTint(0xff8800);
          } else {
            this.sprite.clearTint();
          }
        }
        if (this.diveTimer >= 500) {
          this.diveTimer = 0;
          this.diveState = 'tracking';
          if (this.sprite?.active) this.sprite.clearTint();
          const player = this.scene.player;
          this.diveTargetX = player?.active ? player.x : GAME.WIDTH / 2;
        }
        break;

      case 'tracking':
        if (this.sprite?.active) {
          const player = this.scene.player;
          if (player?.active) this.diveTargetX = player.x;
          const currentX = this.sprite.x;
          this.sprite.setPosition(currentX + (this.diveTargetX - currentX) * 0.03, this.diveStartY);
        }
        if (this.diveTimer >= 1000) {
          this.diveTimer = 0;
          this.diveState = 'diving';
          this._diveBurstFired = false;
          if (this.sprite?.active) this.diveStartX = this.sprite.x;
        }
        break;

      case 'diving': {
        const diveProgress = Math.min(this.diveTimer / 1500, 1);
        const eased = diveProgress * diveProgress;
        const targetY = GAME.HEIGHT * 0.75;
        if (this.sprite?.active) {
          const player = this.scene.player;
          if (player?.active) {
            this.sprite.x += (player.x - this.sprite.x) * 0.01;
          }
          this.sprite.y = this.diveStartY + (targetY - this.diveStartY) * eased;
        }
        if (diveProgress >= 0.95 && !this._diveBurstFired) {
          this._diveBurstFired = true;
          this._fireDiveBurst();
        }
        if (this.diveTimer >= 1500) {
          this.diveTimer = 0;
          this.diveState = 'returning';
          if (this.sprite?.active) {
            this._returnStartY = this.sprite.y;
            this._returnStartX = this.sprite.x;
          }
        }
        break;
      }

      case 'returning': {
        const returnProgress = Math.min(this.diveTimer / 1500, 1);
        const eased = 1 - (1 - returnProgress) * (1 - returnProgress);
        if (this.sprite?.active) {
          this.sprite.y = this._returnStartY + (340 - this._returnStartY) * eased;
          this.sprite.x = this._returnStartX + (GAME.WIDTH / 2 - this._returnStartX) * eased;
        }
        if (this.diveTimer >= 1500) {
          this.diveState = 'none';
          this.diveTimer = 0;
          this.lastDiveTime = time;
          this.resumeMovement();
        }
        break;
      }
    }
  }

  _fireDiveBurst() {
    if (!this.sprite?.active) return;
    const cx = this.sprite.x;
    const cy = this.sprite.y;
    const speed = 280;
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + ((i - 4.5) / 10) * (Math.PI * 0.6);
      const b = this.scene.enemyBullets.get(cx, cy);
      if (!b) continue;
      b.setActive(true).setVisible(true).setScale(0.35).setTintFill(0xff6600);
      b.body.enable = true;
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      b.body.setSize(b.width * 0.5, b.height * 0.5);
      b.update = function () {
        if (this.y > GAME.HEIGHT + 60 || this.y < -60 || this.x < -60 || this.x > GAME.WIDTH + 60) {
          this.setActive(false).setVisible(false);
          this.body.enable = false;
        }
      };
    }
  }

  _checkPhase() {
    if (this.cutsceneActive || this.hornModeActive) return;
    const ratio = this.hp / this.maxHP;
    if (ratio <= 0.25) {
      triggerHornModeTransition(this);
      return;
    }
    const newPhase = ratio > 0.75 ? 1 : ratio > 0.5 ? 2 : 3;
    if (newPhase > this.phase) {
      this.phase = newPhase;
      this.animFrame = 0;
      this.scene.cameras.main.shake(300, 0.012);
      this.announcePhase(newPhase);
    }
  }

  _checkBulletHits() {
    if (!this.sprite?.active || this.cutsceneActive) return;
    const sx = this.sprite.x;
    const sy = this.sprite.y;
    const hw = this.sprite.displayWidth * 0.35;
    const hh = this.sprite.displayHeight * 0.35;
    this.scene.playerBullets.getChildren().forEach((b) => {
      if (!b.active) return;
      if (b.x > sx - hw && b.x < sx + hw && b.y > sy - hh && b.y < sy + hh) {
        this.onBulletHit(b);
      }
    });
    if (this.scene.weaponManager?.weaponBullets) {
      this.scene.weaponManager.weaponBullets.getChildren().forEach((b) => {
        if (!b.active) return;
        if (b.x > sx - hw && b.x < sx + hw && b.y > sy - hh && b.y < sy + hh) {
          this.onBulletHit(b);
        }
      });
    }
  }

  _checkPlayerCollision() {
    if (!this.sprite?.active || this.cutsceneActive) return;
    const player = this.scene.player;
    if (!player?.active || this.scene.godMode || this.scene.isInvulnerable)
      return;
    const dx = Math.abs(player.x - this.sprite.x);
    const dy = Math.abs(player.y - this.sprite.y);
    const hw = this.sprite.displayWidth * 0.35;
    const hh = this.sprite.displayHeight * 0.35;
    if (dx < hw + 20 && dy < hh + 20) {
      this.scene.damagePlayer();
    }
  }

  onBulletHit(bullet) {
    if (!this.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
    const pierce = bullet.getData('pierce') || 0;
    const pierceCount = bullet.getData('pierceCount') || 0;
    if (pierceCount < pierce) {
      bullet.setData('pierceCount', pierceCount + 1);
      bullet.setActive(true).setVisible(true);
      bullet.body.enable = true;
    }
    this.scene.scoreManager.shotsHit++;
    const damage = bullet.getData('damage') || this.scene.playerDamage || 1;
    const isCrit = bullet.getData('isCrit') || false;
    this.hp -= damage;
    if (this.hp % 50 === 0) console.log("[BOSS] HP:", this.hp, "/", this.maxHP);
    this.sprite.setTint(0xff0000);
    this.painTimer = 700;
    this.painTint = true;
    this.scene.time.delayedCall(200, () => {
      this.painTint = false;
      if (this.sprite?.active) {
        this.sprite.clearTint();
        if (!this.hornModeActive && this.scene.textures.exists("boss-aax"))
          this.sprite.setFrame(PAIN_FRAME);
      }
    });
    if (isCrit) {
      this.scene.showFloatingText(this.sprite.x, this.sprite.y - 80, 'CRIT!', '#ffcc00');
    }
    this._checkPhase();
    redrawHUDFill(this);
    if (this.hp <= 0) this.defeat();
  }

  defeat() {
    defeatBoss(this);
  }
}
