import { GAME } from '../config/constants.js';

// ── DOM refs — grabbed once at module load ──────────────────────────────────
const elShieldPips = document.getElementById('shield-pips');
const elHpPips     = document.getElementById('hp-pips');
const elScore      = document.getElementById('score-text');
const elWave       = document.getElementById('wave-text');
const elStreak     = document.getElementById('streak-text');
const elXpFill     = document.getElementById('xp-fill');
const elXpLevel    = document.getElementById('xp-level');

// Boss bar stays in-canvas (dynamic colors, appears/disappears during boss fight)
const BOSS_BAR_W = 700;
const BOSS_BAR_H = 28;
const BOSS_BAR_Y = 60;   // near top of clear canvas (no HTML HUD above)

export class HUD {
    constructor(scene) {
        this.scene = scene;

        // Dirty-flag cache — skip DOM writes when nothing changed
        this._lastScore           = -1;
        this._lastShieldCur       = -1;
        this._lastShieldMax       = -1;
        this._lastShieldRecharging = false;
        this._lastHpCur           = -1;
        this._lastHpMax           = -1;
        this._lastLowHp           = false;

        // Boss bar (canvas Graphics — kept in-canvas)
        this.bossBarBg   = null;
        this.bossBarFill = null;
        this.bossLabel   = null;
    }

    update(score, hp) {
        // Score
        if (score !== this._lastScore) {
            this._lastScore = score;
            elScore.textContent = score;
        }

        const scene = this.scene;

        // Shield pips
        const shieldMax = scene.playerShield || 3;
        const shieldCur = Math.max(0, Math.min(scene.playerShieldCurrent || 0, shieldMax));
        const isRecharging = scene.shieldRecharging === true && shieldCur < shieldMax;
        if (shieldCur !== this._lastShieldCur || shieldMax !== this._lastShieldMax || isRecharging !== this._lastShieldRecharging) {
            this._lastShieldCur = shieldCur;
            this._lastShieldMax = shieldMax;
            this._lastShieldRecharging = isRecharging;
            this._renderShieldPips(shieldCur, shieldMax, isRecharging);
        }

        // HP pips
        const hpMax = scene.playerMaxHP || 5;
        const hpCur = Math.max(0, Math.min(hp, hpMax));
        const lowHp = hpCur <= 1 && hpMax > 1;
        if (hpCur !== this._lastHpCur || hpMax !== this._lastHpMax || lowHp !== this._lastLowHp) {
            this._lastHpCur = hpCur;
            this._lastHpMax = hpMax;
            this._lastLowHp = lowHp;
            this._renderHpPips(hpCur, hpMax, lowHp);
        }
    }

    _renderShieldPips(cur, max, recharging) {
        let html = '';
        for (let i = 0; i < max; i++) {
            if (i < cur) {
                html += `<div class="pip filled-shield${recharging ? ' recharging' : ''}"></div>`;
            } else {
                html += '<div class="pip empty"></div>';
            }
        }
        elShieldPips.innerHTML = html;
    }

    _renderHpPips(cur, max, lowHp) {
        const color = this._getHealthColor(max > 0 ? cur / max : 0);
        let html = '';
        for (let i = 0; i < max; i++) {
            if (i < cur) {
                html += `<div class="pip filled-hp${lowHp ? ' low-hp' : ''}" style="background:${color}"></div>`;
            } else {
                html += '<div class="pip empty"></div>';
            }
        }
        elHpPips.innerHTML = html;
    }

    _getHealthColor(ratio) {
        if (ratio > 0.5) {
            const t = (ratio - 0.5) / 0.5;
            const r = Math.round(255 * (1 - t));
            return `rgb(${r},255,0)`;
        }
        if (ratio > 0.2) {
            const t = (ratio - 0.2) / 0.3;
            const g = Math.round(255 * t);
            return `rgb(255,${g},0)`;
        }
        return 'rgb(255,0,0)';
    }

    setWave(waveNum) {
        elWave.textContent = `WAVE ${waveNum}`;
    }

    updateXPBar(current, threshold, level) {
        const ratio = Math.min(current / Math.max(threshold, 1), 1);
        elXpFill.style.width = (ratio * 100) + '%';
        elXpLevel.textContent = `LV ${level}`;
    }

    updateStreak(streak) {
        if (streak <= 0) {
            elStreak.textContent = '';
            return;
        }
        if (streak >= 20) {
            elStreak.textContent = `x${streak} UNSTOPPABLE`;
            elStreak.style.color = '#ff4444';
        } else if (streak >= 10) {
            elStreak.textContent = `x${streak} ON FIRE`;
            elStreak.style.color = '#ff8800';
        } else {
            elStreak.textContent = `x${streak}`;
            elStreak.style.color = '#ffffff';
        }
    }

    showBossHP(current, max) {
        const barX = (GAME.WIDTH - BOSS_BAR_W) / 2;

        if (!this.bossBarBg) {
            this.bossBarBg   = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
            this.bossBarFill = this.scene.add.graphics().setDepth(101).setScrollFactor(0);
            this.bossLabel   = this.scene.add.text(GAME.WIDTH / 2, BOSS_BAR_Y - 22, 'BOSS', {
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

    hideBossHP() {
        if (this.bossBarBg)   { this.bossBarBg.destroy();   this.bossBarBg   = null; }
        if (this.bossBarFill) { this.bossBarFill.destroy(); this.bossBarFill = null; }
        if (this.bossLabel)   { this.bossLabel.destroy();   this.bossLabel   = null; }
    }
}
