import { WeaponSubsystem } from './WeaponSubsystem.js';
import { GAME } from '../config/constants.js';

export class EventHorizon extends WeaponSubsystem {
  constructor(scene, manager, id) {
    super(scene, manager, id);
    this.vortexX = GAME.WIDTH / 2;
    this.vortexY = 100;
    this.lastDamageTick = 0;
    this.damageTickInterval = 500;
  }

  getBaseInterval() {
    // Not used for pull; only the damage tick at L3 uses timing
    return 99999;
  }

  getPullRadius() {
    const baseRadius = this.level >= 2 ? 300 : 200;
    const blastArea = this.scene.playerBlastArea || 1;
    return baseRadius * blastArea;
  }

  getPullStrength() {
    return this.level >= 2 ? 80 : 50;
  }

  update(time, delta) {
    if (!this.active) return;

    const radius = this.getPullRadius();
    const strength = this.getPullStrength();
    const enemies = this.getEnemiesInRadius(this.vortexX, this.vortexY, radius);

    // Pull enemies toward vortex center
    const dt = delta / 1000; // convert ms to seconds
    for (const e of enemies) {
      const dx = this.vortexX - e.x;
      const dy = this.vortexY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      e.x += nx * strength * dt;
      e.y += ny * strength * dt;
    }

    // L3: deal 50 DMG/s via ticks every 500ms
    if (this.level >= 3 && time - this.lastDamageTick >= this.damageTickInterval) {
      this.lastDamageTick = time;
      const damagePerTick = 50 * (this.damageTickInterval / 1000); // 50 DMG/s * 0.5s = 25 per tick
      this.manager.damageEnemiesInRadius(this.vortexX, this.vortexY, radius, damagePerTick);
    }
  }

  fire() {
    // EventHorizon does not fire bullets
  }

  drawEffects(graphics, time) {
    if (!this.active) return;

    const cx = this.vortexX;
    const cy = this.vortexY;
    const radius = this.getPullRadius();
    const t = time / 1000;

    // Draw spinning concentric circles
    const numRings = 5;
    for (let i = 0; i < numRings; i++) {
      const ringRadius = (radius / numRings) * (i + 1);
      const alpha = 0.15 + (0.1 * (numRings - i) / numRings);
      const rotOffset = t * (2 + i * 0.5); // different spin speed per ring

      // Draw ring as segmented arcs for spinning effect
      const segments = 8;
      for (let s = 0; s < segments; s++) {
        const startAngle = rotOffset + (s * Math.PI * 2) / segments;
        const endAngle = startAngle + (Math.PI * 2) / segments * 0.6;

        graphics.lineStyle(2, 0x8844ff, alpha);
        graphics.beginPath();
        const steps = 12;
        for (let p = 0; p <= steps; p++) {
          const angle = startAngle + (endAngle - startAngle) * (p / steps);
          const px = cx + Math.cos(angle) * ringRadius;
          const py = cy + Math.sin(angle) * ringRadius;
          if (p === 0) graphics.moveTo(px, py);
          else graphics.lineTo(px, py);
        }
        graphics.strokePath();
      }
    }

    // Draw center glow
    const coreAlpha = 0.3 + Math.sin(t * 4) * 0.1;
    graphics.fillStyle(0xaa66ff, coreAlpha);
    graphics.fillCircle(cx, cy, 15);
    graphics.fillStyle(0xffffff, coreAlpha * 0.5);
    graphics.fillCircle(cx, cy, 6);

    // Draw outer boundary
    graphics.lineStyle(1, 0x6633cc, 0.2);
    graphics.strokeCircle(cx, cy, radius);
  }

  onCreate() {
    // Vortex is placed immediately
  }

  onDestroy() {
    // Nothing to clean up
  }
}
