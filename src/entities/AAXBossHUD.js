import { GAME } from "../config/constants.js";

// DOM HUD top bar is 64px CSS = ~185 game units at 375px viewport (scale 375/1080).
// BAR_Y must be >= 185 to clear it. 200 gives a small safe buffer.
const BAR_W = 900;
const BAR_H = 32;
const BAR_Y = 200;

export function buildHUD(boss) {
  const barX = (GAME.WIDTH - BAR_W) / 2;
  boss.hudBg = boss.scene.add.graphics().setDepth(200).setScrollFactor(0);
  boss.hudFill = boss.scene.add.graphics().setDepth(201).setScrollFactor(0);
  boss.hudLabel = boss.scene.add
    .text(GAME.WIDTH / 2, BAR_Y - 6, "ALEX \u2014 THE FINAL BOSS", {
      fontFamily: "Arial Black, Arial",
      fontSize: "22px",
      color: "#ff4444",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(202)
    .setScrollFactor(0);
  boss.hudBg.fillStyle(0x330000, 0.9);
  boss.hudBg.fillRect(barX, BAR_Y, BAR_W, BAR_H);
  boss.hudBg.lineStyle(2, 0xff4444, 1);
  boss.hudBg.strokeRect(barX, BAR_Y, BAR_W, BAR_H);
  redrawHUDFill(boss);
}

export function redrawHUDFill(boss) {
  if (!boss.hudFill) return;
  const barX = (GAME.WIDTH - BAR_W) / 2;
  const ratio = Math.max(0, boss.hp / boss.maxHP);
  const color =
    ratio > 0.75
      ? 0x00cc44
      : ratio > 0.5
        ? 0xcccc00
        : ratio > 0.25
          ? 0xff8800
          : 0xff2200;
  boss.hudFill.clear();
  boss.hudFill.fillStyle(color, 1);
  boss.hudFill.fillRect(barX + 2, BAR_Y + 2, (BAR_W - 4) * ratio, BAR_H - 4);
}
