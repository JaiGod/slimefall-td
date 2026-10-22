/**
 * audio.js — 100% procedural audio (no audio files = tiny download, zero licensing issues).
 *
 *  • SFX: synthesized blips, booms and zaps with per-sound throttling.
 *  • Music: a generative sequencer with three moods (menu / battle / boss) and
 *    an `intensity` value (0..1) that fades layers in and out — the soundtrack
 *    reacts live to what is happening on the field.
 *
 * Music and SFX can each be toggled. `?music=off` in the URL disables music.
 */

const SCALES = {
  menu:   { root: 57, steps: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], bpm: 92 },   // A major-pentatonic feel
  battle: { root: 50, steps: [0, 2, 3, 5, 7, 9, 10], prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], bpm: 116 }, // D dorian
  boss:   { root: 45, steps: [0, 1, 3, 5, 7, 8, 10], prog: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [-4, 0, 3]], bpm: 132 },    // A phrygian
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true; this.sfxOn = true;
    this.musicVol = 0.5; this.sfxVol = 0.6;
    this.mood = 'menu'; this.intensity = 0.2; this.targetIntensity = 0.2;
    this.step = 0; this.nextTime = 0; this.timer = null;
    this.last = {}; // throttle timestamps
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
    // gentle compressor keeps 300 simultaneous pops from clipping
    this.comp = this.ctx.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 6; this.comp.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? this.musicVol * 0.55 : 0; this.musicBus.connect(this.comp);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? this.sfxVol : 0; this.sfxBus.connect(this.comp);
    // shared noise buffer
    const len = this.ctx.sampleRate; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // simple feedback delay for the music (space & depth)
    this.delay = this.ctx.createDelay(); this.delay.delayTime.value = 0.28;
    this.fb = this.ctx.createGain(); this.fb.gain.value = 0.28;
    this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.musicBus);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? this.musicVol * 0.55 : 0, this.ctx.currentTime, 0.3); }
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? this.sfxVol : 0, this.ctx.currentTime, 0.05); }
  setVolumes(m, s) { this.musicVol = m; this.sfxVol = s; this.setMusic(this.musicOn); this.setSfx(this.sfxOn); }
  setMood(mood, intensity) { if (SCALES[mood]) this.mood = mood; if (intensity != null) this.targetIntensity = intensity; }

  // ───────────── generative music ─────────────
  schedule() {
    if (!this.ctx || !this.musicOn) { if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05; return; }
    const sc = SCALES[this.mood];
    const spb = 60 / sc.bpm / 4; // seconds per 16th
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.intensity += (this.targetIntensity - this.intensity) * 0.02;
      this.playStep(this.step, this.nextTime, sc, spb);
      this.nextTime += spb; this.step = (this.step + 1) % 256;
    }
  }

  playStep(s, t, sc, spb) {
    const I = this.intensity, bar = Math.floor(s / 16) % sc.prog.length, beat = s % 16;
    const chord = sc.prog[bar];
    // pad: whole-bar chord
    if (beat === 0) for (const n of chord) this.tone(mtof(sc.root + 12 + n), t, spb * 16, 'triangle', 0.045, 900, 0.4, true);
    // bass on beats (more notes at higher intensity)
    if (beat % 4 === 0 || (I > 0.6 && beat % 4 === 3)) this.tone(mtof(sc.root - 12 + chord[0]), t, spb * 2.5, 'square', 0.05 + I * 0.03, 400 + I * 500, 0.02);
    // arpeggio
    if (I > 0.25 && (beat % 2 === 0 || I > 0.7)) {
      const n = chord[(s >> (I > 0.7 ? 0 : 1)) % chord.length] + (beat >= 8 ? 12 : 0);
      this.tone(mtof(sc.root + 24 + n), t, spb * 0.9, this.mood === 'boss' ? 'sawtooth' : 'square', 0.022, 2400, 0.005, true);
    }
    // melody sprinkles (seeded by step for variety, but musical — stays in scale)
    if (I > 0.45 && beat % 4 === 2 && ((s * 2654435761) >>> 0) % 3 === 0) {
      const deg = sc.steps[((s * 40503) >>> 0) % sc.steps.length];
      this.tone(mtof(sc.root + 24 + deg), t, spb * 3, 'sine', 0.04, 3000, 0.01, true);
    }
    // drums
    if (I > 0.15) {
      if (beat % 8 === 0 || (this.mood === 'boss' && beat % 4 === 0) || (I > 0.8 && beat === 10)) this.kick(t, 0.55 * Math.min(1, I + 0.3));
      if (I > 0.35 && beat % 8 === 4) this.snare(t, 0.22);
      if (I > 0.5 && beat % 2 === 1) this.hat(t, 0.05 + (beat % 4 === 3 ? 0.03 : 0));
    }
  }

  tone(freq, t, dur, type, vol, cutoff, attack = 0.01, toDelay = false) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.musicBus); if (toDelay) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }
  kick(t, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.3);
  }
  snare(t, v) { this.noiseHit(t, v, 0.14, 'bandpass', 1800, this.musicBus); }
  hat(t, v) { this.noiseHit(t, v, 0.04, 'highpass', 7000, this.musicBus); }
  noiseHit(t, v, dur, ftype, freq, bus) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = ftype; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // ───────────── SFX ─────────────
  throttle(key, ms) { const now = performance.now(); if (this.last[key] && now - this.last[key] < ms) return false; this.last[key] = now; return true; }
  sfx(name) {
    if (!this.ctx || !this.sfxOn) return;
    const c = this.ctx, t = c.currentTime;
    const blip = (f0, f1, dur, type = 'sine', vol = 0.15, off = 0) => {
      const o = c.createOscillator(), g = c.createGain(), s = t + off; o.type = type;
      o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + dur);
      g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      o.connect(g); g.connect(this.sfxBus); o.start(s); o.stop(s + dur + 0.02);
    };
    switch (name) {
      case 'pop': if (this.throttle('pop', 35)) blip(500 + Math.random() * 500, 180, 0.07, 'sine', 0.12); break;
      case 'shoot': if (this.throttle('shoot', 60)) blip(900, 400, 0.05, 'triangle', 0.04); break;
      case 'boom': if (this.throttle('boom', 90)) { this.noiseHit(t, 0.35, 0.35, 'lowpass', 700, this.sfxBus); blip(120, 40, 0.3, 'sine', 0.3); } break;
      case 'zap': if (this.throttle('zap', 80)) blip(1600, 200, 0.12, 'sawtooth', 0.05); break;
      case 'freeze': if (this.throttle('freeze', 150)) { blip(2200, 1200, 0.25, 'sine', 0.06); this.noiseHit(t, 0.08, 0.3, 'highpass', 5000, this.sfxBus); } break;
      case 'place': blip(300, 600, 0.12, 'triangle', 0.2); break;
      case 'upgrade': [0, 0.07, 0.14].forEach((d, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = [523, 659, 784][i];
        g.gain.setValueAtTime(0.07, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.15); o.connect(g); g.connect(this.sfxBus); o.start(t + d); o.stop(t + d + 0.2); }); break;
      case 'sell': blip(700, 300, 0.15, 'square', 0.06); break;
      case 'leak': if (this.throttle('leak', 200)) blip(220, 110, 0.3, 'sawtooth', 0.12); break;
      case 'click': blip(1200, 900, 0.03, 'square', 0.04); break;
      case 'ability': blip(200, 1400, 0.4, 'sawtooth', 0.1); this.noiseHit(t, 0.15, 0.5, 'bandpass', 1200, this.sfxBus); break;
      case 'boss': blip(90, 45, 1.2, 'sawtooth', 0.25); this.noiseHit(t, 0.3, 1.0, 'lowpass', 300, this.sfxBus); break;
      case 'coin': if (this.throttle('coin', 60)) { blip(1318, 1318, 0.06, 'square', 0.05); blip(1760, 1760, 0.1, 'square', 0.05, 0.06); } break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => blip(f, f, 0.5, 'triangle', 0.15, i * 0.14)); break;
      case 'lose': blip(400, 80, 1.2, 'sawtooth', 0.15); break;
      case 'wave': blip(440, 880, 0.2, 'triangle', 0.1); break;
      case 'quack': blip(900, 500, 0.12, 'sawtooth', 0.1); blip(800, 450, 0.12, 'sawtooth', 0.1, 0.13); break;
    }
  }
}

export const audio = new AudioEngine();
