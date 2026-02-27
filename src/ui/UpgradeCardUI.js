import { GAME } from '../config/constants.js';

const CARD_W   = 940;
const CARD_H   = 400;   // taller — fits bigger text comfortably
const CARD_GAP = 16;
const OVERLAY_ALPHA = 0.88;

// Icon layout
const ICON_CX    = -CARD_W / 2 + 126;   // -344
const ICON_R     = 112;                   // bigger icon to match taller card
const CONTENT_X  = ICON_CX + ICON_R + 28; // -204
const CONTENT_RX = CARD_W / 2 - 28;       // +442
const CONTENT_W  = CONTENT_RX - CONTENT_X; // 646

// Rarity colour palette
const RARITY_HEX = {
  GREY:   0x9E9E9E,
  GREEN:  0x4CAF50,
  BLUE:   0x2196F3,
  PURPLE: 0x9C27B0,
  RED:    0xF44336,
  GOLD:   0xFFC107,
};

// Lighter CSS text versions (legible on dark bg)
const RARITY_CSS = {
  GREY:   '#BDBDBD',
  GREEN:  '#81C784',
  BLUE:   '#64B5F6',
  PURPLE: '#CE93D8',
  RED:    '#EF9A9A',
  GOLD:   '#FFE082',
};

// Stat value — vivid per-rarity colour so the number POPS
const STAT_CSS = {
  GREY:   '#E0E0E0',
  GREEN:  '#69F0AE',
  BLUE:   '#40C4FF',
  PURPLE: '#EA80FC',
  RED:    '#FF6E6E',
  GOLD:   '#FFD740',
};

const TYPE_COLORS  = { weapon: 0xff4444, passive: 0x4488ff, defense: 0x44ffff, utility: 0x88ff44, cosmic: 0xffc107, heal: 0xff4444 };
const TYPE_LETTERS = { weapon: 'W', passive: 'P', defense: 'D', utility: 'U', cosmic: 'C', heal: 'H' };

// Height of the solid rarity band at the top of each card
const BAND_H = 54;

export class UpgradeCardUI {
  constructor(scene, upgradeManager) {
    this.scene          = scene;
    this.upgradeManager = upgradeManager;
    this.overlay        = null;
    this.headerText     = null;
    this.cards          = [];
    this.active         = false;
  }

  show(cardData) {
    this.active = true;

    this.overlay = this.scene.add.graphics().setDepth(300);
    this.overlay.fillStyle(0x000000, OVERLAY_ALPHA);
    this.overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    this.overlay.setAlpha(0);
    this.scene.tweens.add({ targets: this.overlay, alpha: 1, duration: 200 });

    const totalStackH = cardData.length * CARD_H + (cardData.length - 1) * CARD_GAP;
    const headerGap   = 28;
    const headerSize  = 56;
    const blockH      = headerSize + headerGap + totalStackH;
    const blockTopY   = (GAME.HEIGHT - blockH) / 2;

    this.headerText = this.scene.add.text(
      GAME.WIDTH / 2,
      blockTopY + headerSize / 2,
      'CHOOSE AN UPGRADE',
      { fontFamily: 'Arial Black, Arial', fontSize: '56px', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 }
    ).setOrigin(0.5).setDepth(350).setAlpha(0);
    this.scene.tweens.add({ targets: this.headerText, alpha: 1, duration: 200 });

    const firstCardY = blockTopY + headerSize + headerGap + CARD_H / 2;
    this.cards = [];
    cardData.forEach((data, i) => {
      const card = this._createCard(GAME.WIDTH / 2, firstCardY + i * (CARD_H + CARD_GAP), data, i);
      this.cards.push(card);
    });
  }

