// Озвучка ответов: длинный текст режется на крупные части, следующая подгружается, пока звучит предыдущая.
// Если сервер не смог (например, закончился бесплатный лимит), читает встроенный голос браузера.

import { SPEEDS, getVoice, type VoiceSettings } from "./voices";
import { INTL, type Locale } from "@/i18n/config";

// blocked — браузер (чаще всего Safari на iPhone) не дал звуку начаться сам: нужно одно касание.
export type SpeechState = { id: string | null; status: "idle" | "loading" | "playing" | "blocked"; fallback: boolean };

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
  stream,
  stop,
  unlock,
  resume,
};

let pending: (() => void) | null = null;

// Продолжить озвучку после касания, если браузер её заблокировал.
function resume() {
  const p = pending;
  pending = null;
  p?.();
}

// На iPhone после микрофона звук может уйти в разговорный динамик; просим обычное воспроизведение.
export function setAudioSession(type: "playback" | "play-and-record" | "auto") {
  try {
    const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (s) s.type = type;
  } catch {}
}

let synthUnlocked = false;

// Тихий звук, чтобы телефон разрешил воспроизведение после касания.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

let audio: HTMLAudioElement | null = null;
let active: AbortController | null = null;
// Уже озвученные части храним, чтобы повторное прослушивание не тратило лимит и начиналось сразу.
const cache = new Map<string, Blob>();

function primeAudio() {
  audio ??= new Audio();
  if (!audio.src || audio.paused) {
    audio.src = SILENT;
    audio.play().catch(() => {});
  }
}

