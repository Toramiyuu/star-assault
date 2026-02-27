import { Scene } from "phaser";

export class PreloadScene extends Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    const barW = 600;
    const barH = 40;
    const barX = 540 - barW / 2;
    const barY = 960;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barW, barH);

    const progressBar = this.add.graphics();

    const loadingText = this.add
      .text(540, barY - 60, "LOADING...", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x3399ff, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    this.load.image("player", "assets/ships/player.png");
    for (let i = 0; i <= 9; i++) {
      this.load.image(`exhaust_${i}`, `assets/ships/exhaust_${i}.png`);
    }
    for (let i = 1; i <= 7; i++) {
      this.load.image(
        `player_explosion_${i}`,
        `assets/ships/explosion_${i}.png`,
      );
    }
    for (let i = 1; i <= 6; i++) {
      this.load.image(`player_bullet_${i}`, `assets/ships/bullet_${i}.png`);
    }

    for (let i = 1; i <= 6; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`enemy_${id}`, `assets/enemies/enemy_${id}.png`);
      this.load.image(
        `enemy_${id}_damaged`,
        `assets/enemies/enemy_${id}_damaged.png`,
      );
    }
    for (let i = 1; i <= 4; i++) {
      this.load.image(`enemy_bullet_${i}`, `assets/enemies/bullet_${i}.png`);
    }
    for (let i = 0; i <= 8; i++) {
      this.load.image(
        `enemy_explosion_${i}`,
        `assets/enemies/explosion_${i}.png`,
      );
    }

    for (let i = 1; i <= 3; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`boss_${id}`, `assets/bosses/boss_${id}.png`);
    }
    this.load.image("boss-aax-img", "assets/boss-aax.png");
    this.load.image("aax-horn-entry-img", "assets/enteringhornmode.png");
    this.load.image("aax-expressions-img", "assets/expressions.png");
    this.load.image("aax-death-img", "assets/deathanimation.png");

    this.load.image("bg_base", "assets/backgrounds/bg_base.png");
    this.load.image("bg_stars", "assets/backgrounds/bg_stars.png");
    this.load.image("bg_planets", "assets/backgrounds/bg_planets.png");

    for (let i = 1; i <= 6; i++) {
      const id = String(i).padStart(2, "0");
      this.load.image(`meteor_${id}`, `assets/objects/meteor_${id}.png`);
    }

    this.load.image("health_dot", "assets/ui/health_dot.png");
    this.load.image("pause_btn", "assets/ui/pause_btn.png");

    // Drop icons — load AI-generated PNGs, backgrounds stripped in create() via _processDropPNGs()
    for (const type of ['heart', 'shield', 'bomb', 'magnet', 'boost', 'elite_shard']) {
      this.load.image(`drop_${type}_src`, `assets/drops/${type}.png`);
    }

    // Upgrade icons — optional AI-generated PNGs (scripts/generate-upgrade-icons.js)
    // UpgradeCardUI checks textures.exists() and falls back to letter circle if absent
    for (const id of [
      'G01','G02','G03','G04','G05','G06',
      'Gn01','Gn02','Gn03','Gn04','Gn05','Gn06','Gn07','Gn08',
      'B01','B02','B03','B04','B05','B06','B07','B08',
      'P01','P02','P03','P04','P05','P06','P07','P08',
      'R01','R02','R03','R04','R05','R06',
      'Au01','Au02','Au03','Au04',
    ]) {
      this.load.image(`upgrade_${id}`, `assets/upgrade-icons/${id}.png`);
    }

    this.load.audio("sfx_shoot", "assets/sfx/shoot.mp3");
    this.load.audio("sfx_enemy_explosion", "assets/sfx/enemy_explosion.mp3");
    this.load.audio("sfx_player_hit", "assets/sfx/player_hit.mp3");
    this.load.audio("sfx_boss_explosion", "assets/sfx/boss_explosion.mp3");
    this.load.audio("sfx_powerup", "assets/sfx/powerup.mp3");
    this.load.audio("sfx_wave_complete", "assets/sfx/wave_complete.mp3");
    this.load.audio("music_loop", "assets/sfx/music_loop.mp3");
    this.load.audio("sfx_boss_laugh_entry", "assets/sfx/boss_laugh_entry.mp3");
    this.load.audio("sfx_boss_laugh_angry", "assets/sfx/boss_laugh_angry.mp3");
    this.load.audio("sfx_boss_death_scream", "assets/sfx/boss_death_scream.mp3");

    this.load.image("damage_bonus", "assets/powerups/damage_bonus.png");
    this.load.image("rockets_bonus", "assets/powerups/rockets_bonus.png");
    this.load.image("armor_bonus", "assets/powerups/armor_bonus.png");
    this.load.image(
      "enemy_destroy_bonus",
      "assets/powerups/enemy_destroy_bonus.png",
    );
    this.load.image("magnet_bonus", "assets/powerups/magnet_bonus.png");
  }

  create() {
    if (this.textures.exists("boss-aax-img")) {
      const src = this.textures.get("boss-aax-img").source[0];
      if (src.width > 32) {
        const img = this._removeWhiteBG(src.image);
        this.textures.addSpriteSheet("boss-aax", img, {
          frameWidth: Math.floor(src.width / 3),
          frameHeight: Math.floor(src.height / 4),
        });
      }
      this.textures.remove("boss-aax-img");
    }

    const sheetDefs = [
      { rawKey: "aax-horn-entry-img", key: "aax-horn-entry" },
      { rawKey: "aax-expressions-img", key: "aax-expressions" },
      { rawKey: "aax-death-img", key: "aax-death" },
    ];
    for (const { rawKey, key } of sheetDefs) {
      if (this.textures.exists(rawKey)) {
        const src = this.textures.get(rawKey).source[0];
        if (src.width > 32) {
          const cleaned = this._removeWhiteBG(src.image);
          this.textures.addSpriteSheet(key, cleaned, {
            frameWidth: 640,
            frameHeight: 736,
          });
        }
        this.textures.remove(rawKey);
      }
    }

    this._processDropPNGs();      // strip solid backgrounds from AI-generated PNGs
    this._generateDropTextures(); // programmatic fallback for any that didn't load
    this.scene.start("Menu");
  }

  // Strip solid backgrounds from AI-generated drop PNGs (same technique as boss sprites)
  _processDropPNGs() {
    for (const type of ['heart', 'shield', 'bomb', 'magnet', 'boost', 'elite_shard']) {
      const srcKey = `drop_${type}_src`;
      if (!this.textures.exists(srcKey)) continue;
      const src = this.textures.get(srcKey).source[0];
      // Require a real image, not Phaser's tiny error placeholder
      if (src && src.width > 32) {
        try {
          const canvas = this._removeWhiteBG(src.image);
          this.textures.addCanvas(`drop_${type}`, canvas);
        } catch (e) {
          console.warn(`[drops] bg removal failed for ${type}, falling back to programmatic`);
        }
      }
      this.textures.remove(srcKey);
    }
  }

  _generateDropTextures() {
    const SIZE = 80;
    // backing: subtle tinted circle so icon reads against varied backgrounds without a solid box
    const types = {
      heart:        { draw: this._drawHeart.bind(this),       backing: 0x220000 },
      shield:       { draw: this._drawShield.bind(this),      backing: 0x001133 },
      bomb:         { draw: this._drawBomb.bind(this),        backing: 0x221100 },
      magnet:       { draw: this._drawMagnet.bind(this),      backing: 0x003322 },
      boost:        { draw: this._drawBoost.bind(this),       backing: 0x221100 },
      elite_shard:  { draw: this._drawEliteShard.bind(this),  backing: 0x220033 },
    };

    for (const [type, cfg] of Object.entries(types)) {
      // Skip if already registered by _processDropPNGs() (AI PNG loaded successfully)
      if (this.textures.exists(`drop_${type}`)) continue;

      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      // Subtle backing circle (tinted, 0.3 opacity) — gives depth without a visible black box
      gfx.fillStyle(cfg.backing, 0.3);
      gfx.fillCircle(40, 40, 38);
      // Icon shape centered at (40, 40)
      cfg.draw(gfx);
      gfx.generateTexture(`drop_${type}`, SIZE, SIZE);
      gfx.destroy();
    }
  }

  _drawHeart(gfx) {
    const cx = 40, cy = 44, r = 20;
    gfx.fillStyle(0xFF2244, 1);
    gfx.beginPath();
    const pts = [
      { x: cx,           y: cy + r * 0.9  },
      { x: cx - r * 0.55, y: cy + r * 0.35 },
      { x: cx - r * 0.95, y: cy           },
      { x: cx - r * 0.95, y: cy - r * 0.3  },
      { x: cx - r * 0.7,  y: cy - r * 0.6  },
      { x: cx - r * 0.35, y: cy - r * 0.7  },
      { x: cx,            y: cy - r * 0.45  },
      { x: cx + r * 0.35, y: cy - r * 0.7  },
      { x: cx + r * 0.7,  y: cy - r * 0.6  },
      { x: cx + r * 0.95, y: cy - r * 0.3  },
      { x: cx + r * 0.95, y: cy           },
      { x: cx + r * 0.55, y: cy + r * 0.35 },
    ];
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.fillPath();
  }

  _drawShield(gfx) {
    const cx = 40, cy = 40;
    gfx.fillStyle(0x4488FF, 1);
    gfx.beginPath();
    gfx.moveTo(cx,      cy + 30);
    gfx.lineTo(cx - 24, cy +  4);
    gfx.lineTo(cx - 26, cy - 14);
    gfx.lineTo(cx,      cy - 22);
    gfx.lineTo(cx + 26, cy - 14);
    gfx.lineTo(cx + 24, cy +  4);
    gfx.closePath();
    gfx.fillPath();
  }

  _drawBomb(gfx) {
    const cx = 40, cy = 44;
    // Dark gray body (visible on dark background)
    gfx.fillStyle(0x444444, 1);
    gfx.fillCircle(cx, cy, 22);
    // White highlight
    gfx.fillStyle(0xffffff, 0.5);
    gfx.fillCircle(cx - 8, cy - 8, 6);
    // Brown fuse
    gfx.lineStyle(4, 0x886633, 1);
    gfx.beginPath();
    gfx.moveTo(cx, cy - 22);
    gfx.lineTo(cx + 8, cy - 32);
    gfx.strokePath();
    // Orange tip
    gfx.fillStyle(0xFF6600, 1);
    gfx.fillCircle(cx + 8, cy - 33, 4);
    gfx.fillStyle(0xFFDD00, 0.8);
    gfx.fillCircle(cx + 8, cy - 33, 2);
  }

  _drawMagnet(gfx) {
    const cx = 40, cy = 42;
    const armW = 10, armH = 20, gapW = 14;
    gfx.fillStyle(0x00DDCC, 1);
    // Left arm
    gfx.fillRect(cx - gapW - armW, cy - armH, armW, armH + 8);
    // Right arm
    gfx.fillRect(cx + gapW,        cy - armH, armW, armH + 8);
    // Top connecting arc approximated as filled rect + circle
    gfx.fillRect(cx - gapW - armW, cy - armH - 14, gapW * 2 + armW * 2, 14);
    gfx.fillCircle(cx, cy - armH - 7, gapW + armW / 2);
    // Pole tips: left=red, right=blue
    gfx.fillStyle(0xFF2222, 1);
    gfx.fillRect(cx - gapW - armW, cy - 4, armW, 12);
    gfx.fillStyle(0x2222FF, 1);
    gfx.fillRect(cx + gapW,        cy - 4, armW, 12);
  }

  _drawBoost(gfx) {
    const cx = 40, cy = 40;
    gfx.fillStyle(0xFFCC00, 1);
    // Left chevron
    gfx.beginPath();
    gfx.moveTo(cx - 16, cy - 24);
    gfx.lineTo(cx -  4, cy);
    gfx.lineTo(cx - 16, cy + 24);
    gfx.lineTo(cx -  8, cy + 24);
    gfx.lineTo(cx +  4, cy);
    gfx.lineTo(cx -  8, cy - 24);
    gfx.closePath();
    gfx.fillPath();
    // Right chevron
    gfx.beginPath();
    gfx.moveTo(cx +  2, cy - 24);
    gfx.lineTo(cx + 14, cy);
    gfx.lineTo(cx +  2, cy + 24);
    gfx.lineTo(cx + 10, cy + 24);
    gfx.lineTo(cx + 22, cy);
    gfx.lineTo(cx + 10, cy - 24);
    gfx.closePath();
    gfx.fillPath();
  }

  _drawEliteShard(gfx) {
    const cx = 40, cy = 40;
    // Purple gem body
    gfx.fillStyle(0xAA44FF, 1);
    gfx.beginPath();
    gfx.moveTo(cx,      cy - 28);
    gfx.lineTo(cx + 16, cy -  8);
    gfx.lineTo(cx + 18, cy +  8);
    gfx.lineTo(cx,      cy + 28);
    gfx.lineTo(cx - 18, cy +  8);
    gfx.lineTo(cx - 16, cy -  8);
    gfx.closePath();
    gfx.fillPath();
    // Gold inner facet
    gfx.fillStyle(0xFFCC00, 0.6);
    gfx.beginPath();
    gfx.moveTo(cx,     cy - 14);
    gfx.lineTo(cx + 8, cy);
    gfx.lineTo(cx,     cy + 10);
    gfx.lineTo(cx - 8, cy);
    gfx.closePath();
    gfx.fillPath();
  }

  _removeWhiteBG(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    const w = canvas.width;
    const h = canvas.height;

    const idx = (x, y) => (y * w + x) * 4;
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    // Sample corners to identify the two checkerboard colors
    const corners = [
      [0, 0], [1, 0], [0, 1], [1, 1],
      [w - 1, 0], [w - 2, 0], [w - 1, 1],
      [0, h - 1], [1, h - 1], [0, h - 2],
      [w - 1, h - 1], [w - 2, h - 1], [w - 1, h - 2],
    ];
    const cornerColors = new Map();
    for (const [cx, cy] of corners) {
      const i = idx(cx, cy);
      const qr = Math.round(px[i] / 5) * 5;
      const qg = Math.round(px[i + 1] / 5) * 5;
      const qb = Math.round(px[i + 2] / 5) * 5;
      const key = `${qr},${qg},${qb}`;
      cornerColors.set(key, (cornerColors.get(key) || 0) + 1);
    }
    const sorted = [...cornerColors.entries()].sort((a, b) => b[1] - a[1]);
    const colorA = sorted[0][0].split(",").map(Number);
    const colorB = sorted.length > 1 ? sorted[1][0].split(",").map(Number) : colorA;

    const colorDist = (r, g, b, ref) =>
      Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]);
    const THRESH = 55;

    const isBG = (x, y) => {
      const i = idx(x, y);
      const r = px[i], g = px[i + 1], b = px[i + 2];
      return colorDist(r, g, b, colorA) < THRESH || colorDist(r, g, b, colorB) < THRESH;
    };

    // Flood fill from all edge pixels that match background colors
    const removed = new Uint8Array(w * h);
    const queue = [];

    for (let x = 0; x < w; x++) {
      if (isBG(x, 0)) { removed[x] = 1; queue.push(x); }
      const bi = (h - 1) * w + x;
      if (isBG(x, h - 1)) { removed[bi] = 1; queue.push(bi); }
    }
    for (let y = 1; y < h - 1; y++) {
      if (isBG(0, y)) { removed[y * w] = 1; queue.push(y * w); }
      const ri = y * w + w - 1;
      if (isBG(w - 1, y)) { removed[ri] = 1; queue.push(ri); }
    }

    let head = 0;
    while (head < queue.length) {
      const pi = queue[head++];
      const x = pi % w;
      const y = (pi - x) / w;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const npi = ny * w + nx;
        if (removed[npi]) continue;
        if (isBG(nx, ny)) {
          removed[npi] = 1;
          queue.push(npi);
        }
      }
    }

    // Make all flooded pixels transparent
    for (let i = 0; i < w * h; i++) {
      if (removed[i]) px[i * 4 + 3] = 0;
    }

    // Anti-alias edges: fade non-removed pixels that are near bg colors and border removed area
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pi = y * w + x;
        if (removed[pi]) continue;
        const i = idx(x, y);
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const minDist = Math.min(colorDist(r, g, b, colorA), colorDist(r, g, b, colorB));
        if (minDist < 55) {
          let bordersRemoved = false;
          for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && removed[ny * w + nx]) {
              bordersRemoved = true;
              break;
            }
          }
          if (bordersRemoved) {
            const t = 1 - minDist / 55;
            px[i + 3] = Math.floor(px[i + 3] * (1 - t * 0.85));
          }
        }
      }
    }

    ctx.putImageData(data, 0, 0);
    return canvas;
  }
}
