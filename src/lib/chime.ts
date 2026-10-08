// Короткий мягкий звук для игр: создаётся на лету, без файлов.
let ctx: AudioContext | null = null;

export function chime(midi = 76, volume = 0.08) {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    gain.connect(ctx.destination);
    for (const [m, v] of [[1, 1], [2, 0.2], [3.01, 0.06]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f * m;
      g.gain.value = v;
      o.connect(g).connect(gain);
      o.start(t);
      o.stop(t + 1.7);
    }
  } catch {
    // звук необязателен
  }
}

export const PENTATONIC = [69, 72, 74, 76, 79, 81, 84];
