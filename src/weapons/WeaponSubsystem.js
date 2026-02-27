export class WeaponSubsystem {
  constructor(scene, manager, id) {
    this.scene = scene;
    this.manager = manager;
    this.id = id;
    this.level = 0;
    this.lastFireTime = 0;
    this.active = true;
  }

  getBaseInterval() {
    return 1000; // Override per weapon
  }

  getInterval() {
    return this.getBaseInterval() * this.manager.getCooldownMultiplier();
  }

  setLevel(level) {
    this.level = level;
    this.onLevelChanged(level);
  }

  onLevelChanged(level) {
    // Override per weapon
  }

  update(time, delta) {
    if (!this.active) return;
    const interval = this.getInterval();
    if (time - this.lastFireTime >= interval) {
      this.lastFireTime = time;
      this.fire(time);
    }
  }

  fire(time) {
    // Override per weapon
  }

  drawEffects(graphics, time) {
    // Override for continuous rendering (lasers, vortexes)
  }

  spawnBullet(x, y, vx, vy, opts = {}) {
    return this.manager.spawnBullet(x, y, vx, vy, opts);
  }

  getEnemiesInRadius(cx, cy, radius) {
    return this.manager.getEnemiesInRadius(cx, cy, radius);
  }

  getClosestEnemy() {
    const player = this.scene.player;
    if (!player?.active) return null;
    let closest = null;
    let minDist = Infinity;
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const d = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
      if (d < minDist) { minDist = d; closest = e; }
    });
    const boss = this.scene.boss;
    if (boss?.active && boss.aaxBoss?.sprite?.active) {
      const d = Math.abs(boss.aaxBoss.sprite.x - player.x) + Math.abs(boss.aaxBoss.sprite.y - player.y);
      if (d < minDist) closest = boss.aaxBoss.sprite;
    }
    return closest;
  }

  onCreate() {
    // Override
  }

  onDestroy() {
    // Override
  }
}
