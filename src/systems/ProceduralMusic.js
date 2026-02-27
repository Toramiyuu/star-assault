// Procedural music engine — Web Audio step sequencer with phase-based tracks
// Three phases: cruise (early waves), combat (mid waves), boss (boss fights)

const N = {
  E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00, B3: 246.94,
  E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99,
};

// ── Phase definitions ───────────────────────────────────────────────

const PHASES = {
  // Waves 1-4: chill space cruise
  cruise: {
    bpm: 118,
    bass: {
      seq: [N.A2,0,0,0,0,0,0,0, N.A2,0,0,0,0,0,0,0,
            N.F2,0,0,0,0,0,0,0, N.E2,0,0,0,0,0,0,0],
      wave: 'sawtooth', cutoff: 300, vol: 0.2, dur: 0.3,
    },
    lead: {
      seq: [0,0,0,0,0,0,0,0, N.A4,0,N.C5,0,N.E5,0,N.C5,0,
            0,0,0,0,0,0,0,0, N.F4,0,N.A4,0,N.C5,0,N.A4,0],
      wave: 'square', cutoff: 1500, vol: 0.06, dur: 0.15,
    },
    kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  },

  // Waves 5-9: driving combat
  combat: {
    bpm: 130,
    bass: {
      seq: [N.A2,0,0,0, N.A2,0,0,0, N.C3,0,0,0, N.C3,0,0,0,
            N.D3,0,0,0, N.D3,0,0,0, N.E3,0,0,0, N.E3,0,0,0],
      wave: 'sawtooth', cutoff: 500, vol: 0.25, dur: 0.2,
    },
    lead: {
      seq: [N.A4,0,0,0, N.C5,0,0,0, N.E5,0,N.D5,0, N.C5,0,0,0,
            N.A4,0,0,0, N.G4,0,0,0, N.A4,0,0,0, 0,0,0,0],
      wave: 'square', cutoff: 2500, vol: 0.08, dur: 0.12,
    },
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  },

  // Boss battles: epic, dark, intense
  boss: {
    bpm: 142,
    bass: {
      seq: [N.E2,0,N.E2,0, N.E2,0,0,0, N.G2,0,N.G2,0, N.G2,0,0,0,
            N.A2,0,N.A2,0, N.B2,0,N.B2,0, N.E2,0,N.E2,0, N.E2,0,0,N.E2],
      wave: 'sawtooth', cutoff: 600, vol: 0.3, dur: 0.12,
    },
    lead: {
      seq: [N.E5,0,0,0, N.D5,0,N.B4,0, N.A4,0,0,0, N.G4,0,0,0,
            N.E5,0,N.G5,0, N.E5,0,N.D5,0, N.B4,0,0,0, N.A4,0,0,N.B4],
      wave: 'sawtooth', cutoff: 3000, vol: 0.1, dur: 0.1,
    },
    arp: {
      seq: [N.E4,N.B4,N.E5,N.B4, N.E4,N.B4,N.E5,N.B4,
            N.E4,N.B4,N.E5,N.B4, N.E4,N.B4,N.E5,N.B4],
      wave: 'square', cutoff: 2000, vol: 0.04, dur: 0.05,
    },
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,1],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
};

// ── Engine ──────────────────────────────────────────────────────────