function unlockBrowserVoice() {
  // Голос браузера на iPhone тоже работает, только если впервые прозвучал после касания.
  if (!synthUnlocked && window.speechSynthesis) {
    synthUnlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

// Вызывается прямо в обработчике нажатия, чтобы позже ответ можно было озвучить автоматически.
function unlock() {
  if (typeof window === "undefined") return;
  unlockBrowserVoice();
  primeAudio();
}

function cleanText(text: string) {
  return text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_#`>]+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

// Граница фразы стабильна, когда после знака уже пришёл пробел или началась новая строка.
// Первые части короткие: голос начинается быстро и не замолкает, пока готовится продолжение.
const CHUNK_SIZES = [{ min: 40, limit: 180 }, { min: 80, limit: 240 }, { min: 240, limit: 420 }];

function nextChunk(text: string, index: number, complete: boolean) {
  const { min, limit } = CHUNK_SIZES[Math.min(index, CHUNK_SIZES.length - 1)];
  const prefix = text.slice(0, limit + 1);
  let boundary = 0;
  for (const match of prefix.matchAll(/[.!?…]+[»”"’\])]*(?=\s)|\n/gu)) {
    const end = match.index + match[0].length;
    if (end > limit) break;
    boundary = end;
    if (end >= min) return text.slice(0, end).trimEnd();
  }
  if (text.length > limit) {
    if (boundary > min / 2) return text.slice(0, boundary).trimEnd();
    const space = prefix.search(/\s\S*$/u);
    return text.slice(0, space > 0 ? space : limit).trimEnd();
  }
  return complete ? text : "";
}

function stop() {
  audio?.pause();
  active?.abort();
  active = null;
  pending = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  onDuck?.(false);
  set({ id: null, status: "idle", fallback: false });
}

async function fetchChunk(text: string, settings: VoiceSettings, signal: AbortSignal) {
  const key = `${settings.voice}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 16_000);
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: settings.voice }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if (!blob.size) throw new Error("empty audio");
    cache.set(key, blob);
    if (cache.size > 60) cache.delete(cache.keys().next().value!);
    return blob;
  } finally {
    signal.removeEventListener("abort", abort);
    clearTimeout(timeout);
  }
}

function playing() {
  onDuck?.(true);
  set({ status: "playing" });
}

function playAudio(blob: Blob, rate: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const a = audio;
    if (!a || signal.aborted) return resolve();
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      a.onended = null;
      a.onerror = null;
      if (pending === tryPlay) pending = null;
      signal.removeEventListener("abort", abort);
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish();
    signal.addEventListener("abort", abort, { once: true });
    a.src = url;
    a.onended = () => finish();
    a.onerror = () => finish(new Error("audio"));
    const tryPlay = () => {
      a.playbackRate = rate;
      a.play()
        .then(() => {
          if (!settled) playing();
        })
        .catch((e: Error) => {
          if (settled) return;
          if (e?.name === "NotAllowedError") {
            pending = tryPlay;
            set({ status: "blocked" });
          } else finish(e);
        });
    };
    tryPlay();
  });
}

// Язык интерфейса — для встроенного голоса браузера. Можно передать в speak() или задать заранее.
let currentLocale: Locale = "ru";
export function setSpeechLocale(locale: Locale) {
  currentLocale = locale;
}

function speak(id: string, text: string, settings: VoiceSettings, locale?: Locale) {
  const update = stream(id, settings, locale);
  unlockBrowserVoice();
  update(text, true);
}

// Озвучиваем первую фразу и следующие готовые части, пока поступает текст ответа.
function stream(id: string, settings: VoiceSettings, locale = currentLocale) {
  stop();
  active = new AbortController();
  const { signal } = active;
  setAudioSession("playback");
  primeAudio();
  set({ id, status: "loading", fallback: false });
  const rate = SPEEDS[settings.speed].rate;
  const parts: { text: string; audio?: Promise<Blob> }[] = [];
  let i = 0;
  let complete = false;
  let fallback = false;
  let consumed = "";
  let notify = () => {};
  signal.addEventListener("abort", () => notify(), { once: true });

  const prepare = () => {
    if (fallback) return;
    for (const part of parts.slice(i, i + 2)) {
      if (part.audio) continue;
      part.audio = fetchChunk(part.text, settings, signal);
      part.audio.catch(() => {});
    }
  };

  async function play() {
    try {
      while (!signal.aborted) {
        const part = parts[i];
        if (!part) {
          if (complete) break;
          if (state.status === "playing") {
            onDuck?.(false);
            set({ status: "loading", fallback });
          }
          await new Promise<void>((resolve) => { notify = resolve; });
          continue;
        }
        prepare();
        set({ status: "loading", fallback });
        if (!fallback) {
          try {
            const blob = await part.audio!;
            if (signal.aborted) break;
            await playAudio(blob, rate, signal);
            i++;
            continue;
          } catch {
            if (signal.aborted) break;
            fallback = true;
          }
        }
        const rest = parts.slice(i).map((p) => p.text).join(" ");
        i = parts.length;
        if (!(await browserSpeak(rest, settings, signal, locale))) break;
      }
    } finally {
      if (!signal.aborted) stop();
    }
  }
  void play().catch(() => {});

  return (text: string, done = false) => {
    if (signal.aborted || complete) return;
    const clean = cleanText(text);
    // Пока ссылка не закрылась, её разметка может меняться с каждым фрагментом.
    const stable = done ? clean : clean.split("[", 1)[0];
    if (!stable.startsWith(consumed)) {
      if (!done) return;
      consumed = "";
    }
    let rest = stable.slice(consumed.length).trimStart();
    while (rest) {
      const part = nextChunk(rest, parts.length, done);
      if (!part) break;
      parts.push({ text: part });
      consumed = stable.slice(0, stable.length - rest.length + part.length);
      rest = rest.slice(part.length).trimStart();
    }
    complete = done;
    prepare();
    notify();
  };
}

function browserSpeak(text: string, settings: VoiceSettings, signal: AbortSignal, locale: Locale) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return Promise.resolve(false);
  const want = getVoice(settings.voice).gender;
  const all = synth.getVoices();
  const byLang = (code: string) => all.filter((v) => v.lang?.toLowerCase().replace("_", "-").startsWith(code));
  // Казахского голоса на большинстве телефонов нет — тогда читаем русским, он понятнее всего.
  let lang = INTL[locale];
  let voices = byLang(locale);
  if (!voices.length && locale === "kk") {
    voices = byLang("ru");
    if (voices.length) lang = INTL.ru;
  }
  const female = /milena|irina|svetlana|katya|alena|anna|daria|samantha|karen|zira|female|жен/i;
  const male = /yuri|dmitr|pavel|maxim|aleksandr|daniel|alex|david|fred|\bmale|муж/i;
  const pick = voices.find((v) => (want === "female" ? female : male).test(v.name) && !(want === "female" ? male : female).test(v.name)) ?? voices[0];
  return new Promise<boolean>((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    let utterance: SpeechSynthesisUtterance | undefined;
    const clear = () => {
      clearTimeout(timeout);
      if (utterance) {
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
      }
    };
    const finish = (ok: boolean) => {
      clear();
      signal.removeEventListener("abort", abort);
      resolve(ok);
    };
    const abort = () => finish(false);
    const blocked = () => {
      pending = go;
      set({ status: "blocked" });
    };
    const go = () => {
      clear();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      utterance = u;
      u.lang = lang;
      if (pick) u.voice = pick;
      u.rate = SPEEDS[settings.speed].rate * 0.95;
      u.pitch = want === "male" ? 0.9 : 1.05;
      u.onstart = () => {
        clearTimeout(timeout);
        pending = null;
        playing();
      };
      u.onend = () => finish(true);
      u.onerror = (event) => event.error === "not-allowed" ? blocked() : finish(false);
      timeout = setTimeout(blocked, 2500);
      synth.speak(u);
    };
    signal.addEventListener("abort", abort, { once: true });
    set({ status: "loading", fallback: true });
    go();
  });
}
