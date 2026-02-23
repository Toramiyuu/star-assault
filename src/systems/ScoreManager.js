import { SCORING } from '../config/constants.js';

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.kills = { basic: 0, elite: 0, boss: 0, mine: 0 };
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.powerupsCollected = 0;
        this.perfectWaves = 0;
        this.startTime = Date.now();
        this.waveReached = 0;
        this.scoreMultiplier = 1;
    }

    addKill(type) {
        let points = 0;
        if (type === 'mine') {
            this.kills.mine++;
            points = SCORING.MINE_DESTROY;
        } else if (type === 'elite') {
            this.kills.elite++;
            points = SCORING.ELITE_KILL;
        } else {
            this.kills.basic++;
            points = SCORING.BASIC_KILL;
        }
        const earned = points * this.scoreMultiplier;
        this.score += earned;
        return earned;
    }

    addBossKill(wave) {
        this.kills.boss++;
        const points = (SCORING.BOSS_KILL_BASE + wave * SCORING.BOSS_KILL_WAVE_BONUS) * this.scoreMultiplier;
        this.score += points;
        return points;
    }

    addPerfectWave() {
        this.perfectWaves++;
        this.score += SCORING.PERFECT_WAVE;
    }

    addPowerup() {
        this.powerupsCollected++;
        this.score += SCORING.POWERUP_COLLECT * this.scoreMultiplier;
    }

    getSurvivalSeconds() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    getSurvivalBonus() {
        return this.getSurvivalSeconds() * SCORING.SURVIVAL_PER_SECOND;
    }

    getAccuracyRatio() {
        if (this.shotsFired === 0) return 1.0;
        return this.shotsHit / this.shotsFired;
    }

    getAccuracyMultiplier() {
        const ratio = this.getAccuracyRatio();
        const range = SCORING.ACCURACY_MAX_MULTIPLIER - SCORING.ACCURACY_MIN_MULTIPLIER;
        return SCORING.ACCURACY_MIN_MULTIPLIER + ratio * range;
    }

    getFinalScore() {
        const survivalBonus = this.getSurvivalBonus();
        const accuracyMult = this.getAccuracyMultiplier();
        return Math.floor((this.score + survivalBonus) * accuracyMult);
    }

    getBreakdown() {
        const survivalBonus = this.getSurvivalBonus();
        const accuracyMult = this.getAccuracyMultiplier();
        const baseTotal = this.score + survivalBonus;
        return {
            baseScore: this.score,
            kills: { ...this.kills },
            totalKills: this.kills.basic + this.kills.elite + this.kills.boss + this.kills.mine,
            shotsFired: this.shotsFired,
            shotsHit: this.shotsHit,
            accuracy: Math.round(this.getAccuracyRatio() * 100),
            accuracyMultiplier: Math.round(accuracyMult * 100) / 100,
            survivalSeconds: this.getSurvivalSeconds(),
            survivalBonus,
            perfectWaves: this.perfectWaves,
            powerupsCollected: this.powerupsCollected,
            waveReached: this.waveReached,
            finalScore: Math.floor(baseTotal * accuracyMult),
        };
    }
}
