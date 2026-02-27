import { GAME } from '../config/constants.js';
import { RARITY_COLORS } from '../config/upgrades.js';

const CARD_W = 920;
const CARD_H = 270;
const CARD_GAP = 20;
const OVERLAY_ALPHA = 0.72;

// Rarity → hex for Phaser Graphics
const RARITY_HEX = {
  GREY:   0x9E9E9E,
  GREEN:  0x4CAF50,
  BLUE:   0x2196F3,
  PURPLE: 0x9C27B0,
  RED:    0xF44336,
  GOLD:   0xFFC107,
};

const TYPE_COLORS = {
  weapon:  0xff4444,
  passive: 0x4488ff,
  defense: 0x44ffff,
  utility: 0x88ff44,
  cosmic:  0xffc107,
  heal:    0xff4444,
};

const TYPE_LETTERS = {
  weapon:  'W',
  passive: 'P',
  defense: 'D',
  utility: 'U',
  cosmic:  'C',
  heal:    'H',
};

export class UpgradeCardUI {
  constructor(scene, upgradeManager) {
    this.scene = scene;
    this.upgradeManager = upgradeManager;
    this.overlay = null;
    this.headerText = null;
    this.cards = [];
    this.active = false;
  }

  show(cardData) {
    this.active = true;

    // Dark overlay — full screen, fades in
    this.overlay = this.scene.add.graphics().setDepth(300);
    this.overlay.fillStyle(0x000000, OVERLAY_ALPHA);
    this.overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    this.overlay.setAlpha(0);
    this.scene.tweens.add({ targets: this.overlay, alpha: 1, duration: 180 });

    const totalStackH = cardData.length * CARD_H + (cardData.length - 1) * CARD_GAP;
    const headerGap = 28;
    const headerSize = 44;
    const blockH = headerSize + headerGap + totalStackH;
    const blockTopY = (GAME.HEIGHT - blockH) / 2;

    this.headerText = this.scene.add.text(
      GAME.WIDTH / 2,
      blockTopY + headerSize / 2,
      'CHOOSE AN UPGRADE',
      { fontFamily: 'Arial', fontSize: '44px', color: '#FFD700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(350).setAlpha(0);

    this.scene.tweens.add({ targets: this.headerText, alpha: 1, duration: 180 });

    const firstCardY = blockTopY + headerSize + headerGap + CARD_H / 2;
    const centerX = GAME.WIDTH / 2;

    this.cards = [];
    cardData.forEach((data, i) => {
      const y = firstCardY + i * (CARD_H + CARD_GAP);
      const card = this._createCard(centerX, y, data, i);
      this.cards.push(card);
    });
  }

  _createCard(x, y, data, index) {
    const scene = this.scene;
    const isHeal = data.isHeal === true;

    const upgrade     = data.upgrade;
    const currentLevel = data.currentLevel;
    const isLevelUp   = data.isLevelUp;
    const rarity      = isHeal ? 'GREY' : upgrade.rarity;
    const type        = isHeal ? 'heal' : upgrade.type;

    const rarityHex   = RARITY_HEX[rarity] || 0x9e9e9e;
    const circleColor = isHeal ? TYPE_COLORS.heal : (TYPE_COLORS[type] || 0xaaaaaa);
    const circleLetter = isHeal ? 'H' : (TYPE_LETTERS[type] || '?');

    const cardName = isHeal ? 'EMERGENCY REPAIR' : upgrade.name;
    const nextLevel = currentLevel + 1;
    const levelData = isHeal ? null : upgrade.levels[nextLevel - 1];
    const cardStat  = isHeal ? 'Restore 1 HP' : (levelData?.label || '');
    const cardDesc  = isHeal ? 'Quick patch job' : upgrade.description;
    const maxLevel  = isHeal ? 1 : upgrade.maxLevel;

    // Container starts off-screen right, slides in
    const container = scene.add.container(GAME.WIDTH + CARD_W, y).setDepth(350);

    // ── Background ────────────────────────────────────────────────────
    const bg = scene.add.graphics();
    this._drawCardBg(bg, rarityHex, false);
    container.add(bg);

    // ── Rarity badge — top right ──────────────────────────────────────
    const badgeW = 100, badgeH = 24;
    const badgeX = CARD_W / 2 - badgeW / 2 - 12;
    const badgeY = -CARD_H / 2 + badgeH / 2 + 8;

    const badgeGfx = scene.add.graphics();
    badgeGfx.fillStyle(rarityHex, 0.85);
    badgeGfx.fillRoundedRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
    badgeGfx.lineStyle(1, 0xffffff, 0.4);
    badgeGfx.strokeRoundedRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
    container.add(badgeGfx);

    const rarityLabel = scene.add.text(badgeX, badgeY, rarity, {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(rarityLabel);

    // ── Left zone: upgrade icon (180px wide, centered at x = -CARD_W/2 + 9 + 90 = -CARD_W/2 + 99) ──
    const iconCX = -CARD_W / 2 + 105;
    const iconRadius = 82;

    // Icon backing ring
    const iconGfx = scene.add.graphics();
    iconGfx.fillStyle(0x000000, 0.5);
    iconGfx.fillCircle(iconCX, 0, iconRadius);
    iconGfx.lineStyle(2, rarityHex, 0.6);
    iconGfx.strokeCircle(iconCX, 0, iconRadius);
    container.add(iconGfx);

    // Use loaded texture if available, else fallback to letter circle
    const upgradeId = isHeal ? null : upgrade.id;
    const texKey = upgradeId ? `upgrade_${upgradeId}` : null;
    const hasTexture = texKey &&
      scene.textures.exists(texKey) &&
      scene.textures.get(texKey).source[0]?.width > 4;

    if (hasTexture) {
      const iconImg = scene.add.image(iconCX, 0, texKey);
      iconImg.setDisplaySize(iconRadius * 1.8, iconRadius * 1.8);
      container.add(iconImg);
    } else {
      // Fallback: colored circle with type letter
      const fallbackGfx = scene.add.graphics();
      fallbackGfx.fillStyle(circleColor, 0.9);
      fallbackGfx.fillCircle(iconCX, 0, iconRadius - 4);
      container.add(fallbackGfx);

      const letterText = scene.add.text(iconCX, 0, circleLetter, {
        fontFamily: 'Arial', fontSize: '60px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(letterText);
    }

    // ── Content zone (starts after icon zone) ────────────────────────
    const contentX = -CARD_W / 2 + 205; // left edge of content
    const contentW = 590; // stops before right-side rarity badge

    // Upgrade name
    const nameText = scene.add.text(contentX, -CARD_H / 2 + 30, cardName, {
      fontFamily: 'Arial', fontSize: '30px', color: '#FFFFFF', fontStyle: 'bold',
      wordWrap: { width: contentW },
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // Stat label (amber, prominent)
    const statText = scene.add.text(contentX, -CARD_H / 2 + 30 + 42, cardStat, {
      fontFamily: 'Arial', fontSize: '25px', color: '#FFAA00', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(statText);

    // Level dots or NEW badge
    let levelStr = '';
    if (!isHeal) {
      if (isLevelUp) {
        for (let i = 1; i <= maxLevel; i++) {
          levelStr += i <= currentLevel ? '\u25CF ' : '\u25CB ';
        }
        levelStr = levelStr.trim();
      } else {
        levelStr = 'NEW';
      }
    }
    if (levelStr) {
      const levelText = scene.add.text(contentX, -CARD_H / 2 + 30 + 84, levelStr, {
        fontFamily: 'Arial',
        fontSize: isLevelUp ? '20px' : '18px',
        color:     isLevelUp ? '#FFCC00' : '#FF8800',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      container.add(levelText);
    }

    // Thin separator line
    const sepGfx = scene.add.graphics();
    sepGfx.lineStyle(1, rarityHex, 0.3);
    sepGfx.lineBetween(contentX, -CARD_H / 2 + 30 + 108, contentX + contentW, -CARD_H / 2 + 30 + 108);
    container.add(sepGfx);

    // Description
    const descText = scene.add.text(contentX, CARD_H / 2 - 50, cardDesc, {
      fontFamily: 'Arial', fontSize: '18px', color: '#BBBBBB',
      wordWrap: { width: contentW },
      lineSpacing: 4,
    }).setOrigin(0, 0.5);
    container.add(descText);

    // ── Hit zone ─────────────────────────────────────────────────────
    const hitZone = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitZone);

    hitZone.on('pointerover', () => {
      if (!this.active) return;
      scene.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 90 });
      bg.clear();
      this._drawCardBg(bg, rarityHex, true);
    });

    hitZone.on('pointerout', () => {
      if (!this.active) return;
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 90 });
      bg.clear();
      this._drawCardBg(bg, rarityHex, false);
    });

    hitZone.on('pointerdown', () => {
      if (!this.active) return;
      this.active = false;
      this._onCardSelected(container, data);
    });

    // Slide in from right with stagger
    scene.tweens.add({
      targets: container,
      x,
      duration: 350,
      delay: index * 100,
      ease: 'Back.easeOut',
    });

    // Gold shimmer on GOLD rarity
    if (rarity === 'GOLD') {
      scene.tweens.add({
        targets: bg,
        alpha: { from: 0.7, to: 1.0 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    return { container, data };
  }

  // Draws the card background. Called for initial draw and on hover/out.
  // highlighted = true on hover (brighter glow, white border)
  _drawCardBg(bg, rarityHex, highlighted) {
    // Outer ambient glow
    if (highlighted) {
      bg.lineStyle(14, 0xFFCC44, 0.15);
      bg.strokeRoundedRect(-CARD_W / 2 - 5, -CARD_H / 2 - 5, CARD_W + 10, CARD_H + 10, 16);
      bg.lineStyle(8,  0xFFDD66, 0.28);
      bg.strokeRoundedRect(-CARD_W / 2 - 3, -CARD_H / 2 - 3, CARD_W + 6,  CARD_H + 6,  15);
      bg.lineStyle(4,  0xFFEE88, 0.40);
      bg.strokeRoundedRect(-CARD_W / 2 - 1, -CARD_H / 2 - 1, CARD_W + 2,  CARD_H + 2,  13);
    } else {
      bg.lineStyle(12, 0xFFAA00, 0.05);
      bg.strokeRoundedRect(-CARD_W / 2 - 5, -CARD_H / 2 - 5, CARD_W + 10, CARD_H + 10, 16);
      bg.lineStyle(7,  0xFFBB22, 0.11);
      bg.strokeRoundedRect(-CARD_W / 2 - 3, -CARD_H / 2 - 3, CARD_W + 6,  CARD_H + 6,  15);
      bg.lineStyle(4,  0xFFCC44, 0.18);
      bg.strokeRoundedRect(-CARD_W / 2 - 1, -CARD_H / 2 - 1, CARD_W + 2,  CARD_H + 2,  13);
    }

    // Card body — near-black base
    bg.fillStyle(highlighted ? 0x080820 : 0x060612, 0.97);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);

    // Rarity tint overlay — makes the card color immediately obvious
    bg.fillStyle(rarityHex, highlighted ? 0.18 : 0.12);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);

    // Top color band — strongest rarity presence
    bg.fillStyle(rarityHex, highlighted ? 0.45 : 0.30);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 44, { tl: 12, tr: 12, bl: 0, br: 0 });

    // Left accent bar — thick
    bg.fillStyle(rarityHex, 1);
    bg.fillRoundedRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, 10, CARD_H - 6,
      { tl: 10, tr: 0, bl: 10, br: 0 });

    // Border
    bg.lineStyle(highlighted ? 3 : 2, highlighted ? 0xffffff : rarityHex, highlighted ? 0.9 : 0.85);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
  }

  _onCardSelected(selectedContainer, data) {
    const scene = this.scene;

    scene.tweens.add({ targets: selectedContainer, scaleX: 1.1, scaleY: 1.1, duration: 200 });

    this.cards.forEach(({ container }) => {
      if (container !== selectedContainer) {
        scene.tweens.add({ targets: container, alpha: 0, duration: 200 });
      }
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
    if (this.overlay) { this.overlay.destroy(); this.overlay = null; }
    if (this.headerText) { this.headerText.destroy(); this.headerText = null; }
    this.active = false;
  }
}
