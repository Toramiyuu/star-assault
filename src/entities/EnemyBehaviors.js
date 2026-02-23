import { GAME } from "../config/constants.js";

export function updateZigzagger(enemy, elapsed) {
  const startX = enemy.getData("startX");
  enemy.x = startX + Math.sin(elapsed * 0.001 * 2 * Math.PI * 2) * 80;
}

export function updateArc(enemy, elapsed) {
  const startX = enemy.getData("startX");
  enemy.x = startX + Math.sin(elapsed * 0.001 * Math.PI * 0.5) * 60;
}

export function updateDiver(enemy, time, scene) {
  if (enemy.getData("dived")) return;
  if (time - enemy.getData("spawnTime") > 1000) {
    enemy.setData("dived", true);
    const player = scene.player;
    if (!player?.active) return;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const diveSpeed = enemy.getData("speed") * 2;
    enemy.setVelocity((dx / dist) * diveSpeed, (dy / dist) * diveSpeed);
    fireDiveSpread(scene, enemy);
  }
}

function fireDiveSpread(scene, enemy) {
  const player = scene.player;
  if (!player?.active) return;
  const bx = enemy.x,
    by = enemy.y;
  const baseAngle = Math.atan2(player.y - by, player.x - bx);
  for (let i = -1; i <= 1; i++) {
    const b = scene.enemyBullets.get(bx, by);
    if (!b) continue;
    b.setActive(true).setVisible(true).setScale(0.15).setTint(0xff4444);
    b.body.enable = true;
    const angle = baseAngle + i * 0.3;
    b.setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
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

export function fireAimedBullet(scene, enemy) {
  const player = scene.player;
  if (!player?.active) return;
  const b = scene.enemyBullets.get(enemy.x, enemy.y);
  if (!b) return;
  b.setActive(true).setVisible(true).setScale(0.15);
  b.body.enable = true;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  b.setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
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
  for (const leader of leaders) {
    leader.setData("lastFireTime", time);
    scene.fireEnemyBullet(leader);
  }
}
