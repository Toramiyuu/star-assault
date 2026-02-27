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

    // Craftpix enemy explosion (8 frames, 1-indexed source files)
    for (let i = 0; i < 8; i++) {
      const frameNum = String(i + 1).padStart(3, '0');  // '001' through '008'
      this.load.image(
        `craftpix_enemy_expl_${i}`,
        'assets/craftpix-981156-space-shooter-game-kit/Enemy-spaceship-game-sprites/PNG/Ship_Effects_Sprites/Explosion_' + frameNum + '.png'
      );
    }

    // Craftpix enemy ship fragments (4 sprites)
    for (let i = 1; i <= 4; i++) {
      this.load.image(
        `craftpix_enemy_frag_${i}`,
        'assets/craftpix-981156-space-shooter-game-kit/Enemy-spaceship-game-sprites/PNG/Ship_Effects/Ship_Fragment_' + i + '.png'
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

    // Upgrade icons — loaded as _src, circle-clipped in create() via _processUpgradeIcons()
    for (const id of [
      'G01','G02','G03','G04','G05','G06',
      'Gn01','Gn02','Gn03','Gn04','Gn05','Gn06','Gn07','Gn08',
      'B01','B02','B03','B04','B05','B06','B07','B08',
      'P01','P02','P03','P04','P05','P06','P07','P08',
      'R01','R02','R03','R04','R05','R06',
      'Au01','Au02','Au03','Au04',
    ]) {
      this.load.image(`upgrade_${id}_src`, `assets/upgrade-icons/${id}.png`);
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
    this._processUpgradeIcons();  // circle-clip AI-generated upgrade icons
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

  // Circle-clip AI-generated upgrade icons so they display as perfect circles
  // with no white/grey square corners from the source PNG.
  _processUpgradeIcons() {
    const SIZE = 172; // matches ICON_R * 2 in UpgradeCardUI (86 * 2)
    const ids = [
      'G01','G02','G03','G04','G05','G06',
      'Gn01','Gn02','Gn03','Gn04','Gn05','Gn06','Gn07','Gn08',
      'B01','B02','B03','B04','B05','B06','B07','B08',
      'P01','P02','P03','P04','P05','P06','P07','P08',
      'R01','R02','R03','R04','R05','R06',
      'Au01','Au02','Au03','Au04',
    ];
    for (const id of ids) {
      const srcKey = `upgrade_${id}_src`;
      if (!this.textures.exists(srcKey)) continue;
      const src = this.textures.get(srcKey).source[0];
      if (!src || src.width < 32) { this.textures.remove(srcKey); continue; }
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(src.image, 0, 0, SIZE, SIZE);
        ctx.restore();
        this.textures.addCanvas(`upgrade_${id}`, canvas);
      } catch (e) {
        console.warn(`[upgrade-icons] circle-clip failed for ${id}:`, e.message);
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

    const colorDist = (r, g, b, ref) =>
      Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]);

    // A pixel is "neutral" (candidate background) if it is grayish and not near-black.
    // This prevents colourful sprite pixels (orange flames, red horns, skin tones) from
    // ever being added to the BG palette or accidentally removed as background.
    const isNeutral = (r, g, b) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return (max - min) < 40 && max > 60;
    };

    // Sample full edge perimeter — skip saturated/dark sprite pixels that happen to
    // reach the image border (e.g. flames touching the top edge of the boss sprite).
    const edgeColors = new Map();
    const sampleEdge = (ex, ey) => {
      const i = idx(ex, ey);
      const r = px[i], g = px[i + 1], b = px[i + 2];
      if (!isNeutral(r, g, b)) return;
      const qr = Math.round(r / 5) * 5;
      const qg = Math.round(g / 5) * 5;
      const qb = Math.round(b / 5) * 5;
      const key = `${qr},${qg},${qb}`;
      edgeColors.set(key, (edgeColors.get(key) || 0) + 1);
    };
    for (let ex = 0; ex < w; ex += 3) {
      sampleEdge(ex, 0); sampleEdge(ex, 1); sampleEdge(ex, h - 2); sampleEdge(ex, h - 1);
    }
    for (let ey = 0; ey < h; ey += 3) {
      sampleEdge(0, ey); sampleEdge(1, ey); sampleEdge(w - 2, ey); sampleEdge(w - 1, ey);
    }

    // No neutral edge pixels → no removable background
    if (edgeColors.size === 0) { ctx.putImageData(data, 0, 0); return canvas; }

    const sorted = [...edgeColors.entries()].sort((a, b) => b[1] - a[1]);
    const bgPalette = sorted.slice(0, 4).map(e => e[0].split(',').map(Number));

    const THRESH = 60;

    // A pixel is BG only if it is neutral AND colour-close to the detected palette.
    // Colourful pixels are never classified as background regardless of palette proximity.
    const isBG = (x, y) => {
      const i = idx(x, y);
      const r = px[i], g = px[i + 1], b = px[i + 2];
      if (!isNeutral(r, g, b)) return false;
      return bgPalette.some(ref => colorDist(r, g, b, ref) < THRESH);
    };

    // Pass 1: flood-fill from all edge BG pixels (removes outer/connected background)
    const removed = new Uint8Array(w * h);
    const queue = [];
    for (let x = 0; x < w; x++) {
      if (isBG(x, 0))     { removed[x] = 1;               queue.push(x); }
      if (isBG(x, h - 1)) { const bi = (h - 1) * w + x;  removed[bi] = 1; queue.push(bi); }
    }
    for (let y = 1; y < h - 1; y++) {
      if (isBG(0, y))     { removed[y * w] = 1;           queue.push(y * w); }
      if (isBG(w - 1, y)) { const ri = y * w + w - 1;     removed[ri] = 1; queue.push(ri); }
    }
    let head = 0;
    while (head < queue.length) {
      const pi = queue[head++];
      const x = pi % w, y = (pi - x) / w;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const npi = ny * w + nx;
        if (removed[npi]) continue;
        if (isBG(nx, ny)) { removed[npi] = 1; queue.push(npi); }
      }
    }

    // Pass 2: remove interior BG islands — checkerboard regions enclosed by sprite
    // content (e.g. the area behind the boss head, surrounded by flames) are never
    // reachable from the edge by the flood-fill above, so sweep globally and remove
    // any remaining pixel that still qualifies as BG.
    for (let i = 0; i < w * h; i++) {
      if (!removed[i]) {
        const x = i % w, y = (i - x) / w;
        if (isBG(x, y)) removed[i] = 1;
      }
    }

    // Apply transparency
    for (let i = 0; i < w * h; i++) {
      if (removed[i]) px[i * 4 + 3] = 0;
    }

    // Anti-alias: fade neutral edge pixels bordering removed areas
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pi = y * w + x;
        if (removed[pi]) continue;
        const i = idx(x, y);
        const r = px[i], g = px[i + 1], b = px[i + 2];
        if (!isNeutral(r, g, b)) continue;
        const minDist = Math.min(...bgPalette.map(ref => colorDist(r, g, b, ref)));
        if (minDist < THRESH) {
          let bordersRemoved = false;
          for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && removed[ny * w + nx]) {
              bordersRemoved = true; break;
            }
          }
          if (bordersRemoved) {
            const t = 1 - minDist / THRESH;
            px[i + 3] = Math.floor(px[i + 3] * (1 - t * 0.85));
          }
        }
      }
    }

    ctx.putImageData(data, 0, 0);
    return canvas;
  }
}
