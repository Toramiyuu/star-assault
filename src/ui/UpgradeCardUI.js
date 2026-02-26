import { GAME } from '../config/constants.js';
import { RARITY_COLORS } from '../config/upgrades.js';

const CARD_W = 920;
const CARD_H = 260;
const CARD_GAP = 25;
const OVERLAY_ALPHA = 0.65;

const TYPE_COLORS = {
  weapon:  0xff4444,
  passive: 0x4488ff,
  defense: 0x44ffff,
  utility: 0x88ff44,
  cosmic:  0xffc107,
};

const TYPE_LETTERS = {
  weapon:  'W',
  passive: 'P',
  defense: 'D',
  utility: 'U',
  cosmic:  'C',
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

    // Dark overlay - full screen, fades in 150ms
    this.overlay = this.scene.add.graphics().setDepth(300);
    this.overlay.fillStyle(0x000000, OVERLAY_ALPHA);
    this.overlay.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 150,
    });

    // Total stack height: 3 cards + 2 gaps = 3*260 + 2*25 = 830
    const totalStackH = cardData.length * CARD_H + (cardData.length - 1) * CARD_GAP;
    const headerGap = 30;
    const headerSize = 40;
    // Center the header+cards block vertically
    const blockH = headerSize + headerGap + totalStackH;
    const blockTopY = (GAME.HEIGHT - blockH) / 2;

    // "CHOOSE AN UPGRADE" header
    this.headerText = this.scene.add.text(GAME.WIDTH / 2, blockTopY + headerSize / 2, 'CHOOSE AN UPGRADE', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(350).setAlpha(0);

    this.scene.tweens.add({
      targets: this.headerText,
      alpha: 1,
      duration: 150,
    });

    // Card positions - stacked vertically, centered horizontally
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

    // Determine upgrade properties (heal cards use overrides)
    const upgrade = data.upgrade;
    const currentLevel = data.currentLevel;
    const isLevelUp = data.isLevelUp;
    const rarity = isHeal ? 'GREY' : upgrade.rarity;
    const type = isHeal ? 'heal' : upgrade.type;

    const colors = RARITY_COLORS[rarity];
    const borderColor = Phaser.Display.Color.HexStringToColor(colors.border).color;
    const bannerColor = Phaser.Display.Color.HexStringToColor(colors.banner).color;

    // Card name, stat, description
    const cardName = isHeal ? 'EMERGENCY REPAIR' : upgrade.name;
    const nextLevel = currentLevel + 1;
    const levelData = isHeal ? null : upgrade.levels[nextLevel - 1];
    const cardStat = isHeal ? 'Restore 1 HP' : (levelData?.label || '');
    const cardDesc = isHeal ? 'Quick patch job' : upgrade.description;
    const maxLevel = isHeal ? 1 : upgrade.maxLevel;

    // Type circle properties
    const circleColor = isHeal ? 0xff4444 : (TYPE_COLORS[type] || 0xaaaaaa);
    const circleLetter = isHeal ? 'H' : (TYPE_LETTERS[type] || '?');

    // Container starts offscreen to the right, slides in
    const container = scene.add.container(GAME.WIDTH + CARD_W, y).setDepth(350);

    // --- Card background ---
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
    bg.lineStyle(3, borderColor, 1);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
    container.add(bg);

    // --- Rarity banner (top strip, 28px tall, full width) ---
    const bannerH = 28;
    const bannerGfx = scene.add.graphics();
    bannerGfx.fillStyle(bannerColor, 1);
    bannerGfx.fillRoundedRect(
      -CARD_W / 2 + 3, -CARD_H / 2 + 3,
      CARD_W - 6, bannerH,
      { tl: 10, tr: 10, bl: 0, br: 0 }
    );
    container.add(bannerGfx);

    const rarityLabel = scene.add.text(0, -CARD_H / 2 + 3 + bannerH / 2, rarity, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(rarityLabel);

    // --- LEFT zone (160px): Type circle with letter ---
    const leftCenterX = -CARD_W / 2 + 80;
    const contentTopY = -CARD_H / 2 + bannerH + 3;
    const contentH = CARD_H - bannerH - 3;
    const leftCenterY = contentTopY + contentH / 2;

    const circleGfx = scene.add.graphics();
    circleGfx.fillStyle(circleColor, 1);
    circleGfx.fillCircle(leftCenterX, leftCenterY, 45);
    container.add(circleGfx);

    const letterText = scene.add.text(leftCenterX, leftCenterY, circleLetter, {
      fontFamily: 'Arial',
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(letterText);

    // --- CENTER zone: Name, stat, level dots ---
    const centerZoneX = -CARD_W / 2 + 160;
    const centerZoneW = CARD_W - 160 - 280;
    const centerMidX = centerZoneX + centerZoneW / 2;

    // Upgrade name
    const nameText = scene.add.text(centerMidX, leftCenterY - 40, cardName, {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: centerZoneW - 10 },
      align: 'center',
    }).setOrigin(0.5);
    container.add(nameText);

    // Stat for current level
    const statText = scene.add.text(centerMidX, leftCenterY + 5, cardStat, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FF8800',
      fontStyle: 'bold',
      wordWrap: { width: centerZoneW - 10 },
      align: 'center',
    }).setOrigin(0.5);
    container.add(statText);

    // Level dots or "NEW"
    let levelStr;
    if (isHeal) {
      levelStr = '';
    } else if (isLevelUp) {
      levelStr = '';
      for (let i = 1; i <= maxLevel; i++) {
        levelStr += i <= currentLevel ? '\u25CF ' : '\u25CB ';
      }
      levelStr = levelStr.trim();
    } else {
      levelStr = 'NEW';
    }

    if (levelStr) {
      const levelText = scene.add.text(centerMidX, leftCenterY + 42, levelStr, {
        fontFamily: 'Arial',
        fontSize: isLevelUp ? '22px' : '20px',
        color: isLevelUp ? '#ffcc00' : '#FF8800',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(levelText);
    }

    // --- RIGHT zone (280px): Description ---
    const rightZoneX = CARD_W / 2 - 280;
    const rightMidX = rightZoneX + 140;

    const descText = scene.add.text(rightMidX, leftCenterY, cardDesc, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#AAAAAA',
      wordWrap: { width: 260 },
      align: 'left',
      lineSpacing: 4,
    }).setOrigin(0.5);
    container.add(descText);

    // --- Interactive hit zone ---
    const hitZone = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitZone);

    // Hover effects
    hitZone.on('pointerover', () => {
      if (!this.active) return;
      scene.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 100,
      });
      // Brighten border
      bg.clear();
      bg.fillStyle(0x1a1a2e, 0.95);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      bg.lineStyle(4, 0xffffff, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
    });

    hitZone.on('pointerout', () => {
      if (!this.active) return;
      scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
      // Restore original border
      bg.clear();
      bg.fillStyle(0x1a1a2e, 0.95);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      bg.lineStyle(3, borderColor, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
    });

    // Click/tap handler
    hitZone.on('pointerdown', () => {
      if (!this.active) return;
      this.active = false;
      this._onCardSelected(container, data);
    });

    // Slide-in animation from RIGHT with stagger (350ms, 100ms delay between, Back.easeOut)
    scene.tweens.add({
      targets: container,
      x: x,
      duration: 350,
      delay: index * 100,
      ease: 'Back.easeOut',
    });

    // Gold shimmer: alpha tween on bg graphics
    if (rarity === 'GOLD') {
      scene.tweens.add({
        targets: bg,
        alpha: { from: 0.6, to: 1.0 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    return { container, data };
  }

  _onCardSelected(selectedContainer, data) {
    const scene = this.scene;

    // Selected card scales up to 1.12
    scene.tweens.add({
      targets: selectedContainer,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 200,
    });

    // Other cards fade to 0
    this.cards.forEach(({ container }) => {
      if (container !== selectedContainer) {
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 200,
        });
      }
    });

    // Apply upgrade after brief delay, then cleanup and resume
    scene.time.paused = false; // Need timer to work
    scene.time.delayedCall(300, () => {
      // Apply the upgrade
      this.upgradeManager.applyUpgrade(data.upgrade.id);

      // Cleanup
      this._cleanup();

      // Resume game
      this.upgradeManager.onCardSelected();
    });
  }

  _cleanup() {
    this.cards.forEach(({ container }) => container.destroy());
    this.cards = [];
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.headerText) {
      this.headerText.destroy();
      this.headerText = null;
    }
    this.active = false;
  }
}
