import { ProceduralMusic } from './ProceduralMusic.js';

export class AudioManager {
    constructor() {
        this.scene = null;
        this.enabled = true;
        this.ctx = null;
        this.masterGain = null;
        this.proceduralMusic = new ProceduralMusic();
    }

    /** Call from GameScene.create() — pass `this` (the scene). */
    init(scene) {
        this.scene = scene;
        this.hasSFX = scene.cache.audio.exists("sfx_shoot");

        // Always create Web Audio context (for procedural music + SFX fallback)
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3;
                this.masterGain.connect(this.ctx.destination);
            } catch {
                this.enabled = false;
            }
        }

        if (this.ctx) {
            this.proceduralMusic.init(this.ctx);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    // ── Play helpers (Phaser audio) ───────────────────────────────
    _play(key, volume = 0.5) {
        if (!this.enabled || !this.scene) return;
        if (this.hasSFX && this.scene.cache.audio.exists(key)) {
            this.scene.sound.play(key, { volume });
        }
    }

    playShoot() {
        if (this.hasSFX) return this._play("sfx_shoot", 0.35);
        this._tone(880, 0.08, "square", 0.1);
        this._tone(440, 0.05, "sawtooth", 0.05);
    }

    playEnemyExplosion() {
        if (this.hasSFX) return this._play("sfx_enemy_explosion", 0.5);
        this._noise(0.3, 0.2);
        this._tone(120, 0.3, "sine", 0.15);
    }

    playPlayerHit() {
        if (this.hasSFX) return this._play("sfx_player_hit", 0.6);
        this._tone(200, 0.2, "sawtooth", 0.25);
        this._tone(100, 0.3, "sine", 0.2);
    }

    playBossExplosion() {
        if (this.hasSFX) return this._play("sfx_boss_explosion", 0.7);
        this._noise(0.8, 0.3);
        this._tone(80, 0.5, "sine", 0.25);
        this._tone(60, 0.8, "sine", 0.2);
    }

    playShieldHit() {
        // Metallic ping — shield absorbs hit
        this._tone(600, 0.08, "sine", 0.15);
        this._tone(1200, 0.06, "square", 0.08);
    }

    playShieldBreak() {
        // Glass shatter — descending noise + tone
        this._noise(0.25, 0.2);
        this._tone(800, 0.1, "sawtooth", 0.15);
        this._tone(400, 0.15, "sawtooth", 0.1);
    }

    playShieldRecharge() {
        // Rising chime — shield pip restored
        this._tone(440, 0.08, "sine", 0.1);
        setTimeout(() => this._tone(660, 0.08, "sine", 0.1), 60);
        setTimeout(() => this._tone(880, 0.12, "sine", 0.12), 120);
    }

    playPowerUp() {
        if (this.hasSFX) return this._play("sfx_powerup", 0.5);
        this._tone(523, 0.1, "sine", 0.2);
        setTimeout(() => this._tone(659, 0.1, "sine", 0.2), 80);
        setTimeout(() => this._tone(784, 0.15, "sine", 0.2), 160);
    }

    playWaveComplete() {
        if (this.hasSFX) return this._play("sfx_wave_complete", 0.5);
        this._tone(440, 0.15, "sine", 0.15);
        setTimeout(() => this._tone(554, 0.15, "sine", 0.15), 120);
        setTimeout(() => this._tone(659, 0.15, "sine", 0.15), 240);
        setTimeout(() => this._tone(880, 0.3, "sine", 0.2), 360);
    }

    playBossLaughEntry() {
        this._play("sfx_boss_laugh_entry", 0.7);
    }

    playBossLaughAngry() {
        this._play("sfx_boss_laugh_angry", 0.8);
    }

    playBossDeathScream() {
        this._play("sfx_boss_death_scream", 0.8);
    }

    // ── Music ─────────────────────────────────────────────────────
    startMusic() {
        if (!this.enabled) return;
        this.proceduralMusic.start('cruise');
    }

    /** Crossfade to a new music phase: 'cruise', 'combat', or 'boss' */
    setMusicPhase(phase) {
        if (!this.enabled) return;
        this.proceduralMusic.transition(phase);
    }

    stopMusic() {
        this.proceduralMusic.stop();
    }

    // ── Web Audio fallback (oscillator / noise) ───────────────────
    _tone(freq, duration, type = "square", vol = 0.2) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    _noise(duration, vol = 0.15) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }
}
