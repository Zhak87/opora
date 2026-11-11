// Звуковой дизайн практик. Всё синтезируется на лету, без файлов.
import { audioCtx } from "./chime";

// Удар поющей чаши: несколько негармоничных обертонов с долгим затуханием и лёгким «биением».
export function bowlStrike(volume = 0.12, base = 196) {
  try {
    const ctx = audioCtx();
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = volume;
    out.connect(ctx.destination);
    const partials: [number, number, number][] = [
      [1, 1, 9],
      [2.76, 0.42, 7],
      [5.4, 0.18, 5],
      [8.93, 0.07, 3.5],
    ];
    for (const [ratio, amp, decay] of partials) {
      for (const detune of [-1.2, 1.2]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = base * ratio + detune * ratio;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp / 2, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + decay + 0.1);
      }
    }
  } catch {
    // звук необязателен
  }
}

// Тихое «капля упала»: короткий тон, скользящий вниз.
export function drop(volume = 0.06, from = 880) {
  try {
    const ctx = audioCtx();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(from / 2.2, t + 0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.55);
  } catch {}
}

// Мягкий «вздох» шума: для отпускания, лодки, улетающих мыслей.
export function whoosh(volume = 0.05, seconds = 1.6) {
  try {
    const ctx = audioCtx();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, seconds);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + seconds * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + seconds * 0.35);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + seconds);
  } catch {}
}

let noise: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const len = Math.ceil(ctx.sampleRate * Math.max(seconds, 4));
  if (noise && noise.length >= len) return noise;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  // «Коричневый» шум: мягче белого, похож на море и ветер.
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  noise = b;
  return b;
}

// Шум прибоя, громкость и яркость которого следуют за волной (0..1). Возвращает управление.
export function surf() {
  try {
    const ctx = audioCtx();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 6);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
    return {
      set(level: number, volume = 0.14) {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0.015 + level * volume, t, 0.25);
        f.frequency.setTargetAtTime(280 + level * 1100, t, 0.3);
      },
      stop() {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0, t, 0.3);
        setTimeout(() => {
          try { src.stop(); } catch {}
        }, 1500);
      },
    };
  } catch {
    return { set() {}, stop() {} };
  }
}
