export class AudioManager {
    constructor() {
        this.ctx = null;
        this.musicGain = null;
        this.musicOsc = null;
        this.enabled = true;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
        } catch { this.enabled = false; }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    tone(freq, duration, type = 'square', vol = 0.2, detune = 0) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    noise(duration, vol = 0.15) {
        if (!this.enabled || !this.ctx) return;
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

    playShoot() {
        this.tone(880, 0.08, 'square', 0.1);
        this.tone(440, 0.05, 'sawtooth', 0.05);
    }

    playEnemyExplosion() {
        this.noise(0.3, 0.2);
        this.tone(120, 0.3, 'sine', 0.15);
    }

    playPlayerHit() {
        this.tone(200, 0.2, 'sawtooth', 0.25);
        this.tone(100, 0.3, 'sine', 0.2);
    }

    playBossExplosion() {
        this.noise(0.8, 0.3);
        this.tone(80, 0.5, 'sine', 0.25);
        this.tone(60, 0.8, 'sine', 0.2);
    }

    playPowerUp() {
        this.tone(523, 0.1, 'sine', 0.2);
        setTimeout(() => this.tone(659, 0.1, 'sine', 0.2), 80);
        setTimeout(() => this.tone(784, 0.15, 'sine', 0.2), 160);
    }

    playWaveComplete() {
        this.tone(440, 0.15, 'sine', 0.15);
        setTimeout(() => this.tone(554, 0.15, 'sine', 0.15), 120);
        setTimeout(() => this.tone(659, 0.15, 'sine', 0.15), 240);
        setTimeout(() => this.tone(880, 0.3, 'sine', 0.2), 360);
    }

    startMusic() {
        if (!this.enabled || !this.ctx) return;
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.04;
        this.musicGain.connect(this.masterGain);

        const bass = this.ctx.createOscillator();
        bass.type = 'triangle';
        bass.frequency.value = 55;
        bass.connect(this.musicGain);
        bass.start();
        this.musicOsc = bass;

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.3;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(bass.frequency);
        lfo.start();
        this.musicLfo = lfo;
    }

    stopMusic() {
        try {
            if (this.musicOsc) { this.musicOsc.stop(); this.musicOsc = null; }
            if (this.musicLfo) { this.musicLfo.stop(); this.musicLfo = null; }
        } catch { /* ignore */ }
    }
}
