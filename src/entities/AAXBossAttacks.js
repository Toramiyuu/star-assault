import { GAME } from "../config/constants.js";

function spawnBullet(boss, x, y, angle, speed, scale, tint) {
  const b = boss.scene.enemyBullets.get(x, y);
  if (!b) return;
  b.setActive(true).setVisible(true).setScale(scale).setTintFill(tint);
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
  boss.pauseMovement();
  const hw = boss.sprite.displayWidth * 0.5;
  const hh = boss.sprite.displayHeight * 0.5;
  const eyeL = { x: boss.sprite.x - hw * 0.30, y: boss.sprite.y + hh * 0.04 };
  const eyeR = { x: boss.sprite.x + hw * 0.30, y: boss.sprite.y + hh * 0.04 };

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
      const maxLen = GAME.HEIGHT + 100;
      const progress = laser.length / maxLen;

      for (const eye of [eyeL, eyeR]) {
        // Wide outer glow
        g.lineStyle(24, 0xff6600, 0.12);
        g.beginPath();
        g.moveTo(eye.x, eye.y);
        g.lineTo(eye.x, eye.y + laser.length);
        g.strokePath();

        // Medium glow
        g.lineStyle(14, 0xff3300, 0.3);
        g.beginPath();
        g.moveTo(eye.x, eye.y);
        g.lineTo(eye.x, eye.y + laser.length);
        g.strokePath();

        // Core beam
        g.lineStyle(6, 0xff2200, 0.9);
        g.beginPath();
        g.moveTo(eye.x, eye.y);
        g.lineTo(eye.x, eye.y + laser.length);
        g.strokePath();

        // Inner core
        g.lineStyle(2, 0xffcc00, 1.0);
        g.beginPath();
        g.moveTo(eye.x, eye.y);
        g.lineTo(eye.x, eye.y + laser.length);
        g.strokePath();

        // Eye flash (fades as laser extends)
        const flashAlpha = 0.6 * (1 - progress);
        if (flashAlpha > 0.01) {
          g.fillStyle(0xffff00, flashAlpha);
          g.fillCircle(eye.x, eye.y, 8 + 4 * (1 - progress));
        }
      }
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
            boss.resumeMovement();
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
      0.35,
      0xff4400,
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
      0.3,
      0xffaa00,
    );
  }
  boss.spiralAngle += Math.PI / 12;
}

export function fireScreamBlast(boss) {
  if (!boss.sprite?.active) return;
  const cx = boss.sprite.x,
    cy = boss.sprite.y;
  for (let i = 0; i < 16; i++) {
    spawnBullet(boss, cx, cy, (i / 16) * Math.PI * 2, 350, 0.4, 0xff0000);
  }
  boss.scene.cameras.main.shake(150, 0.008);
}
