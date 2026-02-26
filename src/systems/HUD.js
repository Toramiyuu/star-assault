import { GAME } from '../config/constants.js';

// ── Layout constants (all HUD coordinates in 1080x1920 canvas px) ──────────
const BAR_W    = 320;   // shield/HP bar width   (reduced from 560 — still readable, less intrusive)
const BAR_H    = 18;    // shield/HP bar height  (reduced from 30  — slim bar, less coverage)
const BAR_X    = 80;    // bar left edge         (was 60)
const SHIELD_Y = 80;    // shield bar center Y   (pushed up from 160 — closer to top edge, out of action zone)
const HEALTH_Y = 106;   // HP bar center Y       (8px gap after 18px bar, from 200)
const CORNER_R = 6;     // border-radius         (unchanged)

const XP_BAR_W = 920;                            // XP bar width (was 400)
const XP_BAR_H = 20;                             // XP bar height (was 12)
const XP_BAR_X = (GAME.WIDTH - XP_BAR_W) / 2;   // centered
const XP_BAR_Y = 1872;                           // very bottom edge (was 1760 — pushes bar to screen bottom)

const BOSS_BAR_W = 700;                          // boss bar width (was 600)
const BOSS_BAR_H = 28;                           // boss bar height (was 24)
const BOSS_BAR_Y = 140;                          // below HEALTH_Y cluster (was 260 — 26px gap below health bar)
// boss bar X is always centered: (GAME.WIDTH - BOSS_BAR_W) / 2

