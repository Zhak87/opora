// Звуки дневника снов. Всё синтезируется на лету (Web Audio), без файлов и без авторских прав.
import { audioCtx, chime } from "./chime";
import { whoosh } from "./sounds";

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Кадр готов: три тихие ноты музыкальной шкатулки вверх.
export function panelReady() {
  [79, 83, 86].forEach((n, i) => setTimeout(() => chime(n, 0.045), i * 110));
}

// Комикс собран или открыт: мягкий «вздох», как перелистнули страницу.
export function pageTurn() {
  whoosh(0.035, 1.1);
}

// Колыбельная ночь: тёплые аккорды-«подушки», шорох ночного ветра и редкие ноты шкатулки.
// Лидийский лад без резких ступеней — звучит как сон, а не как мелодия, которую надо слушать.
const CHORDS = [
  [50, 57, 64, 66, 73], // Dmaj9
  [47, 54, 62, 66, 69], // Bm7(11)
  [43, 50, 57, 62, 66], // Gmaj9
  [45, 52, 59, 64, 68], // A6/9 (лидийский оттенок)
];
const BOX = [74, 76, 78, 81, 83, 86, 88];
const CHORD_SECONDS = 10;

export class DreamMusic {
  private master: GainNode | null = null;
  private timers: number[] = [];
  private wind: AudioBufferSourceNode | null = null;
  private index = 0;

  get playing() {
    return this.master !== null;
  }

  start() {
    if (this.master) return;
    try {
      const ctx = audioCtx();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
      master.connect(ctx.destination);
      this.master = master;
      this.startWind(ctx, master);
      this.chord();
      this.timers.push(window.setInterval(() => this.chord(), CHORD_SECONDS * 1000));
      this.timers.push(window.setInterval(() => Math.random() < 0.55 && this.box(), 1900));
    } catch {
      this.master = null;
    }
  }

  stop() {
    const master = this.master;
    if (!master) return;
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.master = null;
    try {
      const ctx = audioCtx();
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      const wind = this.wind;
      this.wind = null;
      setTimeout(() => {
        try { wind?.stop(); } catch {}
        master.disconnect();
      }, 3000);
    } catch {}
  }

  private startWind(ctx: AudioContext, out: GainNode) {
    const len = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    // Ветер медленно «дышит».
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.07;
    depth.gain.value = 0.03;
    lfo.connect(depth).connect(g.gain);
    lfo.start();
    src.connect(f).connect(g).connect(out);
    src.start();
    this.wind = src;
  }

  private chord() {
    const master = this.master;
    if (!master) return;
    try {
      const ctx = audioCtx();
      const t = ctx.currentTime;
      const notes = CHORDS[this.index++ % CHORDS.length];
      const len = CHORD_SECONDS + 4;
      for (const n of notes) {
        for (const detune of [-4, 4]) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const f = ctx.createBiquadFilter();
          o.type = "triangle";
          o.frequency.value = freq(n);
          o.detune.value = detune;
          f.type = "lowpass";
          f.frequency.value = 900;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.012, t + 3.5);
          g.gain.linearRampToValueAtTime(0.009, t + len - 4);
          g.gain.linearRampToValueAtTime(0, t + len);
          o.connect(f).connect(g).connect(master);
          o.start(t);
          o.stop(t + len + 0.1);
        }
      }
    } catch {}
  }

  private box() {
    const master = this.master;
    if (!master) return;
    try {
      const ctx = audioCtx();
      const t = ctx.currentTime;
      const n = BOX[Math.floor(Math.random() * BOX.length)];
      for (const [ratio, amp, decay] of [[1, 0.05, 2.4], [4, 0.012, 0.8]] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq(n) * ratio;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + decay + 0.1);
      }
    } catch {}
  }
}
