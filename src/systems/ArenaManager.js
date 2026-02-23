const STORAGE_KEY = 'star-assault-arena';

export class ArenaManager {
    constructor() {
        this.data = this.load();
    }

    static getWeekString() {
        const now = new Date();
        const year = now.getFullYear();
        const jan1 = new Date(year, 0, 1);
        const days = Math.floor((now - jan1) / 86400000);
        const week = Math.ceil((days + jan1.getDay() + 1) / 7);
        return `${year}-W${String(week).padStart(2, '0')}`;
    }

    static getSeed() {
        return `starassault-${ArenaManager.getWeekString()}`;
    }

    static getDayOfWeek() {
        return new Date().getDay();
    }

    static getDateString() {
        return new Date().toISOString().slice(0, 10);
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch { /* ignore */ }
        return this.createFresh();
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch { /* ignore */ }
    }

    createFresh() {
        return {
            currentWeek: ArenaManager.getWeekString(),
            seed: ArenaManager.getSeed(),
            attempts: [],
            highScore: 0,
            leaderboard: [],
        };
    }

    ensureCurrentWeek() {
        const week = ArenaManager.getWeekString();
        if (this.data.currentWeek !== week) {
            if (this.data.highScore > 0) {
                this.data.leaderboard.push({
                    week: this.data.currentWeek,
                    score: this.data.highScore,
                    attempts: this.data.attempts.length,
                });
            }
            this.data.currentWeek = week;
            this.data.seed = ArenaManager.getSeed();
            this.data.attempts = [];
            this.data.highScore = 0;
            this.save();
        }
    }

    hasPlayedToday() {
        this.ensureCurrentWeek();
        const today = ArenaManager.getDateString();
        return this.data.attempts.some(a => a.date === today);
    }

    canPlay() {
        return !this.hasPlayedToday();
    }

    recordAttempt(breakdown) {
        this.ensureCurrentWeek();
        const attempt = {
            date: ArenaManager.getDateString(),
            day: this.data.attempts.length + 1,
            score: breakdown.finalScore,
            wave: breakdown.waveReached,
            timestamp: new Date().toISOString(),
            breakdown,
        };
        this.data.attempts.push(attempt);
        if (breakdown.finalScore > this.data.highScore) {
            this.data.highScore = breakdown.finalScore;
        }
        this.save();
        return attempt;
    }

    getAttemptsThisWeek() {
        this.ensureCurrentWeek();
        return this.data.attempts;
    }

    getHighScore() {
        this.ensureCurrentWeek();
        return this.data.highScore;
    }

    getSeed() {
        this.ensureCurrentWeek();
        return this.data.seed;
    }

    getWeekDisplay() {
        this.ensureCurrentWeek();
        return this.data.currentWeek;
    }

    getAttemptNumber() {
        this.ensureCurrentWeek();
        return this.data.attempts.length + 1;
    }

    getLeaderboardHistory() {
        return this.data.leaderboard || [];
    }
}
