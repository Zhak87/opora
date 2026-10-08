// Генеративная спокойная музыка на Web Audio API: без файлов и без авторских прав.
// Шум морских волн, под ним тихие аккорды-«подушки» и редкие колокольчики.

const CHORDS = [
  [48, 55, 64, 71], // Cmaj7
  [45, 52, 60, 67, 71], // Am9
  [41, 48, 57, 64], // Fmaj7
  [43, 50, 59, 62, 69], // G6/9
];
const BELLS = [72, 74, 76, 79, 81, 84, 86];
const CHORD_SECONDS = 12;

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private timers: number[] = [];
  private chordIndex = 0;

  onstate?: (audible: boolean) => void;

  get running() {
    return this.ctx !== null;
  }

  get audible() {
    return this.ctx?.state === "running";
  }

  resume() {
    return this.ctx?.resume();
  }

  async start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    ctx.onstatechange = () => this.onstate?.(ctx.state === "running" && this.ctx === ctx);
    // Без действия человека браузер держит звук на паузе; resume() снимет её при первом касании.
    ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 4);
    master.connect(ctx.destination);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(4.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    reverb.connect(wet).connect(master);
    this.reverb = reverb;

    this.startSea();
    this.playChord();
    this.scheduleBell();
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 1.5);
    this.ctx = null;
    this.onstate?.(false);
    setTimeout(() => ctx.close(), 1800);
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
    return buffer;
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private playChord() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverb) return;
    if (ctx.state !== "running") {
      // Пока звук на паузе, ноты не копим, чтобы после включения не прозвучали все разом.
      this.later(() => this.playChord(), 1000);
      return;
    }
    const notes = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;
    const t = ctx.currentTime;
    const dur = CHORD_SECONDS + 5;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.035, t + 4.5);
    gain.gain.setValueAtTime(0.035, t + CHORD_SECONDS);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    filter.connect(gain);
    gain.connect(this.master);
    gain.connect(this.reverb);

    for (const n of notes) {
      for (const detune of [-6, 5]) {
        const osc = ctx.createOscillator();
        osc.type = n < 50 ? "sine" : "triangle";
        osc.frequency.value = freq(n);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.1);
      }
    }
    this.later(() => this.playChord(), CHORD_SECONDS * 1000);
  }

  private scheduleBell() {
    this.later(() => {
      this.bell();
      this.scheduleBell();
    }, 5000 + Math.random() * 7000);
  }

  private bell() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverb || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const note = BELLS[Math.floor(Math.random() * BELLS.length)];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.022, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.2 - 0.6;
    gain.connect(pan);
    pan.connect(this.reverb);
    pan.connect(this.master);
    for (const [mult, level] of [[1, 1], [2.01, 0.25]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq(note) * mult;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start(t);
      osc.stop(t + 4.2);
    }
  }

  // Шум моря: два канала «коричневого» шума, накатывающие волны с неровным ритмом.
  private startSea() {
    const ctx = this.ctx!;
    for (const [panValue, offset] of [[-0.5, 0], [0.5, 2600]] as const) {
      const length = ctx.sampleRate * 6;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 350;
      filter.Q.value = 0.3;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const pan = ctx.createStereoPanner();
      pan.pan.value = panValue;
      src.connect(filter).connect(gain).connect(pan).connect(this.master!);
      src.start();
      this.later(() => this.wave(filter, gain), offset);
    }
  }

  private wave(filter: BiquadFilterNode, gain: GainNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== "running") {
      this.later(() => this.wave(filter, gain), 1000);
      return;
    }
    const t = ctx.currentTime;
    const rise = 2.8 + Math.random() * 1.8;
    const fall = 4.5 + Math.random() * 3;
    const peak = 0.22 + Math.random() * 0.14;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(peak, t + rise);
    gain.gain.linearRampToValueAtTime(0.05, t + rise + fall);
    filter.frequency.cancelScheduledValues(t);
    filter.frequency.setValueAtTime(filter.frequency.value, t);
    filter.frequency.exponentialRampToValueAtTime(1100 + Math.random() * 500, t + rise);
    filter.frequency.exponentialRampToValueAtTime(320, t + rise + fall);
    this.later(() => this.wave(filter, gain), (rise + fall + Math.random() * 1.5) * 1000);
  }
}
