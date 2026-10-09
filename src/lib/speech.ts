// Озвучка ответов: текст режется на части, первая звучит через пару секунд, следующие подгружаются заранее.
// Если сервер не смог (например, закончился бесплатный лимит), читает встроенный голос браузера.

import { SPEEDS, getVoice, type VoiceSettings } from "./voices";

export type SpeechState = { id: string | null; status: "idle" | "loading" | "playing"; fallback: boolean };

let state: SpeechState = { id: null, status: "idle", fallback: false };
const listeners = new Set<() => void>();
let onDuck: ((on: boolean) => void) | null = null;

const set = (next: Partial<SpeechState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const speech = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  setDuck(fn: ((on: boolean) => void) | null) {
    onDuck = fn;
  },
  speak,
  stop,
  unlock,
};

// Тихий звук, чтобы телефон разрешил воспроизведение после касания.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

let audio: HTMLAudioElement | null = null;
let run = 0;
// Уже озвученные части храним, чтобы повторное прослушивание не тратило лимит и начиналось сразу.
const cache = new Map<string, Promise<string>>();

// Вызывается прямо в обработчике нажатия, чтобы позже ответ можно было озвучить автоматически.
function unlock() {
  if (typeof window === "undefined") return;
  audio ??= new Audio();
  if (!audio.src || audio.src === SILENT || audio.paused) {
    audio.src = SILENT;
    audio.play().catch(() => {});
  }
}

function cleanText(text: string) {
  return text
    .replace(/[*_#`>]+/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function chunks(text: string) {
  const sentences = cleanText(text).match(/[^.!?…\n]+[.!?…]*[\s\n]*/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    // Первая часть короткая, чтобы голос зазвучал быстрее; следующие готовятся, пока звучит предыдущая.
    const limit = out.length === 0 ? 140 : out.length === 1 ? 320 : 600;
    if (cur && (cur + s).length > limit) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function stop() {
  run++;
  audio?.pause();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  onDuck?.(false);
  set({ id: null, status: "idle", fallback: false });
}

function fetchChunk(text: string, settings: VoiceSettings) {
  const key = `${settings.voice}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: settings.voice }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(String(res.status));
    return URL.createObjectURL(await res.blob());
  });
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  if (cache.size > 60) {
    const [oldKey, old] = cache.entries().next().value!;
    cache.delete(oldKey);
    old.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  }
  return p;
}

function playUrl(url: string, rate: number, my: number) {
  return new Promise<void>((resolve, reject) => {
    if (!audio || my !== run) return resolve();
    audio.src = url;
    audio.playbackRate = rate;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("audio"));
    audio.play().catch(reject);
  });
}

async function speak(id: string, text: string, settings: VoiceSettings) {
  stop();
  const my = run;
  // Создаём и «разблокируем» плеер прямо в обработчике нажатия.
  audio ??= new Audio();
  audio.src = SILENT;
  audio.play().catch(() => {});
  set({ id, status: "loading", fallback: false });
  onDuck?.(true);

  const parts = chunks(text);
  const rate = SPEEDS[settings.speed].rate;
  let next: Promise<string> | null = fetchChunk(parts[0], settings);
  if (parts[1]) fetchChunk(parts[1], settings).catch(() => {});
  let i = 0;
  try {
    for (; i < parts.length; i++) {
      const url = await next!;
      if (my !== run) return;
      next = i + 1 < parts.length ? fetchChunk(parts[i + 1], settings) : null;
      next?.catch(() => {});
      set({ status: "playing" });
      await playUrl(url, rate, my);
      if (my !== run) return;
    }
    if (my === run) stop();
  } catch {
    if (my !== run) return;
    // Голос сервера недоступен — читаем оставшееся голосом браузера.
    browserSpeak(parts.slice(i).join(" "), settings, my);
  }
}

function browserSpeak(text: string, settings: VoiceSettings, my: number) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return stop();
  const want = getVoice(settings.voice).gender;
  const ru = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("ru"));
  const female = /milena|irina|svetlana|katya|alena|anna|daria|female|жен/i;
  const male = /yuri|dmitr|pavel|maxim|aleksandr|male|муж/i;
  const pick = ru.find((v) => (want === "female" ? female : male).test(v.name) && !(want === "female" ? male : female).test(v.name)) ?? ru[0];
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU";
  if (pick) u.voice = pick;
  u.rate = SPEEDS[settings.speed].rate * 0.95;
  u.pitch = want === "male" ? 0.9 : 1.05;
  u.onend = () => my === run && stop();
  u.onerror = () => my === run && stop();
  set({ status: "playing", fallback: true });
  synth.speak(u);
}
