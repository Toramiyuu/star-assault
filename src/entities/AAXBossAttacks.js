import { GAME } from "../config/constants.js";

function spawnBullet(boss, x, y, angle, speed, scale, tint) {
  const b = boss.scene.enemyBullets.get(x, y);
  if (!b) return;
  b.setActive(true).setVisible(true).setScale(scale).setTint(tint);
  b.body.enable = true;
  b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  b.body.setSize(b.width * 0.5, b.height * 0.5);
  b.update = function () {
    if (
      this.y > GAME.HEIGHT + 60 ||
      this.y < -60 ||
      this.x < -60 ||
      this.x > GAME.WIDTH + 60
    ) {
      this.setActive(false).setVisible(false);
      this.body.enable = false;
    }
  };
}

export function fireLasers(boss) {
  if (!boss.sprite?.active) return;
  const hw = boss.sprite.displayWidth * 0.5;
  const hh = boss.sprite.displayHeight * 0.5;
  const eyeL = { x: boss.sprite.x - hw * 0.3, y: boss.sprite.y - hh * 0.2 };
  const eyeR = { x: boss.sprite.x + hw * 0.3, y: boss.sprite.y - hh * 0.2 };

  const g = boss.scene.add.graphics().setDepth(15);
  const laser = { graphics: g, eyeL, eyeR, length: 0, done: false };
  boss.activeLasers.push(laser);

  boss.scene.tweens.add({
    targets: laser,
    length: GAME.HEIGHT + 100,
    duration: boss.phase >= 4 ? 280 : 400,
    ease: "Quad.easeIn",
    onUpdate: () => {
      g.clear();
      g.lineStyle(12, 0xff6600, 0.25);
      g.beginPath();
      g.moveTo(eyeL.x, eyeL.y);
      g.lineTo(eyeL.x, eyeL.y + laser.length);
      g.moveTo(eyeR.x, eyeR.y);
      g.lineTo(eyeR.x, eyeR.y + laser.length);
      g.strokePath();
      g.lineStyle(5, 0xff2200, 0.95);
      g.beginPath();
      g.moveTo(eyeL.x, eyeL.y);
      g.lineTo(eyeL.x, eyeL.y + laser.length);
      g.moveTo(eyeR.x, eyeR.y);
      g.lineTo(eyeR.x, eyeR.y + laser.length);
      g.strokePath();
    },
    onComplete: () => {
      boss.scene.time.delayedCall(80, () => {
        boss.scene.tweens.add({
          targets: g,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            g.destroy();
            laser.done = true;
          },
        });
      });
    },
  });
}

export function fireMouthSpread(boss) {
  if (!boss.sprite?.active) return;
  const mx = boss.sprite.x;
  const my = boss.sprite.y + boss.sprite.displayHeight * 0.25;
  const speed = boss.phase >= 4 ? 420 : 300;
  for (let i = 0; i < 5; i++) {
    const deg = -30 + i * 15;
    spawnBullet(
      boss,
      mx,
      my,
      Math.PI / 2 + (deg * Math.PI) / 180,
      speed,
      0.22,
      0xff6600,
    );
  }
}

export function fireSpiralBurst(boss) {
  if (!boss.sprite?.active) return;
  const cx = boss.sprite.x,
    cy = boss.sprite.y;
  const speed = boss.phase >= 4 ? 350 : 250;
  for (let i = 0; i < 8; i++) {
    spawnBullet(
      boss,
      cx,
      cy,
      boss.spiralAngle + (i / 8) * Math.PI * 2,
      speed,
      0.18,
      0xff8800,
    );
  }
  boss.spiralAngle += Math.PI / 12;
}

export function fireScreamBlast(boss) {
  if (!boss.sprite?.active) return;
  const cx = boss.sprite.x,
    cy = boss.sprite.y;
  for (let i = 0; i < 16; i++) {
    spawnBullet(boss, cx, cy, (i / 16) * Math.PI * 2, 350, 0.28, 0xff0000);
  }
  boss.scene.cameras.main.shake(150, 0.008);
}
