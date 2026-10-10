// Голоса для озвучки ответов. Имена — встроенные голоса Gemini TTS, описания — для человека.

import type { Locale } from "@/i18n/config";

export type Voice = { id: string; name: string; gender: "female" | "male"; hint: string };

export const VOICES: Voice[] = [
  { id: "Sulafat", name: "Мира", gender: "female", hint: "Тёплый и обволакивающий" },
  { id: "Achernar", name: "Вера", gender: "female", hint: "Мягкий и тихий" },
  { id: "Vindemiatrix", name: "Ника", gender: "female", hint: "Нежный, бережный" },
  { id: "Aoede", name: "Лада", gender: "female", hint: "Лёгкий, светлый" },
  { id: "Kore", name: "Анна", gender: "female", hint: "Уверенный, собранный" },
  { id: "Gacrux", name: "Ольга", gender: "female", hint: "Зрелый, глубокий" },
  { id: "Achird", name: "Артём", gender: "male", hint: "Дружелюбный, открытый" },
  { id: "Algieba", name: "Лев", gender: "male", hint: "Бархатный, плавный" },
  { id: "Schedar", name: "Илья", gender: "male", hint: "Ровный и спокойный" },
  { id: "Enceladus", name: "Марк", gender: "male", hint: "Тихий, с придыханием" },
  { id: "Charon", name: "Павел", gender: "male", hint: "Глубокий, рассудительный" },
  { id: "Algenib", name: "Глеб", gender: "male", hint: "Низкий, с хрипотцой" },
];

export const SPEEDS = { slow: { label: "Медленно", rate: 0.9 }, normal: { label: "Обычно", rate: 1 }, fast: { label: "Быстрее", rate: 1.12 } } as const;

// Имена и описания голосов на других языках (русские — в VOICES).
const VOICE_TEXT: Record<Exclude<Locale, "ru">, Record<string, { name: string; hint: string }>> = {
  kk: {
    Sulafat: { name: "Мира", hint: "Жылы, жайлы" },
    Achernar: { name: "Вера", hint: "Жұмсақ, сабырлы" },
    Vindemiatrix: { name: "Ника", hint: "Нәзік, мейірімді" },
    Aoede: { name: "Лада", hint: "Жеңіл, жарқын" },
    Kore: { name: "Анна", hint: "Сенімді, жинақы" },
    Gacrux: { name: "Ольга", hint: "Салмақты, терең" },
    Achird: { name: "Артём", hint: "Ашық, ақжарқын" },
    Algieba: { name: "Лев", hint: "Барқыттай, біркелкі" },
    Schedar: { name: "Илья", hint: "Ұстамды, байсалды" },
    Enceladus: { name: "Марк", hint: "Баяу, сыбырлай" },
    Charon: { name: "Павел", hint: "Терең, ойлы" },
    Algenib: { name: "Глеб", hint: "Жуан, сәл қарлығыңқы" },
  },
  en: {
    Sulafat: { name: "Mira", hint: "Warm and enveloping" },
    Achernar: { name: "Vera", hint: "Soft and quiet" },
    Vindemiatrix: { name: "Nika", hint: "Tender and gentle" },
    Aoede: { name: "Lada", hint: "Light and bright" },
    Kore: { name: "Anna", hint: "Confident and steady" },
    Gacrux: { name: "Olga", hint: "Mature and deep" },
    Achird: { name: "Artyom", hint: "Friendly and open" },
    Algieba: { name: "Lev", hint: "Velvety and smooth" },
    Schedar: { name: "Ilya", hint: "Even and calm" },
    Enceladus: { name: "Mark", hint: "Quiet and breathy" },
    Charon: { name: "Pavel", hint: "Deep and thoughtful" },
    Algenib: { name: "Gleb", hint: "Low and slightly husky" },
  },
};

const SPEED_LABELS: Record<Locale, Record<keyof typeof SPEEDS, string>> = {
  ru: { slow: "Медленно", normal: "Обычно", fast: "Быстрее" },
  kk: { slow: "Баяу", normal: "Қалыпты", fast: "Жылдамырақ" },
  en: { slow: "Slower", normal: "Normal", fast: "Faster" },
};

// Голоса с именами и описаниями на нужном языке.
export function getVoices(locale: Locale): Voice[] {
  if (locale === "ru") return VOICES;
  return VOICES.map((v) => ({ ...v, ...VOICE_TEXT[locale][v.id] }));
}

export function voiceLabel(voice: Voice, locale: Locale): { name: string; hint: string } {
  if (locale === "ru") return { name: voice.name, hint: voice.hint };
  return VOICE_TEXT[locale][voice.id] ?? { name: voice.name, hint: voice.hint };
}

export const speedLabel = (speed: keyof typeof SPEEDS, locale: Locale) => SPEED_LABELS[locale][speed];

export type Speed = keyof typeof SPEEDS;

export type VoiceSettings = { voice: string; speed: Speed; auto: boolean };

export const DEFAULT_VOICE: VoiceSettings = { voice: "Sulafat", speed: "normal", auto: false };

export function normalizeVoice(raw: unknown): VoiceSettings {
  const r = (raw ?? {}) as Partial<VoiceSettings>;
  return {
    voice: VOICES.some((v) => v.id === r.voice) ? r.voice! : DEFAULT_VOICE.voice,
    speed: r.speed && r.speed in SPEEDS ? r.speed : DEFAULT_VOICE.speed,
    auto: Boolean(r.auto),
  };
}

export const getVoice = (id: string) => VOICES.find((v) => v.id === id) ?? VOICES[0];