  _createCard(x, y, data, index) {
    const scene    = this.scene;
    const isHeal   = data.isHeal === true;
    const upgrade  = data.upgrade;
    const curLevel = data.currentLevel;
    const isLvlUp  = data.isLevelUp;
    const rarity   = isHeal ? 'GREY' : upgrade.rarity;
    const type     = isHeal ? 'heal' : upgrade.type;

    const rarityHex    = RARITY_HEX[rarity]  || 0x9e9e9e;
    const rarityCSS    = RARITY_CSS[rarity]   || '#BDBDBD';
    const statCSS      = STAT_CSS[rarity]     || '#FFFFFF';
    const circleColor  = isHeal ? TYPE_COLORS.heal : (TYPE_COLORS[type] || 0xaaaaaa);
    const circleLetter = isHeal ? 'H' : (TYPE_LETTERS[type] || '?');

    const cardName  = isHeal ? 'EMERGENCY REPAIR' : upgrade.name;
    const nextLevel = curLevel + 1;
    const levelData = isHeal ? null : upgrade.levels[nextLevel - 1];
    const cardStat  = isHeal ? '+1 HP' : (levelData?.label || '');
    const cardDesc  = isHeal
      ? 'Emergency hull repair — restores one health segment.'
      : upgrade.description;
    const maxLevel = isHeal ? 1 : upgrade.maxLevel;

    const container = scene.add.container(GAME.WIDTH + CARD_W, y).setDepth(350);

    // ── Background ─────────────────────────────────────────────────
    const bg = scene.add.graphics();
    this._drawCardBg(bg, rarityHex, false);
    container.add(bg);

    // ── Icon zone ──────────────────────────────────────────────────
    const iconYOffset = BAND_H / 2 + 8; // shift icon down so it centres in the content area below band
    const iconBg = scene.add.graphics();
    iconBg.fillStyle(0x010108, 0.95);
    iconBg.fillCircle(ICON_CX, iconYOffset, ICON_R);
    container.add(iconBg);

    const upgradeId  = isHeal ? null : upgrade.id;
    const texKey     = upgradeId ? `upgrade_${upgradeId}` : null;
    const hasTexture = texKey && scene.textures.exists(texKey) && scene.textures.get(texKey).source[0]?.width > 4;

    if (hasTexture) {
      const iconImg = scene.add.image(ICON_CX, iconYOffset, texKey);
      iconImg.setDisplaySize(ICON_R * 2, ICON_R * 2);
      container.add(iconImg);
    } else {
      const fg = scene.add.graphics();
      fg.fillStyle(circleColor, 0.90);
      fg.fillCircle(ICON_CX, iconYOffset, ICON_R - 8);
      container.add(fg);
      const lt = scene.add.text(ICON_CX, iconYOffset, circleLetter,
        { fontFamily: 'Arial', fontSize: '78px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      container.add(lt);
    }

    // Rarity ring over icon
    const ring = scene.add.graphics();
    ring.lineStyle(4, rarityHex, 0.95);
    ring.strokeCircle(ICON_CX, iconYOffset, ICON_R);
    // Outer glow ring
    ring.lineStyle(8, rarityHex, 0.20);
    ring.strokeCircle(ICON_CX, iconYOffset, ICON_R + 6);
    container.add(ring);

    // ── Content zone ───────────────────────────────────────────────
    // Vertical positions relative to card centre (top = -CARD_H/2 = -200)
    const bandBottom = -CARD_H / 2 + BAND_H;        // -146
    const contentTop = bandBottom + 16;              // -130

    // Name
    const nameText = scene.add.text(CONTENT_X, contentTop, cardName, {
      fontFamily: 'Arial Black, Arial',
      fontSize:   '38px',
      color:      '#FFFFFF',
      fontStyle:  'bold',
      wordWrap:   { width: CONTENT_W - 80 },
    }).setOrigin(0, 0);
    container.add(nameText);

    // Rarity label — right-aligned in band
    const rarityLabel = scene.add.text(CONTENT_RX, -CARD_H / 2 + BAND_H / 2, rarity, {
      fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(1, 0.5);
    container.add(rarityLabel);

    // Stat — THE HERO: huge, vivid rarity colour
    const statY = contentTop + 56;
    if (cardStat) {
      const statText = scene.add.text(CONTENT_X, statY, cardStat, {
        fontFamily: 'Arial Black, Arial',
        fontSize:   '50px',
        color:      statCSS,
        fontStyle:  'bold',
        stroke:     '#000000',
        strokeThickness: 4,
        wordWrap:   { width: CONTENT_W },
      }).setOrigin(0, 0);
      container.add(statText);
    }

    // Level / NEW
    const levelY = statY + 68;
    if (!isHeal) {
      const levelStr = isLvlUp
        ? Array.from({ length: maxLevel }, (_, i) => i < curLevel ? '◆' : '◇').join(' ')
        : 'NEW';
      const levelText = scene.add.text(CONTENT_X, levelY, levelStr, {
        fontFamily: 'Arial Black, Arial',
        fontSize:   isLvlUp ? '24px' : '22px',
        color:      isLvlUp ? rarityCSS : '#FF9A3C',
        fontStyle:  'bold',
      }).setOrigin(0, 0);
      container.add(levelText);
    }

    // Description — anchored to bottom, much bigger font
    const descY = CARD_H / 2 - 22;
    const descText = scene.add.text(CONTENT_X, descY, cardDesc, {
      fontFamily: 'Arial',
      fontSize:   '26px',
      color:      '#B8CDE0',
      wordWrap:   { width: CONTENT_W },
      lineSpacing: 6,
    }).setOrigin(0, 1);
    container.add(descText);

    // ── Hit zone ───────────────────────────────────────────────────
    const hitZone = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on('pointerover', () => {
      if (!this.active) return;
      scene.tweens.add({ targets: container, scaleX: 1.025, scaleY: 1.025, duration: 80 });
      bg.clear(); this._drawCardBg(bg, rarityHex, true);
    });
    hitZone.on('pointerout', () => {
      if (!this.active) return;
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
      bg.clear(); this._drawCardBg(bg, rarityHex, false);
    });
    hitZone.on('pointerdown', () => {
      if (!this.active) return;
      this.active = false;
      this._onCardSelected(container, data);
    });

    scene.tweens.add({ targets: container, x, duration: 380, delay: index * 90, ease: 'Back.easeOut' });

    if (rarity === 'GOLD') {
      scene.tweens.add({ targets: bg, alpha: { from: 0.80, to: 1.0 }, duration: 700, yoyo: true, repeat: -1 });
    }

    return { container, data };
  }

  _drawCardBg(bg, rarityHex, highlighted) {
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;

    // ── Outer glow (rarity coloured) ─────────────────────────────
    if (highlighted) {
      bg.lineStyle(28, rarityHex, 0.18);
      bg.strokeRoundedRect(-hw-12, -hh-12, CARD_W+24, CARD_H+24, 24);
      bg.lineStyle(14, rarityHex, 0.38);
      bg.strokeRoundedRect(-hw-6,  -hh-6,  CARD_W+12, CARD_H+12, 20);
      bg.lineStyle(5,  rarityHex, 0.65);
      bg.strokeRoundedRect(-hw-1,  -hh-1,  CARD_W+2,  CARD_H+2,  16);
    } else {
      bg.lineStyle(20, rarityHex, 0.08);
      bg.strokeRoundedRect(-hw-8,  -hh-8,  CARD_W+16, CARD_H+16, 24);
      bg.lineStyle(10, rarityHex, 0.18);
      bg.strokeRoundedRect(-hw-4,  -hh-4,  CARD_W+8,  CARD_H+8,  20);
      bg.lineStyle(3,  rarityHex, 0.40);
      bg.strokeRoundedRect(-hw-1,  -hh-1,  CARD_W+2,  CARD_H+2,  16);
    }

    // ── Card body — solid dark ────────────────────────────────────
    bg.fillStyle(highlighted ? 0x0e0e2a : 0x09091e, 0.98);
    bg.fillRoundedRect(-hw, -hh, CARD_W, CARD_H, 16);

    // ── Rarity header band — SOLID, prominent ─────────────────────
    bg.fillStyle(rarityHex, highlighted ? 0.92 : 0.82);
    bg.fillRoundedRect(-hw, -hh, CARD_W, BAND_H, { tl: 16, tr: 16, bl: 0, br: 0 });

    // Diagonal stripes over band — subtle tech texture
    bg.lineStyle(1, 0xffffff, highlighted ? 0.12 : 0.07);
    for (let sx = -hw - BAND_H; sx < hw + BAND_H; sx += 36) {
      bg.lineBetween(sx, -hh + BAND_H, sx + BAND_H, -hh);
    }

    // Subtle rarity wash on card body
    bg.fillStyle(rarityHex, highlighted ? 0.12 : 0.07);
    bg.fillRoundedRect(-hw, -hh + BAND_H, CARD_W, CARD_H - BAND_H, { tl: 0, tr: 0, bl: 16, br: 16 });

    // ── Separator line above description area ─────────────────────
    const sepY = hh - 88;
    bg.lineStyle(1, rarityHex, highlighted ? 0.50 : 0.30);
    bg.lineBetween(CONTENT_X, sepY, hw - 28, sepY);

    // ── Corner bracket ornaments ──────────────────────────────────
    const bracketLen = 22;
    const bracketAlpha = highlighted ? 0.80 : 0.45;
    bg.lineStyle(2, rarityHex, bracketAlpha);
    // Bottom-left
    bg.lineBetween(-hw + 16, hh - 16, -hw + 16 + bracketLen, hh - 16);
    bg.lineBetween(-hw + 16, hh - 16, -hw + 16, hh - 16 - bracketLen);
    // Bottom-right
    bg.lineBetween(hw - 16, hh - 16, hw - 16 - bracketLen, hh - 16);
    bg.lineBetween(hw - 16, hh - 16, hw - 16, hh - 16 - bracketLen);

    // ── Border ────────────────────────────────────────────────────
    bg.lineStyle(
      highlighted ? 3 : 2,
      highlighted ? 0xffffff : rarityHex,
      highlighted ? 0.95 : 0.80
    );
    bg.strokeRoundedRect(-hw, -hh, CARD_W, CARD_H, 16);

    // Inner highlight line along top of card body (below band)
    bg.lineStyle(1, 0xffffff, highlighted ? 0.14 : 0.06);
    bg.lineBetween(-hw + 16, -hh + BAND_H + 1, hw - 16, -hh + BAND_H + 1);
  }

  _onCardSelected(selectedContainer, data) {
    const scene = this.scene;
    scene.tweens.add({ targets: selectedContainer, scaleX: 1.07, scaleY: 1.07, duration: 160 });
    this.cards.forEach(({ container }) => {
      if (container !== selectedContainer) scene.tweens.add({ targets: container, alpha: 0, duration: 160 });
    });
    scene.time.paused = false;
    scene.time.delayedCall(300, () => {
      this.upgradeManager.applyUpgrade(data.upgrade.id);
      this._cleanup();
      this.upgradeManager.onCardSelected();
    });
  }

  _cleanup() {
    this.cards.forEach(({ container }) => container.destroy());
    this.cards = [];
    if (this.overlay)    { this.overlay.destroy();    this.overlay    = null; }
    if (this.headerText) { this.headerText.destroy(); this.headerText = null; }
    this.active = false;
  }
}
