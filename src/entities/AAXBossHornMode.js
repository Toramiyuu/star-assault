import { GAME } from "../config/constants.js";

export function triggerHornModeTransition(boss) {
  boss.cutsceneActive = true;
  boss.scene.cutscenePlaying = true;

  boss.activeLasers.forEach((l) => {
    l.done = true;
    if (l.graphics?.active !== false) l.graphics?.destroy();
  });
  boss.activeLasers = [];
  boss.scene.enemyBullets.getChildren().forEach((b) => {
    b.setActive(false).setVisible(false);
    if (b.body) b.body.enable = false;
  });

  boss.scene.cameras.main.shake(500, 0.025);
  boss.scene.cameras.main.flash(400, 255, 60, 0);
  boss.scene.audio.playBossLaughAngry();

  if (boss.sprite?.active && boss.scene.textures.exists("aax-horn-entry")) {
    boss.sprite.setTexture("aax-horn-entry", 0);
    // Scale based on head size (top-of-head to chin), not full frame.
    // Horns extend beyond the head — roughly 30% of the 736px frame is horns.
    boss.sprite.setScale(280 / (736 * 0.70));
  }

  const txt = boss.scene.add
    .text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 160, "YOU'LL BE LUCKY!", {
      fontFamily: "Arial",
      fontSize: "52px",
      color: "#ff2200",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 7,
    })
    .setOrigin(0.5)
    .setDepth(300)
    .setScale(0);

  boss.scene.tweens.add({
    targets: txt,
    scaleX: 1,
    scaleY: 1,
    duration: 350,
    ease: "Back.easeOut",
    onComplete: () => {
      boss.scene.time.delayedCall(500, () => {
        _playFrameSequence(boss, 9, 110, () => {
          boss.scene.time.delayedCall(400, () => {
            boss.scene.tweens.add({
              targets: txt,
              alpha: 0,
              duration: 300,
              onComplete: () => {
                txt.destroy();
                _startHornMode(boss);
              },
            });
          });
        });
      });
    },
  });
}

function _playFrameSequence(boss, frameCount, frameDelay, onComplete) {
  boss.sprite?.setFrame(0);
  let frame = 1;
  const timer = boss.scene.time.addEvent({
    delay: frameDelay,
    loop: true,
    callback: () => {
      if (!boss.sprite?.active) {
        timer.destroy();
        return;
      }
      boss.sprite.setFrame(frame);
      frame++;
      if (frame >= frameCount) {
        timer.destroy();
        onComplete();
      }
    },
  });
}

function _startHornMode(boss) {
  boss.hornModeActive = true;
  boss.cutsceneActive = false;
  boss.scene.cutscenePlaying = false;
  boss.hp = boss.maxHP;
  boss.animFrame = 0;
  boss.phase = 4;
  boss.lastLaserTime = -10000;
  boss.lastMouthTime = -10000;
  boss.lastSpiralTime = -10000;
  boss.lastScreamTime = -10000;
  boss.lastDiveTime = -10000;
  boss.diveState = 'none';
  boss.diveTimer = 0;
  boss.movementPauseCount = 0;
  boss.pauseTimeAccumulator = 0;
  boss._redrawHUDFill();

  if (boss.sprite?.active && boss.scene.textures.exists("aax-expressions")) {
    boss.sprite.setTexture("aax-expressions", 0);
  }

  // Rename the HUD bar label to "DEVIL ALEX" for horn mode
  if (boss.hudLabel) {
    boss.hudLabel.setText('DEVIL ALEX');
    boss.hudLabel.setColor('#ff6600');
  }

  boss.announcePhase(4);

  // If a level-up was queued during the cutscene (because time.paused would have
  // frozen the horn mode delayedCall chain), fire it now that the cutscene is done.
  if (boss.scene.upgradeManager?._queuedLevelUp) {
    boss.scene.upgradeManager._queuedLevelUp = false;
    boss.scene.time.delayedCall(800, () => {
      boss.scene.upgradeManager.triggerCardSelection();
    });
  }
}

