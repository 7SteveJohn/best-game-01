// Emberlight — every sound is synthesized with WebAudio.
//
// No audio files: small oscillators and filtered noise, shaped with
// envelopes, make the shots, the coins, the horn and the wind. The context
// is created on the first user gesture (browsers demand it); until then
// play() is a silent no-op, which also keeps screenshots quiet.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.windNodes = null;
  }

  // Call from a click or keypress. Safe to call twice.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startWind();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A soft loop of filtered noise: wind over the shore, under everything.
  startWind() {
    const ctx = this.ctx;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    // Breathe: the wind swells and fades on a slow loop.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    this.windNodes = { source, lfo };
  }

  // One shaped tone. frequency slides to slideTo over the note's life.
  tone({ type = 'sine', from = 440, to = null, seconds = 0.12, volume = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // A short burst of noise through a bandpass: thuds, pops and rustles.
  noise({ seconds = 0.1, volume = 0.2, frequency = 1200, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  // --- Named game sounds. Each is one or two tones, kept short. ---

  click() {
    this.tone({ type: 'triangle', from: 660, to: 520, seconds: 0.06, volume: 0.12 });
  }

  build() {
    this.noise({ seconds: 0.12, volume: 0.25, frequency: 300 });
    this.tone({ type: 'triangle', from: 180, to: 120, seconds: 0.14, volume: 0.2 });
  }

  upgrade() {
    this.tone({ type: 'sine', from: 523, seconds: 0.1, volume: 0.16 });
    this.tone({ type: 'sine', from: 784, seconds: 0.14, volume: 0.16, delay: 0.07 });
  }

  sell() {
    this.tone({ type: 'sine', from: 784, to: 392, seconds: 0.12, volume: 0.14 });
  }

  shootBrazier() {
    this.tone({ type: 'square', from: 880, to: 520, seconds: 0.07, volume: 0.05 });
  }

  shootLantern() {
    this.tone({ type: 'sine', from: 1180, to: 900, seconds: 0.12, volume: 0.06 });
  }

  shootSpire() {
    this.noise({ seconds: 0.09, volume: 0.12, frequency: 2400 });
    this.tone({ type: 'sawtooth', from: 320, to: 90, seconds: 0.16, volume: 0.1 });
  }

  // The Tide Bell's ring: a low chime with a long tail.
  bell() {
    this.tone({ type: 'sine', from: 392, seconds: 0.5, volume: 0.14 });
    this.tone({ type: 'sine', from: 587, seconds: 0.4, volume: 0.08, delay: 0.02 });
  }

  // Choosing a blessing: a warm rising pair.
  blessing() {
    this.tone({ type: 'sine', from: 659, seconds: 0.14, volume: 0.14 });
    this.tone({ type: 'sine', from: 988, seconds: 0.22, volume: 0.14, delay: 0.1 });
  }

  kill() {
    this.tone({ type: 'sine', from: 1320, to: 1760, seconds: 0.08, volume: 0.07 });
  }

  coin() {
    this.tone({ type: 'sine', from: 988, seconds: 0.07, volume: 0.09 });
    this.tone({ type: 'sine', from: 1319, seconds: 0.1, volume: 0.09, delay: 0.05 });
  }

  leak() {
    this.tone({ type: 'sawtooth', from: 220, to: 110, seconds: 0.35, volume: 0.22 });
    this.noise({ seconds: 0.2, volume: 0.15, frequency: 500 });
  }

  waveHorn() {
    this.tone({ type: 'triangle', from: 196, seconds: 0.35, volume: 0.2 });
    this.tone({ type: 'triangle', from: 294, seconds: 0.4, volume: 0.2, delay: 0.12 });
  }

  waveClear() {
    this.tone({ type: 'sine', from: 523, seconds: 0.12, volume: 0.14 });
    this.tone({ type: 'sine', from: 659, seconds: 0.12, volume: 0.14, delay: 0.09 });
    this.tone({ type: 'sine', from: 784, seconds: 0.2, volume: 0.14, delay: 0.18 });
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, seconds: 0.3, volume: 0.16, delay: i * 0.13 });
    });
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ type: 'triangle', from: f, seconds: 0.4, volume: 0.16, delay: i * 0.18 });
    });
  }
}