export class ProceduralMusic {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.playing = false;
    this.phase = null;
    this.step = 0;
    this.nextTime = 0;
    this.timerId = null;
    this.layerGain = null;
    this.noiseBuffer = null;
  }

  /** Call with a shared AudioContext from AudioManager */
  init(audioCtx) {
    this.ctx = audioCtx;
    this.masterGain = audioCtx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(audioCtx.destination);

    // Pre-generate reusable noise buffer (1 second)
    const sr = audioCtx.sampleRate;
    this.noiseBuffer = audioCtx.createBuffer(1, sr, sr);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1;
  }

  start(phaseName) {
    if (!this.ctx || !PHASES[phaseName]) return;
    this.stop();
    this.phase = phaseName;
    this.step = 0;
    this.playing = true;

    this.layerGain = this.ctx.createGain();
    this.layerGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.layerGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.5);
    this.layerGain.connect(this.masterGain);

    this.nextTime = this.ctx.currentTime + 0.05;
    this._schedule();
  }

  /** Crossfade to a new music phase */
  transition(newPhase) {
    if (!this.ctx || !PHASES[newPhase]) return;
    if (this.phase === newPhase && this.playing) return;

    if (!this.playing) {
      this.start(newPhase);
      return;
    }

    // Fade out old layer over 2s
    const oldGain = this.layerGain;
    if (oldGain) {
      const now = this.ctx.currentTime;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + 2);
      setTimeout(() => { try { oldGain.disconnect(); } catch {} }, 2500);
    }

    clearTimeout(this.timerId);

    // Start new phase, fade in over 2s
    this.phase = newPhase;
    this.step = 0;
    this.layerGain = this.ctx.createGain();
    this.layerGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.layerGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
    this.layerGain.connect(this.masterGain);

    this.nextTime = this.ctx.currentTime + 0.1;
    this._schedule();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timerId);
    if (this.layerGain) {
      const now = this.ctx.currentTime;
      this.layerGain.gain.cancelScheduledValues(now);
      this.layerGain.gain.setValueAtTime(this.layerGain.gain.value, now);
      this.layerGain.gain.linearRampToValueAtTime(0, now + 0.5);
      const g = this.layerGain;
      setTimeout(() => { try { g.disconnect(); } catch {} }, 600);
      this.layerGain = null;
    }
  }

  // ── Scheduler (lookahead pattern) ─────────────────────────────────

  _schedule() {
    if (!this.playing) return;
    const def = PHASES[this.phase];
    if (!def) return;

    const ahead = 0.15; // schedule 150ms ahead
    const stepDur = 60 / def.bpm / 4; // 16th note duration

    while (this.nextTime < this.ctx.currentTime + ahead) {
      this._playStep(this.step, this.nextTime, def, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % def.bass.seq.length;
    }

    this.timerId = setTimeout(() => this._schedule(), 25);
  }

  _playStep(step, time, def) {
    if (!this.layerGain) return;

    // Bass
    const bassFreq = def.bass.seq[step % def.bass.seq.length];
    if (bassFreq) {
      this._tone(bassFreq, time, def.bass.dur, def.bass.wave, def.bass.cutoff, def.bass.vol);
    }

    // Lead
    const leadFreq = def.lead.seq[step % def.lead.seq.length];
    if (leadFreq) {
      this._tone(leadFreq, time, def.lead.dur, def.lead.wave, def.lead.cutoff, def.lead.vol);
    }

    // Arpeggio (boss only)
    if (def.arp) {
      const arpFreq = def.arp.seq[step % def.arp.seq.length];
      if (arpFreq) {
        this._tone(arpFreq, time, def.arp.dur, def.arp.wave, def.arp.cutoff, def.arp.vol);
      }
    }

    // Drums (16-step loop)
    const ds = step % 16;
    if (def.kick[ds])  this._kick(time);
    if (def.snare[ds]) this._snare(time);
    if (def.hihat[ds]) this._hihat(time);
  }

  // ── Instruments ───────────────────────────────────────────────────

  _tone(freq, time, dur, wave, cutoff, vol) {
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    flt.Q.value = 3;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(flt);
    flt.connect(env);
    env.connect(this.layerGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  _kick(time) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.5, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(env);
    env.connect(this.layerGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  _snare(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 3000;
    flt.Q.value = 1;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.35, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    src.connect(flt);
    flt.connect(env);
    env.connect(this.layerGain);
    src.start(time);
    src.stop(time + 0.15);
  }

  _hihat(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 8000;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.15, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    src.connect(flt);
    flt.connect(env);
    env.connect(this.layerGain);
    src.start(time);
    src.stop(time + 0.06);
  }
}
