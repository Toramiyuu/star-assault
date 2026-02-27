import { GAME, PLAYER } from "../config/constants.js";

const PLAYER_SCALE = 0.1;
const BULLET_SCALE = 0.08;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function createPlayer(scene) {
  scene.player = scene.physics.add.image(GAME.WIDTH / 2, 1600, "player");
  scene.player.setScale(PLAYER_SCALE).setCollideWorldBounds(true).setDepth(10);
  scene.player.body.setSize(
    scene.player.width * 0.6,
    scene.player.height * 0.7,
  );
  scene.exhaustFrame = 0;
  scene.exhaustTimer = 0;
  scene.exhaust = scene.add.image(GAME.WIDTH / 2, 1645, "exhaust_0");
  scene.exhaust.setScale(PLAYER_SCALE * 0.8).setDepth(9);
}

export function updateExhaust(scene, delta) {
  scene.exhaustTimer += delta;
  if (scene.exhaustTimer > 50) {
    scene.exhaustTimer = 0;
    scene.exhaustFrame = (scene.exhaustFrame + 1) % 10;
    scene.exhaust.setTexture(`exhaust_${scene.exhaustFrame}`);
  }
  // Exhaust always below the ship (ship stays upright)
  scene.exhaust.setPosition(scene.player.x, scene.player.y + 45);
  scene.exhaust.setRotation(0);
}

export function handleInput(scene, delta) {
  if (scene.cutscenePlaying) {
    scene.player.setVelocity(0, 0);
    scene.touchTarget = null;
    return;
  }
  const speed = (scene.playerSpeed || 300) * delta / 1000;
  if (scene.touchTarget) {
    const dx = scene.touchTarget.x - scene.player.x;
    const dy = scene.touchTarget.y - 60 - scene.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      const ms = Math.min(speed, dist);
      scene.player.x += (dx / dist) * ms;
      scene.player.y += (dy / dist) * ms;
    }
  }
  let kbX = 0,
    kbY = 0;
  if (scene.cursors.left.isDown || scene.wasd.left.isDown) kbX = -1;
  if (scene.cursors.right.isDown || scene.wasd.right.isDown) kbX = 1;
  if (scene.cursors.up.isDown || scene.wasd.up.isDown) kbY = -1;
  if (scene.cursors.down.isDown || scene.wasd.down.isDown) kbY = 1;
  if (kbX || kbY) {
    const len = Math.sqrt(kbX * kbX + kbY * kbY);
    scene.player.x += (kbX / len) * speed;
    scene.player.y += (kbY / len) * speed;
  }
  scene.player.x = clamp(scene.player.x, 40, GAME.WIDTH - 40);
  scene.player.y = clamp(scene.player.y, 40, GAME.HEIGHT - 40);
}

export function firePlayerBullet(scene) {
  scene.scoreManager.shotsFired++;
  const spread = scene.powerups.has("spread_shot");
  const offsets = spread ? [-30, 0, 30] : [0];
  for (const ox of offsets) {
    const b = scene.playerBullets.get(scene.player.x + ox, scene.player.y - 50);
    if (!b) continue;
    b.setActive(true).setVisible(true).setScale(BULLET_SCALE);
    b.body.enable = true;
    b.setVelocity(spread ? ox * 3 : 0, PLAYER.BULLET_SPEED);
    b.body.setSize(b.width * 0.4, b.height * 0.6);
    b.update = function () {
      if (this.y < -50) {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
      }
    };
  }

  if (scene.powerups.has("missile")) {
    const target = getClosestEnemy(scene);
    if (target) {
      const m = scene.playerBullets.get(scene.player.x, scene.player.y - 40);
      if (m) {
        m.setActive(true)
          .setVisible(true)
          .setScale(BULLET_SCALE * 0.8)
          .setTint(0xff4444);
        m.body.enable = true;
        const angle = Math.atan2(
          target.y - scene.player.y,
          target.x - scene.player.x,
        );
        m.setVelocity(Math.cos(angle) * 600, Math.sin(angle) * 600);
        m.body.setSize(m.width * 0.4, m.height * 0.6);
        m.update = function () {
          if (
            this.y < -50 ||
            this.y > GAME.HEIGHT + 50 ||
            this.x < -50 ||
            this.x > GAME.WIDTH + 50
          ) {
            this.setActive(false).setVisible(false);
            this.body.enable = false;
          }
        };
      }
    }
  }
  scene.audio.playShoot();
}

export function getClosestEnemy(scene) {
  let closest = null,
    minDist = Infinity;
  scene.enemies.getChildren().forEach((e) => {
    if (!e.active) return;
    const d = Math.abs(e.x - scene.player.x) + Math.abs(e.y - scene.player.y);
    if (d < minDist) {
      minDist = d;
      closest = e;
    }
  });
  if (scene.boss.active && scene.boss.sprite?.active) {
    const d =
      Math.abs(scene.boss.sprite.x - scene.player.x) +
      Math.abs(scene.boss.sprite.y - scene.player.y);
    if (d < minDist) closest = scene.boss.sprite;
  }
  return closest;
}

export function triggerVictory(scene) {
  scene.isGameOver = true;
  scene.audio.stopMusic();
  scene.scoreManager.waveReached = scene.waveManager.currentWave;
  scene.time.delayedCall(2000, () => {
    const breakdown = scene.scoreManager.getBreakdown();
    scene.scene.start("Results", {
      breakdown,
      seed: scene.registry.get("seed"),
      victory: true,
    });
  });
}

export function playerDeath(scene) {
  scene.isGameOver = true;
  scene.player.setVisible(false);
  scene.player.body.enable = false;
  scene.exhaust.setVisible(false);
  scene.audio.stopMusic();
  scene.scoreManager.waveReached = scene.waveManager.currentWave;
  scene.explosions.play(
    scene.player.x,
    scene.player.y,
    "player_explosion",
    7,
    0.15,
  );
  scene.cameras.main.shake(400, 0.015);
  scene.time.delayedCall(2000, () => {
    const breakdown = scene.scoreManager.getBreakdown();
    scene.scene.start("Results", {
      breakdown,
      seed: scene.registry.get("seed"),
    });
  });
}
