import { killEnemy, flashEnemy } from '../utils/CombatUtils.js';

export function setupCollisions(scene) {
  scene.physics.add.overlap(
    scene.playerBullets,
    scene.enemies,
    (bullet, enemy) => onBulletHitEnemy(scene, bullet, enemy),
    null,
    null,
  );

  // Weapon bullets also hit enemies
  if (scene.weaponManager?.weaponBullets) {
    scene.physics.add.overlap(
      scene.weaponManager.weaponBullets,
      scene.enemies,
      (bullet, enemy) => onBulletHitEnemy(scene, bullet, enemy),
      null,
      null,
    );
  }

  scene.physics.add.overlap(
    scene.enemyBullets,
    scene.player,
    (_player, bullet) => onEnemyBulletHitPlayer(scene, bullet),
    null,
    null,
  );
  scene.physics.add.overlap(
    scene.enemies,
    scene.player,
    (_player, enemy) => onEnemyHitPlayer(scene, enemy),
    null,
    null,
  );
}

export function setupWeaponBulletCollisions(scene) {
  if (!scene.weaponManager?.weaponBullets) return;
  scene.physics.add.overlap(
    scene.weaponManager.weaponBullets,
    scene.enemies,
    (bullet, enemy) => onBulletHitEnemy(scene, bullet, enemy),
    null,
    null,
  );
}

function onBulletHitEnemy(scene, bullet, enemy) {
  if (!bullet.active || !enemy.active) return;

  // Read damage data from bullet
  const damage = bullet.getData('damage') || scene.playerDamage || 10;
  const isCrit = bullet.getData('isCrit') || false;
  const pierce = bullet.getData('pierce') || 0;
  const pierceCount = bullet.getData('pierceCount') || 0;

  // Pierce: don't deactivate if can still pierce
  if (pierceCount < pierce) {
    bullet.setData('pierceCount', pierceCount + 1);
  } else {
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
  }

  scene.scoreManager.shotsHit++;

  // Check enemy shields first
  let shield = enemy.getData('shield') || 0;
  if (shield > 0) {
    shield--;
    enemy.setData('shield', shield);
    // Cyan flash for shield hit (gated — won't stack at high fire rate)
    flashEnemy(scene, enemy, 0x44ffff, 60);
    // Shield pip break effect
    scene.showFloatingText(enemy.x, enemy.y - 50, 'SHIELD!', '#44ffff');
    return; // Shield absorbed the hit
  }

  // Apply damage to HP
  let hp = enemy.getData("hp") - damage;
  enemy.setData("hp", hp);

  // Track damage for life steal
  if (scene.playerLifeSteal > 0) {
    scene.lifeStealDmgAccum = (scene.lifeStealDmgAccum || 0) + damage;
    if (scene.lifeStealDmgAccum >= 100) {
      scene.lifeStealDmgAccum -= 100;
      const healAmt = Math.max(1, Math.floor(scene.playerLifeSteal));
      if (scene.hp < scene.playerMaxHP) {
        scene.hp = Math.min(scene.hp + healAmt, scene.playerMaxHP);
        scene.showFloatingText(scene.player.x, scene.player.y - 60, '+\u2665', '#00ff88');
      }
    }
  }

  // Crit floating text
  if (isCrit) {
    scene.showFloatingText(enemy.x, enemy.y - 50, 'CRIT!', '#ff8c00');
  }

  if (hp <= 0) {
    killEnemy(scene, enemy);
  } else {
    // Hit flash: white for normal, red for elite (signals tankier); crit gets orange follow-up
    if (enemy.getData('isElite')) {
      flashEnemy(scene, enemy, 0xff2222, 50);
    } else {
      flashEnemy(scene, enemy, 0xffffff, 50);
    }
    // Crit: after flash resolves, briefly show orange/gold rim
    if (isCrit && !enemy.getData('isElite')) {
      scene.time.delayedCall(55, () => {
        if (enemy.active) {
          enemy.setTint(0xff8800);
          scene.time.delayedCall(120, () => {
            if (enemy.active) enemy.clearTint();
          });
        }
      });
    }
    // Damage number
    const dmgColor = isCrit ? '#ff8c00' : '#ffffff';
    const dmgSize = isCrit ? '40px' : '28px';
    const t = scene.add.text(enemy.x, enemy.y - 40, Math.round(damage).toString(), {
      fontFamily: 'Arial', fontSize: dmgSize, color: dmgColor,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);
    scene.tweens.add({
      targets: t, y: t.y - 50, alpha: 0, duration: 600,
      onComplete: () => t.destroy(),
    });
    // Knockback — push enemy 10px away from bullet
    const kbAngle = Math.atan2(enemy.y - bullet.y, enemy.x - bullet.x);
    enemy.x += Math.cos(kbAngle) * 10;
    enemy.y += Math.sin(kbAngle) * 10;
  }
}

function onEnemyBulletHitPlayer(scene, bullet) {
  if (!bullet.active) return;
  bullet.setActive(false).setVisible(false);
  bullet.body.enable = false;
  scene.damagePlayer();
}

function onEnemyHitPlayer(scene, enemy) {
  if (!enemy.active) return;
  scene.explosions.play(enemy.x, enemy.y, "enemy_explosion", 9, 0.12);
  enemy.destroy();
  scene.waveManager.onEnemyRemoved();
  scene.damagePlayer();
}