export function defeatBoss(boss) {
  console.warn("[BOSS] DEFEATED — hp:", boss.hp);
  boss.active = false;
  boss.scene.audio.playBossDeathScream();
  const pts = boss.scene.scoreManager.addBossKill(
    boss.scene.waveManager.currentWave,
  );
  boss.scene.score = boss.scene.scoreManager.score;
  boss.scene.cameras.main.shake(600, 0.025);
  boss.scene.audio.playBossExplosion();
  [boss.hudBg, boss.hudFill, boss.hudLabel].forEach((o) => o?.destroy());
  boss.hudBg = boss.hudFill = boss.hudLabel = null;

  boss.scene.showFloatingText(
    boss.sprite.x,
    boss.sprite.y - 100,
    `+${pts}`,
    "#ffcc00",
  );

  const name = boss.hornModeActive ? "DEVIL ALEX" : "ALEX";
  const defeatText = boss.scene.add
    .text(GAME.WIDTH / 2, GAME.HEIGHT / 2, `${name} HAS BEEN\nDEFEATED`, {
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
  boss.scene.tweens.add({
    targets: defeatText,
    scaleX: 1,
    scaleY: 1,
    duration: 500,
    ease: "Back.easeOut",
  });

  for (const l of boss.activeLasers) {
    if (l.graphics?.active !== false) l.graphics?.destroy();
  }
  boss.activeLasers = [];

  const cleanup = () => {
    if (boss.sprite) {
      boss.sprite.destroy();
      boss.sprite = null;
    }
    if (boss.aura) {
      boss.aura.destroy();
      boss.aura = null;
    }
    boss.scene.time.delayedCall(1500, () => {
      defeatText.destroy();
      boss.bossManager.onAAXBossDefeated();
    });
  };

  if (boss.hornModeActive && boss.scene.textures.exists("aax-death")) {
    playDeathAnimation(boss, () => {
      boss.scene.time.delayedCall(300, () => {
        if (boss.sprite?.active) {
          boss.scene.explosions.play(
            boss.sprite.x,
            boss.sprite.y,
            "player_explosion",
            7,
            0.4,
          );
        }
        cleanup();
      });
    });
  } else {
    let cycleIdx = 0;
    const allFrames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    boss.scene.time.addEvent({
      delay: 50,
      repeat: 39,
      callback: () => {
        if (boss.sprite?.active && boss.scene.textures.exists("boss-aax"))
          boss.sprite.setFrame(allFrames[cycleIdx % allFrames.length]);
        cycleIdx++;
      },
    });
    boss.scene.tweens.add({
      targets: boss.sprite,
      scaleX: boss.sprite.scaleX * 2,
      scaleY: boss.sprite.scaleY * 2,
      duration: 700,
    });
    boss.scene.time.addEvent({
      delay: 150,
      repeat: 8,
      callback: () => {
        if (!boss.sprite) return;
        const ox = (boss.random() - 0.5) * 180;
        const oy = (boss.random() - 0.5) * 180;
        boss.scene.explosions.play(
          boss.sprite.x + ox,
          boss.sprite.y + oy,
          "enemy_explosion",
          9,
          0.2,
        );
      },
    });
    boss.scene.time.delayedCall(2000, () => {
      if (boss.sprite?.active)
        boss.scene.explosions.play(
          boss.sprite.x,
          boss.sprite.y,
          "player_explosion",
          7,
          0.4,
        );
      cleanup();
    });
  }
}

export function playDeathAnimation(boss, onComplete) {
  if (!boss.sprite?.active || !boss.scene.textures.exists("aax-death")) {
    onComplete();
    return;
  }
  boss.sprite.setTexture("aax-death", 0);
  _playFrameSequence(boss, 9, 150, onComplete);
}
