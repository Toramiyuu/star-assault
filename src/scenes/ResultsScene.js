import { Scene } from 'phaser';
import { GAME } from '../config/constants.js';
import { ArenaManager } from '../systems/ArenaManager.js';

export class ResultsScene extends Scene {
    constructor() {
        super('Results');
    }

    create(data) {
        this.cameras.main.setBackgroundColor('#000000');

        const breakdown = data?.breakdown;
        const finalScore = breakdown?.finalScore ?? data?.score ?? 0;
        const victory = data?.victory || false;

        const arena = new ArenaManager();
        if (breakdown) {
            arena.recordAttempt(breakdown);
        }

        this.add.text(GAME.WIDTH / 2, 180, victory ? 'VICTORY' : 'GAME OVER', {
            fontFamily: 'Arial',
            fontSize: '80px',
            color: victory ? '#ffd700' : '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5);

        this.add.text(GAME.WIDTH / 2, 330, finalScore.toLocaleString(), {
            fontFamily: 'Arial',
            fontSize: '96px',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        if (breakdown) {
            this.showBreakdown(breakdown, 450);
        }

        const retryBtn = this.add.text(GAME.WIDTH / 2, 1700, '[ TAP TO CONTINUE ]', {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#44ff44',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: retryBtn,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });

        this.input.once('pointerdown', () => {
            this.scene.start('Menu');
        });
    }

    showBreakdown(b, startY) {
        const labelStyle = { fontFamily: 'Arial', fontSize: '28px', color: '#888888' };
        const valueStyle = { fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' };
        const headerStyle = { fontFamily: 'Arial', fontSize: '32px', color: '#3399ff', fontStyle: 'bold' };
        const lx = 200;
        const rx = GAME.WIDTH - 200;
        let y = startY;
        const gap = 44;

        const row = (label, value, style) => {
            this.add.text(lx, y, label, labelStyle).setOrigin(0, 0.5);
            this.add.text(rx, y, String(value), style || valueStyle).setOrigin(1, 0.5);
            y += gap;
        };

        const header = (text) => {
            y += 10;
            this.add.text(GAME.WIDTH / 2, y, text, headerStyle).setOrigin(0.5, 0.5);
            y += gap;
        };

        header('COMBAT');
        row('Wave Reached', b.waveReached);
        row('Total Kills', b.totalKills);
        if (b.kills.basic > 0) row('  Basic', b.kills.basic);
        if (b.kills.elite > 0) row('  Elite', b.kills.elite);
        if (b.kills.boss > 0) row('  Boss', b.kills.boss);
        if (b.kills.mine > 0) row('  Mines', b.kills.mine);

        header('ACCURACY');
        row('Shots Fired', b.shotsFired);
        row('Shots Hit', b.shotsHit);
        row('Accuracy', `${b.accuracy}%`);
        row('Accuracy Mult', `×${b.accuracyMultiplier}`);

        header('BONUSES');
        row('Survival', `${b.survivalSeconds}s (+${b.survivalBonus})`);
        row('Perfect Waves', b.perfectWaves);
        row('Power-ups', b.powerupsCollected);

        header('SCORING');
        row('Base Score', b.baseScore.toLocaleString());
        row('+ Survival', `+${b.survivalBonus.toLocaleString()}`);
        row('× Accuracy', `×${b.accuracyMultiplier}`);

        y += 10;
        this.add.text(GAME.WIDTH / 2, y, `FINAL: ${b.finalScore.toLocaleString()}`, {
            fontFamily: 'Arial',
            fontSize: '44px',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5);
    }
}
