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
let run = 0;
// Уже озвученные части храним, чтобы повторное прослушивание не тратило лимит и начиналось сразу.
const cache = new Map<string, Promise<string>>();

// Вызывается прямо в обработчике нажатия, чтобы позже ответ можно было озвучить автоматически.
function unlock() {
  if (typeof window === "undefined") return;
  // Голос браузера на iPhone тоже работает, только если впервые прозвучал после касания.
  if (!synthUnlocked && window.speechSynthesis) {
    synthUnlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
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
    // Бесплатный лимит озвучки считается по запросам, поэтому части крупные: обычно весь ответ — один запрос.
    const limit = 850;
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
  pending = null;
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
    const a = audio;
    if (!a || my !== run) return resolve();
    a.src = url;
    a.playbackRate = rate;
    a.onended = () => resolve();
    a.onerror = () => reject(new Error("audio"));
    const tryPlay = () =>
      a
        .play()
        .then(() => my === run && set({ status: "playing" }))
        .catch((e: Error) => {
          if (my !== run) return resolve();
          if (e?.name === "NotAllowedError") {
            pending = () => {
              a.playbackRate = rate;
              tryPlay();
            };
            set({ status: "blocked" });
          } else reject(e);
        });
    tryPlay();
  });
}

// Язык интерфейса — для встроенного голоса браузера. Можно передать в speak() или задать заранее.
let currentLocale: Locale = "ru";
export function setSpeechLocale(locale: Locale) {
  currentLocale = locale;
}

async function speak(id: string, text: string, settings: VoiceSettings, locale?: Locale) {
  if (locale) currentLocale = locale;
  stop();
  const my = run;
  // Создаём и «разблокируем» плеер прямо в обработчике нажатия.
  audio ??= new Audio();
  audio.src = SILENT;
  audio.play().catch(() => {});
  set({ id, status: "loading", fallback: false });
  setAudioSession("playback");
  onDuck?.(true);

  const parts = chunks(text);
  const rate = SPEEDS[settings.speed].rate;
  let next: Promise<string> | null = fetchChunk(parts[0], settings);
  let i = 0;
  try {
    for (; i < parts.length; i++) {
      const url = await next!;
      if (my !== run) return;
      next = i + 1 < parts.length ? fetchChunk(parts[i + 1], settings) : null;
      next?.catch(() => {});
      await playUrl(url, rate, my);
      if (my !== run) return;
    }
    if (my === run) stop();
  } catch {
    if (my !== run) return;
    // Голос сервера недоступен — читаем оставшееся голосом браузера.
    browserSpeak(parts.slice(i).join(" "), settings, my, currentLocale);
  }
}

function browserSpeak(text: string, settings: VoiceSettings, my: number, locale: Locale) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return stop();
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
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if (pick) u.voice = pick;
  u.rate = SPEEDS[settings.speed].rate * 0.95;
  u.pitch = want === "male" ? 0.9 : 1.05;
  let started = false;
  u.onstart = () => {
    started = true;
    if (my === run) set({ status: "playing" });
  };
  u.onend = () => my === run && stop();
  u.onerror = () => my === run && stop();
  const go = () => {
    synth.cancel();
    synth.speak(u);
  };
  set({ status: "loading", fallback: true });
  go();
  // Если голос не начался сам (iPhone без касания), просим одно касание.
  setTimeout(() => {
    if (started || my !== run) return;
    pending = go;
    set({ status: "blocked" });
  }, 2500);
}