export class HUD {
    constructor(scene) {
        this.scene = scene;

        // Dark gradient behind top HUD for readability — slim strip, gameplay shows through
        const hudBg = scene.add.graphics().setDepth(99).setScrollFactor(0);
        hudBg.fillStyle(0x000000, 0.55);
        hudBg.fillRect(0, 0, GAME.WIDTH, 120);   // covers shield+HP bar cluster (Y=0-120)
        hudBg.fillStyle(0x000000, 0.20);
        hudBg.fillRect(0, 120, GAME.WIDTH, 10);  // thin fade edge

        this.scoreText = scene.add.text(GAME.WIDTH - 40, 60, '0', {
            fontFamily: 'Arial',
            fontSize: '52px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

        // Shield icon — text label instead of emoji for cross-platform consistency
        this.shieldIcon = scene.add.text(BAR_X - 10, SHIELD_Y, 'SH', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#4488ff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(101).setScrollFactor(0);

        // Health icon — text label instead of emoji
        this.healthIcon = scene.add.text(BAR_X - 10, HEALTH_Y, 'HP', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(101).setScrollFactor(0);

        // Shield bar graphics
        this.shieldBarBg = scene.add.graphics().setDepth(100).setScrollFactor(0);
        this.shieldBarFill = scene.add.graphics().setDepth(101).setScrollFactor(0);
        this.shieldGlow = scene.add.graphics().setDepth(100).setScrollFactor(0);

        // Health bar graphics
        this.healthBarBg = scene.add.graphics().setDepth(100).setScrollFactor(0);
        this.healthBarFill = scene.add.graphics().setDepth(101).setScrollFactor(0);

        // Draw static backgrounds
        this._drawBarBg(this.shieldBarBg, BAR_X, SHIELD_Y, 0x4488ff);
        this._drawBarBg(this.healthBarBg, BAR_X, HEALTH_Y, 0xff4444);

        // Track previous values for tween
        this._shieldRatio = 1;
        this._healthRatio = 1;
        this._shieldRecharging = false;
        this._lowHpPulsing = false;
        this._shieldProxy = { ratio: 1 };  // tween target — 'ratio' has no underscore prefix so Phaser will tween it
        this._healthProxy = { ratio: 1 };  // tween target
        this._shieldRatioTarget = 1;       // dirty-flag comparator (not tweened, underscore OK)
        this._healthRatioTarget = 1;       // dirty-flag comparator
        this._shieldTween = null;          // handle for stop-before-retarget
        this._healthTween = null;

        // Per-frame dirty-flag tracking for fill redraws
        this._lastShieldRatioDrawn = -1;   // dirty-flag: last ratio actually rendered to shieldBarFill
        this._lastHealthRatioDrawn = -1;   // dirty-flag: last ratio actually rendered to healthBarFill

        this.waveText = scene.add.text(GAME.WIDTH / 2, 60, 'WAVE 1', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#aaaaaa',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

        // Kill streak counter (top-right, above score)
        this.streakText = scene.add.text(GAME.WIDTH - 40, 10, '', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(1, 0).setDepth(101).setScrollFactor(0);

        // XP Bar
        this.xpBarBg = scene.add.graphics().setDepth(100).setScrollFactor(0);
        this.xpBarFill = scene.add.graphics().setDepth(101).setScrollFactor(0);
        this.xpLevelText = scene.add.text(XP_BAR_X, XP_BAR_Y + XP_BAR_H / 2 + 8, 'LV 0', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#FF8800',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0, 0).setDepth(101).setScrollFactor(0);

        // XP bar background at bottom — thin semi-transparent strip, not a gameplay-covering panel
        const xpBotGrad = scene.add.graphics().setDepth(99).setScrollFactor(0);
        xpBotGrad.fillStyle(0x000000, 0.40);
        xpBotGrad.fillRect(0, XP_BAR_Y - XP_BAR_H / 2 - 4, GAME.WIDTH, XP_BAR_H + 8);  // 28px total (XP_BAR_H + 8px padding)

        this.xpBarBg.fillStyle(0x333333, 0.8);
        this.xpBarBg.fillRect(XP_BAR_X, XP_BAR_Y - XP_BAR_H / 2, XP_BAR_W, XP_BAR_H);
        this.xpBarBg.lineStyle(1, 0xFF6600, 0.5);
        this.xpBarBg.strokeRect(XP_BAR_X, XP_BAR_Y - XP_BAR_H / 2, XP_BAR_W, XP_BAR_H);

        this.bossBarBg = null;
        this.bossBarFill = null;
        this.bossLabel = null;
    }

    _drawBarBg(gfx, x, y, borderColor) {
        gfx.fillStyle(0x222222, 0.8);
        gfx.fillRoundedRect(x, y - BAR_H / 2, BAR_W, BAR_H, CORNER_R);
        gfx.lineStyle(1, borderColor, 0.4);
        gfx.strokeRoundedRect(x, y - BAR_H / 2, BAR_W, BAR_H, CORNER_R);
    }

    _getHealthColor(ratio) {
        // Green -> Yellow -> Red gradient
        if (ratio > 0.5) {
            // Green to yellow
            const t = (ratio - 0.5) / 0.5;
            const r = Math.round(255 * (1 - t));
            const g = 255;
            return (r << 16) | (g << 8) | 0;
        } else if (ratio > 0.2) {
            // Yellow to red
            const t = (ratio - 0.2) / 0.3;
            const g = Math.round(255 * t);
            return (0xff << 16) | (g << 8) | 0;
        }
        return 0xff0000;
    }

    update(score, hp) {
        this.scoreText.setText(score.toString());

        const scene = this.scene;

        // Shield bar
        const shieldMax = scene.playerShield || 3;
        const shieldCur = scene.playerShieldCurrent || 0;

        // Shield fill — dirty-flag tween proxy
        const shieldRatioNew = shieldMax > 0 ? Math.max(0, shieldCur / shieldMax) : 0;
        if (shieldRatioNew !== this._shieldRatioTarget) {
            this._shieldRatioTarget = shieldRatioNew;
            if (this._shieldTween) { this._shieldTween.stop(); this._shieldTween = null; }
            this._shieldTween = this.scene.tweens.add({
                targets: this._shieldProxy,
                ratio: shieldRatioNew,
                duration: 150,
                ease: 'Power2.easeOut',
                onComplete: () => { this._shieldTween = null; }
            });
        }

        const shieldRatioNow = this._shieldProxy.ratio;
        if (shieldRatioNow !== this._lastShieldRatioDrawn) {
            this._lastShieldRatioDrawn = shieldRatioNow;
            this.shieldBarFill.clear();
            if (shieldRatioNow > 0) {
                this.shieldBarFill.fillStyle(0x4488ff, 1);
                this.shieldBarFill.fillRoundedRect(
                    BAR_X + 1, SHIELD_Y - BAR_H / 2 + 1,
                    (BAR_W - 2) * shieldRatioNow, BAR_H - 2,
                    CORNER_R
                );
            }
        }

        // Shield recharge glow pulse — intentionally NOT guarded (must animate every frame)
        const isRecharging = scene.shieldRecharging === true;
        this.shieldGlow.clear();
        if (isRecharging && shieldCur < shieldMax) {
            const pulseAlpha = 0.3 + 0.3 * Math.sin(scene.time.now * 0.008);
            this.shieldGlow.fillStyle(0x4488ff, pulseAlpha);
            this.shieldGlow.fillRoundedRect(
                BAR_X - 2, SHIELD_Y - BAR_H / 2 - 2,
                BAR_W + 4, BAR_H + 4,
                CORNER_R + 1
            );
        }

        // Health bar
        const hpMax = scene.playerMaxHP || 5;
        const hpCur = hp;

        // Health fill — dirty-flag tween proxy
        const healthRatioNew = hpMax > 0 ? Math.max(0, hpCur / hpMax) : 0;
        if (healthRatioNew !== this._healthRatioTarget) {
            this._healthRatioTarget = healthRatioNew;
            if (this._healthTween) { this._healthTween.stop(); this._healthTween = null; }
            this._healthTween = this.scene.tweens.add({
                targets: this._healthProxy,
                ratio: healthRatioNew,
                duration: 150,
                ease: 'Power2.easeOut',
                onComplete: () => { this._healthTween = null; }
            });
        }

        const healthRatioNow = this._healthProxy.ratio;
        const lowHpPulsing = (hpCur <= 1 && hpMax > 1);
        if (healthRatioNow !== this._lastHealthRatioDrawn || lowHpPulsing) {
            if (!lowHpPulsing) {
                this._lastHealthRatioDrawn = healthRatioNow;
            }
            this.healthBarFill.clear();
            if (healthRatioNow > 0) {
                const color = this._getHealthColor(healthRatioNow);
                const alpha = lowHpPulsing
                    ? 0.6 + 0.4 * Math.sin(scene.time.now * 0.008)
                    : 1;
                this.healthBarFill.fillStyle(color, alpha);
                this.healthBarFill.fillRoundedRect(
                    BAR_X + 1, HEALTH_Y - BAR_H / 2 + 1,
                    (BAR_W - 2) * healthRatioNow, BAR_H - 2,
                    CORNER_R
                );
            }
        }
    }

    setWave(waveNum) {
        this.waveText.setText(`WAVE ${waveNum}`);
    }

    showBossHP(current, max) {
        const barX = (GAME.WIDTH - BOSS_BAR_W) / 2;

        if (!this.bossBarBg) {
            this.bossBarBg = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
            this.bossBarFill = this.scene.add.graphics().setDepth(101).setScrollFactor(0);
            this.bossLabel = this.scene.add.text(GAME.WIDTH / 2, BOSS_BAR_Y - 22, 'BOSS', {
                fontFamily: 'Arial',
                fontSize: '26px',
                color: '#ff4444',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5, 1).setDepth(101).setScrollFactor(0);
        }

        this.bossBarBg.clear();
        this.bossBarBg.fillStyle(0x333333, 0.8);
        this.bossBarBg.fillRect(barX, BOSS_BAR_Y, BOSS_BAR_W, BOSS_BAR_H);
        this.bossBarBg.lineStyle(2, 0xff4444, 1);
        this.bossBarBg.strokeRect(barX, BOSS_BAR_Y, BOSS_BAR_W, BOSS_BAR_H);

        this.bossBarFill.clear();
        const ratio = Math.max(0, current / max);
        const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffcc00;
        this.bossBarFill.fillStyle(color, 1);
        this.bossBarFill.fillRect(barX + 2, BOSS_BAR_Y + 2, (BOSS_BAR_W - 4) * ratio, BOSS_BAR_H - 4);
    }

    updateXPBar(current, threshold, level) {
        // Uses module-level XP_BAR_W, XP_BAR_H, XP_BAR_X, XP_BAR_Y constants
        this.xpBarFill.clear();
        const ratio = Math.min(current / Math.max(threshold, 1), 1);
        this.xpBarFill.fillStyle(0xFF6600, 1);
        this.xpBarFill.fillRect(
            XP_BAR_X + 1,
            XP_BAR_Y - XP_BAR_H / 2 + 1,
            (XP_BAR_W - 2) * ratio,
            XP_BAR_H - 2
        );
        this.xpLevelText.setText(`LV ${level}`);
    }

    hideBossHP() {
        if (this.bossBarBg) { this.bossBarBg.destroy(); this.bossBarBg = null; }
        if (this.bossBarFill) { this.bossBarFill.destroy(); this.bossBarFill = null; }
        if (this.bossLabel) { this.bossLabel.destroy(); this.bossLabel = null; }
    }

    updateStreak(streak) {
        if (streak <= 0) {
            this.streakText.setVisible(false);
        } else {
            this.streakText.setVisible(true);
            if (streak >= 20) {
                this.streakText.setText(`x${streak} UNSTOPPABLE`);
                this.streakText.setColor('#ff4444');
                this.streakText.setFontSize(40);
            } else if (streak >= 10) {
                this.streakText.setText(`x${streak} ON FIRE`);
                this.streakText.setColor('#ff8800');
                this.streakText.setFontSize(38);
            } else {
                this.streakText.setText(`x${streak}`);
                this.streakText.setColor('#ffffff');
                this.streakText.setFontSize(36);
            }
        }
    }
}
