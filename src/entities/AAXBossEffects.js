import { GAME } from "../config/constants.js";

const PHASE_NAMES = [
  "A WILD ALEX APPEARS!",
  "OH HELL NO!",
  "DENIED!",
  "NEVER GONNA HAPPEN!",
];

export function updateAura(boss, time) {
  if (!boss.aura || !boss.sprite?.active) return;
  const colors = [0x0044ff, 0x00ffaa, 0xff8800, 0xff0000];
  const color = boss.cutsceneActive
    ? Math.floor(time / 100) % 2 === 0
      ? 0xff0000
      : 0xff6600
    : boss.hornModeActive
      ? Math.floor(time / 150) % 2 === 0
        ? 0xff6600
        : 0xff0000
      : colors[boss.phase - 1];
  boss.aura.clear();
  boss.aura.fillStyle(color, 0.25);
  boss.aura.fillCircle(
    boss.sprite.x,
    boss.sprite.y,
    boss.sprite.displayWidth * 0.65,
  );
  boss.aura.fillStyle(color, 0.12);
  boss.aura.fillCircle(
    boss.sprite.x,
    boss.sprite.y,
    boss.sprite.displayWidth * 0.85,
  );
}

export function updateLaserCollisions(boss) {
  boss.activeLasers = boss.activeLasers.filter((l) => !l.done);
  const player = boss.scene.player;
  if (!player?.active || boss.scene.isInvulnerable || boss.cutsceneActive)
    return;
  const px = player.x,
    py = player.y,
    pw = 35;
  for (const laser of boss.activeLasers) {
    const hitL =
      Math.abs(px - laser.eyeL.x) < pw &&
      py >= laser.eyeL.y &&
      py <= laser.eyeL.y + laser.length;
    const hitR =
      Math.abs(px - laser.eyeR.x) < pw &&
      py >= laser.eyeR.y &&
      py <= laser.eyeR.y + laser.length;
    if (hitL || hitR) {
      boss.scene.damagePlayer();
      return;
    }
  }
}

export function announcePhase(boss, n) {
  const t = boss.scene.add
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
  boss.scene.tweens.add({
    targets: t,
    scaleX: 1,
    scaleY: 1,
    duration: 400,
    ease: "Back.easeOut",
    onComplete: () => {
      boss.scene.time.delayedCall(1200, () => {
        boss.scene.tweens.add({
          targets: t,
          alpha: 0,
          duration: 300,
          onComplete: () => t.destroy(),
        });
      });
    },
  });
}
