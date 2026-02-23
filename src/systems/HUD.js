import { GAME, PLAYER } from '../config/constants.js';

export class HUD {
    constructor(scene) {
        this.scene = scene;

        this.scoreText = scene.add.text(GAME.WIDTH - 40, 40, '0', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

        this.hpDots = [];
        for (let i = 0; i < PLAYER.MAX_HP; i++) {
            const dot = scene.add.image(60 + i * 55, 60, 'health_dot');
            dot.setScale(0.35).setDepth(100).setScrollFactor(0);
            this.hpDots.push(dot);
        }

        this.waveText = scene.add.text(GAME.WIDTH / 2, 40, 'WAVE 1', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#aaaaaa',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);

        this.bossBarBg = null;
        this.bossBarFill = null;
        this.bossLabel = null;
    }

    update(score, hp) {
        this.scoreText.setText(score.toString());
        for (let i = 0; i < this.hpDots.length; i++) {
            this.hpDots[i].setVisible(i < hp);
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

    hideBossHP() {
        if (this.bossBarBg) { this.bossBarBg.destroy(); this.bossBarBg = null; }
        if (this.bossBarFill) { this.bossBarFill.destroy(); this.bossBarFill = null; }
        if (this.bossLabel) { this.bossLabel.destroy(); this.bossLabel = null; }
    }
}
