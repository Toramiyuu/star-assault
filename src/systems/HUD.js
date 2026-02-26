import { GAME } from '../config/constants.js';

const BAR_W = 220;
const BAR_H = 14;
const BAR_X = 60;
const SHIELD_Y = 24;
const HEALTH_Y = 44;
const CORNER_R = 3;

export class HUD {
    constructor(scene) {
        this.scene = scene;

        // Dark gradient behind top HUD for readability
        const hudBg = scene.add.graphics().setDepth(99).setScrollFactor(0);
        hudBg.fillStyle(0x000000, 0.5);
        hudBg.fillRect(0, 0, GAME.WIDTH, 120);
        hudBg.fillStyle(0x000000, 0.25);
        hudBg.fillRect(0, 120, GAME.WIDTH, 40);

        this.scoreText = scene.add.text(GAME.WIDTH - 40, 40, '0', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

        // Shield icon
        this.shieldIcon = scene.add.text(BAR_X - 30, SHIELD_Y, '\u{1F6E1}', {
            fontFamily: 'Arial',
            fontSize: '16px',
        }).setOrigin(0.5).setDepth(101).setScrollFactor(0);

        // Health icon
        this.healthIcon = scene.add.text(BAR_X - 30, HEALTH_Y, '\u{2764}', {
            fontFamily: 'Arial',
            fontSize: '16px',
        }).setOrigin(0.5).setDepth(101).setScrollFactor(0);

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

        this.waveText = scene.add.text(GAME.WIDTH / 2, 40, 'WAVE 1', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#aaaaaa',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

        // XP Bar
        this.xpBarBg = scene.add.graphics().setDepth(100).setScrollFactor(0);
        this.xpBarFill = scene.add.graphics().setDepth(101).setScrollFactor(0);
        this.xpLevelText = scene.add.text(GAME.WIDTH / 2 - 200, 85, 'LV 0', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#FF8800',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0, 0.5).setDepth(101).setScrollFactor(0);

        // Draw static XP bar background
        const xpBarW = 400;
        const xpBarH = 12;
        const xpBarX = (GAME.WIDTH - xpBarW) / 2;
        const xpBarY = 85;
        this.xpBarBg.fillStyle(0x333333, 0.8);
        this.xpBarBg.fillRect(xpBarX, xpBarY - xpBarH / 2, xpBarW, xpBarH);
        this.xpBarBg.lineStyle(1, 0xFF6600, 0.5);
        this.xpBarBg.strokeRect(xpBarX, xpBarY - xpBarH / 2, xpBarW, xpBarH);

        this.bossBarBg = null;
        this.bossBarFill = null;
        this.bossLabel = null;

        // Kill streak counter (migrated from StatBar)
        this.streakText = scene.add.text(GAME.WIDTH - 40, 10, '', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(1, 0).setDepth(101).setScrollFactor(0);
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
        const shieldRatio = shieldMax > 0 ? Math.max(0, shieldCur / shieldMax) : 0;

        this.shieldBarFill.clear();
        if (shieldRatio > 0) {
            this.shieldBarFill.fillStyle(0x4488ff, 1);
            this.shieldBarFill.fillRoundedRect(
                BAR_X + 1, SHIELD_Y - BAR_H / 2 + 1,
                (BAR_W - 2) * shieldRatio, BAR_H - 2,
                CORNER_R
            );
        }

        // Shield recharge glow pulse
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
        const healthRatio = hpMax > 0 ? Math.max(0, hpCur / hpMax) : 0;

        this.healthBarFill.clear();
        if (healthRatio > 0) {
            const color = this._getHealthColor(healthRatio);
            // Low HP pulse
            let alpha = 1;
            if (hpCur <= 1 && hpMax > 1) {
                alpha = 0.6 + 0.4 * Math.sin(scene.time.now * 0.008);
            }
            this.healthBarFill.fillStyle(color, alpha);
            this.healthBarFill.fillRoundedRect(
                BAR_X + 1, HEALTH_Y - BAR_H / 2 + 1,
                (BAR_W - 2) * healthRatio, BAR_H - 2,
                CORNER_R
            );
        }
    }

    setWave(waveNum) {
        this.waveText.setText(`WAVE ${waveNum}`);
    }

    showBossHP(current, max) {
        const barW = 600;
        const barH = 24;
        const barX = (GAME.WIDTH - barW) / 2;
        const barY = 110;

        if (!this.bossBarBg) {
            this.bossBarBg = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
            this.bossBarFill = this.scene.add.graphics().setDepth(101).setScrollFactor(0);
            this.bossLabel = this.scene.add.text(GAME.WIDTH / 2, barY - 18, 'BOSS', {
                fontFamily: 'Arial',
                fontSize: '22px',
                color: '#ff4444',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5, 1).setDepth(101).setScrollFactor(0);
        }

        this.bossBarBg.clear();
        this.bossBarBg.fillStyle(0x333333, 0.8);
        this.bossBarBg.fillRect(barX, barY, barW, barH);
        this.bossBarBg.lineStyle(2, 0xff4444, 1);
        this.bossBarBg.strokeRect(barX, barY, barW, barH);

        this.bossBarFill.clear();
        const ratio = Math.max(0, current / max);
        const color = ratio > 0.5 ? 0xff4444 : ratio > 0.25 ? 0xff8800 : 0xffcc00;
        this.bossBarFill.fillStyle(color, 1);
        this.bossBarFill.fillRect(barX + 2, barY + 2, (barW - 4) * ratio, barH - 4);
    }

    updateXPBar(current, threshold, level) {
        const xpBarW = 400;
        const xpBarH = 12;
        const xpBarX = (GAME.WIDTH - xpBarW) / 2;
        const xpBarY = 85;

        this.xpBarFill.clear();
        const ratio = Math.min(current / Math.max(threshold, 1), 1);
        this.xpBarFill.fillStyle(0xFF6600, 1);
        this.xpBarFill.fillRect(xpBarX + 1, xpBarY - xpBarH / 2 + 1, (xpBarW - 2) * ratio, xpBarH - 2);

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
                this.streakText.setFontSize(32);
            } else if (streak >= 10) {
                this.streakText.setText(`x${streak} ON FIRE`);
                this.streakText.setColor('#ff8800');
                this.streakText.setFontSize(30);
            } else {
                this.streakText.setText(`x${streak}`);
                this.streakText.setColor('#ffffff');
                this.streakText.setFontSize(28);
            }
        }
    }
}
