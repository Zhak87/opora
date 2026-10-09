// Голоса для озвучки ответов. Имена — встроенные голоса Gemini TTS, описания — для человека.

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

export const TONES = {
  calm: { label: "Спокойный", prompt: "Прочитай спокойно, неторопливо и мягко, как близкий человек, который рядом" },
  warm: { label: "Тёплый", prompt: "Прочитай тепло и заботливо, с искренним участием в голосе" },
  soft: { label: "Тихий", prompt: "Прочитай очень тихо и нежно, почти шёпотом, как перед сном" },
  cheer: { label: "Ободряющий", prompt: "Прочитай бодро и ободряюще, с лёгкой улыбкой в голосе, но без суеты" },
  plain: { label: "Нейтральный", prompt: "Прочитай естественно и ровно" },
} as const;

export type Tone = keyof typeof TONES;

export const SPEEDS = { slow: { label: "Медленно", rate: 0.9 }, normal: { label: "Обычно", rate: 1 }, fast: { label: "Быстрее", rate: 1.12 } } as const;

export type Speed = keyof typeof SPEEDS;

export type VoiceSettings = { voice: string; tone: Tone; speed: Speed; auto: boolean };

export const DEFAULT_VOICE: VoiceSettings = { voice: "Sulafat", tone: "calm", speed: "normal", auto: false };

export function normalizeVoice(raw: unknown): VoiceSettings {
  const r = (raw ?? {}) as Partial<VoiceSettings>;
  return {
    voice: VOICES.some((v) => v.id === r.voice) ? r.voice! : DEFAULT_VOICE.voice,
    tone: r.tone && r.tone in TONES ? r.tone : DEFAULT_VOICE.tone,
    speed: r.speed && r.speed in SPEEDS ? r.speed : DEFAULT_VOICE.speed,
    auto: Boolean(r.auto),
  };
}

export const getVoice = (id: string) => VOICES.find((v) => v.id === id) ?? VOICES[0];
