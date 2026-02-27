import { GAME } from "../config/constants.js";

/**
 * Diver dive-bomb spread fire — fires 3 bullets in a fan toward the player.
 * Called when a diver lunges.
 */
export function fireDiveSpread(scene, enemy) {
  const player = scene.player;
  if (!player?.active) return;
  const bx = enemy.x,
    by = enemy.y;
  const baseAngle = Math.atan2(player.y - by, player.x - bx);
  for (let i = -1; i <= 1; i++) {
    const b = scene.enemyBullets.get(bx, by);
    if (!b) continue;
    b.setActive(true).setVisible(true).setScale(0.15).setTintFill(0xff4444);
    b.body.enable = true;
    const angle = baseAngle + i * 0.3;
    b.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260);
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
}

/**
 * Zigzagger aimed bullet — fires a single bullet toward the player.
 */
export function fireAimedBullet(scene, enemy) {
  const player = scene.player;
  if (!player?.active) return;
  const b = scene.enemyBullets.get(enemy.x, enemy.y);
  if (!b) return;
  b.setActive(true).setVisible(true).setScale(0.15).setTintFill(0xff4444);
  b.body.enable = true;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  b.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
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

/**
 * Formation Leader burst — fires from this leader and at most 1 nearby leader.
 */
export function fireFormationLeaderBurst(scene, enemy, time) {
  const leaders = scene.enemies
    .getChildren()
    .filter(
      (e) =>
        e.active &&
        e !== enemy &&
        e.getData("enemyType") === "formation_leader" &&
        Math.hypot(e.x - enemy.x, e.y - enemy.y) < 150,
    );
  scene.fireEnemyBullet(enemy);
  // Cap at 1 extra leader firing in sync
  const maxExtra = 1;
  for (let i = 0; i < Math.min(leaders.length, maxExtra); i++) {
    leaders[i].setData("lastFireTime", time);
    scene.fireEnemyBullet(leaders[i]);
  }
}
