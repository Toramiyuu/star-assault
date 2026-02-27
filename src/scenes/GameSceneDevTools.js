import { GAME } from "../config/constants.js";

export function handleDevKey(scene, name) {
  if (name === "I") {
    scene.godMode = !scene.godMode;
    scene.showFloatingText(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2,
      scene.godMode ? "GOD MODE ON" : "GOD MODE OFF",
      scene.godMode ? "#00ff00" : "#ff4444",
    );
  }
  if (name === "B" && !scene.isGameOver) skipToBoss(scene);
  if (name === "N" && !scene.isGameOver) skipToNextWave(scene);
  if (name === "K") killAllEnemies(scene);
  if (name === "U" && !scene.isGameOver) {
    // Force level-up
    if (scene.upgradeManager) {
      scene.upgradeManager.triggerCardSelection();
      scene.showFloatingText(GAME.WIDTH / 2, GAME.HEIGHT / 2, "FORCE LEVEL UP", "#00ff88");
    }
  }
  if (name === "X" && !scene.isGameOver) {
    // Grant 50 XP
    if (scene.xpManager) {
      scene.xpManager.addXP(50);
      scene.showFloatingText(GAME.WIDTH / 2, GAME.HEIGHT / 2, "+50 XP", "#00ff88");
    }
  }
}

export function skipToBoss(scene) {
  // Clear all enemies and bullets
  scene.enemies.getChildren().forEach((e) => e.destroy());
  scene.enemyBullets.getChildren().forEach((b) => {
    b.setActive(false).setVisible(false);
    b.body.enable = false;
  });
  if (scene.boss.active) {
    if (scene.boss.aaxBoss) {
      scene.boss.aaxBoss.cleanup?.();
      scene.boss.aaxBoss.active = false;
    }
    scene.boss.active = false;
    scene.boss.sprite?.destroy();
    scene.boss.sprite = null;
    scene.hud.hideBossHP();
  }
  scene.waveManager.currentWave = 9; // Will increment to 10 in startNextWave
  scene.waveManager.waveActive = false;
  scene.waveManager.startNextWave();
}

export function skipToNextWave(scene) {
  // Clear all enemies and bullets
  scene.enemies.getChildren().forEach((e) => e.destroy());
  scene.enemyBullets.getChildren().forEach((b) => {
    b.setActive(false).setVisible(false);
    b.body.enable = false;
  });
  scene.waveManager.waveActive = false;
  scene.waveManager.startNextWave();
}

export function killAllEnemies(scene) {
  scene.enemies.getChildren().forEach((e) => {
    if (e.active) {
      scene.explosions.play(e.x, e.y, "enemy_explosion", 9, 0.12);
      e.destroy();
    }
  });
  if (scene.boss.active) {
    if (scene.boss.aaxBoss?.active) {
      scene.boss.aaxBoss.hp = 0;
      scene.boss.aaxBoss.defeat();
    } else if (scene.boss.sprite?.active) {
      scene.boss.hp = 0;
      scene.boss.defeat();
    }
  }
}
