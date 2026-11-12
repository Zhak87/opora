import { downsample, encodeWav } from "@/lib/recorder";

// Нарезка своего микрофона на фрагменты для расшифровки (только когда обработка речи разрешена обоими).
// Работает с копией дорожки, которая уже идёт в звонок; звук нигде не сохраняется, отправляется только
// фрагмент, где был голос. cancel() выбрасывает недописанный фрагмент: после отзыва согласия он не уйдёт.

const RATE = 16000;
const MAX_MS = 15_000;
const MIN_MS = 4_000;
const SILENCE_MS = 1_200;

export class SpeechChunker {
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private track: MediaStreamTrack | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;
  private firstAt = 0;
  private voiced = 0;
  private quietSince = 0;
  private inRate = 48000;
  private paused = false;

  constructor(private onChunk: (wav: Blob, saidAt: number) => void) {}

  async start(source: MediaStreamTrack) {
    this.cancel();
    this.track = source.clone();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    await this.ctx.resume().catch(() => {});
    this.inRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(new MediaStream([this.track]));
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.reset();
    this.node.onaudioprocess = (e) => {
      if (this.paused) return;
      const data = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      if (!this.chunks.length) {
        this.startedAt = now;
        this.firstAt = Date.now();
      }
      this.chunks.push(new Float32Array(data));
      if (rms > 0.012) {
        this.voiced += (data.length / this.inRate) * 1000;
        this.quietSince = 0;
      } else {
        this.quietSince ||= now;
      }
      const age = now - this.startedAt;
      const pause = this.quietSince && now - this.quietSince > SILENCE_MS;
      if (age >= MAX_MS || (age >= MIN_MS && pause && this.voiced > 600)) this.flush();
    };
    this.source.connect(this.node);
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
  }

  // На время приватного вопроса психолога или озвучки ответа: недописанный фрагмент выбрасывается.
  setPaused(paused: boolean) {
    this.paused = paused;
    this.reset();
  }

  private reset() {
    this.chunks = [];
    this.voiced = 0;
    this.quietSince = 0;
  }

  private flush() {
    const chunks = this.chunks;
    const voiced = this.voiced;
    const at = this.firstAt;
    this.reset();
    if (voiced < 600 || !chunks.length) return;
    this.onChunk(encodeWav(downsample(chunks, this.inRate, RATE), RATE), at);
  }

  cancel() {
    if (this.node) this.node.onaudioprocess = null;
    this.node?.disconnect();
    this.source?.disconnect();
    this.track?.stop();
    this.ctx?.close().catch(() => {});
    this.node = null;
    this.source = null;
    this.track = null;
    this.ctx = null;
    this.reset();
  }
}
