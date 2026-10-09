// Запись голоса с микрофона в WAV 16 кГц и простое определение паузы:
// когда человек замолкает примерно на 1,4 секунды, запись заканчивается сама.

type Options = {
  onLevel?: (level: number) => void;
  onSilence?: () => void;
};

const RATE = 16000;
const MAX_SECONDS = 60;

export class MicRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Float32Array[] = [];
  private inRate = 48000;
  private heard = 0;
  private quietSince = 0;
  private startedAt = 0;
  private noise = 0.01;
  spoke = false;

  async start({ onLevel, onSilence }: Options = {}) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    await this.ctx.resume().catch(() => {});
    this.inRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.spoke = false;
    this.heard = 0;
    this.quietSince = 0;
    this.startedAt = performance.now();
    this.noise = 0.01;

    this.node.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      onLevel?.(Math.min(1, rms * 9));

      const now = performance.now();
      // Первые полсекунды слушаем фон, чтобы понять, что считать тишиной.
      if (now - this.startedAt < 500) {
        this.noise = Math.max(this.noise, rms);
        return;
      }
      const threshold = Math.max(0.015, this.noise * 2.2);
      if (rms > threshold) {
        this.heard += data.length / this.inRate;
        if (this.heard > 0.25) this.spoke = true;
        this.quietSince = 0;
      } else if (this.spoke) {
        this.quietSince ||= now;
        if (now - this.quietSince > 1400) onSilence?.();
      }
      if (now - this.startedAt > MAX_SECONDS * 1000) onSilence?.();
    };
    this.source.connect(this.node);
    // ScriptProcessor работает только подключённым к выходу; звук при этом не выводится.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
  }

  // Останавливает запись и возвращает WAV (или null, если ничего не сказано).
  stop(): Blob | null {
    const spoke = this.spoke;
    const chunks = this.chunks;
    const inRate = this.inRate;
    this.cancel();
    if (!spoke || !chunks.length) return null;
    return encodeWav(downsample(chunks, inRate, RATE), RATE);
  }

  cancel() {
    if (this.node) this.node.onaudioprocess = null;
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.node = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.chunks = [];
  }
}

function downsample(chunks: Float32Array[], from: number, to: number) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    input.set(c, o);
    o += c.length;
  }
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    // Усредняем соседние отсчёты, чтобы не было «звона» при понижении частоты.
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, rate: number) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (off: number, s: string) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
