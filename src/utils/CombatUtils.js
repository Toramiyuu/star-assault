/**
 * CombatUtils.js - Shared combat helper functions
 *
 * killEnemy() consolidates all kill side-effects so every weapon
 * (bullets, TwinLaser, bomb AoE, PhotonDevastator) fires the same
 * event chain: explosion, audio, score, kill streak, XP, ground drop,
 * Nebula Rounds, Death Nova, destroy.
 *
 * flashEnemy() provides a timer-gated hit flash so rapid fire
 * doesn't cause visual stacking/flickering.
 */

/**
 * Kill an enemy and fire all associated side-effects.
 * Safe to call from any weapon — double-call guard prevents issues
 * when multiple damage sources (e.g., TwinLaser linger + next tick) overlap.
 *
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} enemy
 */
export function killEnemy(scene, enemy) {
  // 1. Double-call guard — prevent double-kill from TwinLaser lingering
  if (!enemy.active) return;
  enemy.setActive(false).setVisible(false);

  // 2. Capture position before deactivation
  const x = enemy.x;
  const y = enemy.y;

  // 3. Read enemy metadata
  const enemyType = enemy.getData('enemyType') || 'grunt';
  const isElite = enemy.getData('isElite') || false;
  const bomberState = enemy.getData('bomberState');

  // 4. Explosion + audio
  scene.explosions.play(x, y, 'enemy_explosion', 9, 0.12);
  scene.audio.playEnemyExplosion();

  // 5. Camera shake
  scene.cameras.main.shake(80, 0.003);

  // 6. Score
  const killType = isElite ? 'elite' : 'basic';
  const pts = scene.scoreManager.addKill(killType) * scene.powerups.getScoreMultiplier();
  scene.score = scene.scoreManager.score;

  // 7. Floating score text
  scene.showFloatingText(x, y - 30, `+${pts}`, '#ffffff');

  // 8. Kill streak
  scene.killStreak = (scene.killStreak || 0) + 1;

  // 9. XP orb
  if (scene.xpManager) {
    let xp = scene.xpManager.getXPForEnemy(enemyType);
    if (isElite) xp = Math.round(xp * 2.5);
    scene.xpManager.spawnOrb(x, y, xp);
  }

  // 10. Ground drop
  if (scene.groundDrops) {
    if (enemyType === 'bomber' && bomberState !== 'detonate') {
      scene.groundDrops.spawnGuaranteed(x, y, 'bomb');
    } else {
      scene.groundDrops.trySpawnDrop(x, y, isElite);
    }
  }

  // 11. Nebula Rounds: create poison cloud at kill position
  if (scene.nebulaRoundsActive && scene.weaponManager?.weapons?.get('B07')) {
    scene.weaponManager.weapons.get('B07').createCloud(x, y);
  }

  // 12. Death Nova check
  if (scene.upgradeManager) {
    scene.upgradeManager.checkDeathNova(x, y);
  }

  // 13. Cleanup
  enemy.destroy();
  scene.waveManager.onEnemyRemoved();
}

/**
 * Flash an enemy sprite with a color for a short duration.
 * Timer-gate pattern: cancels any pending restore before setting a new one,
 * so rapid fire doesn't stack flashes or leave enemies stuck in tint.
 *
 * After the flash duration, restores the appropriate tint:
 *   - Elite enemies (isElite data = true): gold tint 0xffd700
 *   - Enemies with baseTint data: restores that tint
 *   - All others: clearTint()
 *
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} enemy
 * @param {number} flashColor  - Phaser color integer (e.g. 0xffffff, 0xff2222, 0x44ffff)
 * @param {number} duration    - Flash duration in ms (e.g. 50)
 */
export function flashEnemy(scene, enemy, flashColor, duration) {
  if (!enemy.active) return;

  // Cancel any pending flash-restore timer
  const existingTimer = enemy.getData('_flashTimer');
  if (existingTimer) {
    existingTimer.remove(false);
    enemy.setData('_flashTimer', null);
  }

  // Apply flash
  enemy.setTintFill(flashColor);

  // Schedule restore
  const timer = scene.time.delayedCall(duration, () => {
    if (enemy.active) {
      if (enemy.getData('isElite')) {
        enemy.setTint(0xffd700);
      } else {
        const bt = enemy.getData('baseTint');
        bt ? enemy.setTint(bt) : enemy.clearTint();
      }
    }
    enemy.setData('_flashTimer', null);
  });

  enemy.setData('_flashTimer', timer);
}
