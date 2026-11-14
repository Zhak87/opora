// Дневник снов: общие для сервера и браузера типы, списки и правила.
// Подход по ТЗ «Дневник снов» v2.0: сон — материал для наблюдения за чувствами и мыслями,
// а не для толкования. Символы не расшифровываем и не говорим, «что значит» сон.

export const DREAM_TYPES = ["usual", "recurring", "nightmare", "lucid"] as const;
export type DreamType = (typeof DREAM_TYPES)[number];

export const DREAM_EMOTIONS = [
  "anxiety", "fear", "sadness", "anger", "shame", "guilt", "confusion",
  "surprise", "interest", "joy", "tenderness", "calm", "relief",
] as const;
export type DreamEmotion = (typeof DREAM_EMOTIONS)[number];
export type EmotionMark = { emotion: DreamEmotion; intensity: number };

// Палитра «Ночь над Алатау» из ТЗ.
export const NIGHT = {
  sky: "#2E2A4F",
  violet: "#6E5BA8",
  lavender: "#B9AEE0",
  haze: "#EEEAF8",
  cream: "#FBF7F0",
  peach: "#F4B9A0",
  mint: "#9FD6C8",
  gold: "#F2D58A",
  graphite: "#2B2838",
} as const;

// Доминирующий цвет кадра зависит от чувства (раздел 7.2 ТЗ).
export const MOODS = {
  night: { en: "deep indigo night with soft moonlight", from: "#2E2A4F", to: "#6E5BA8" },
  peach: { en: "warm peach and dusty rose", from: "#6E5BA8", to: "#F4B9A0" },
  lavender: { en: "cool lavender", from: "#4A4279", to: "#B9AEE0" },
  lavender_gold: { en: "lavender with star gold accents", from: "#6E5BA8", to: "#F2D58A" },
  mint_gold: { en: "mint with star gold accents", from: "#3F6F78", to: "#9FD6C8" },
} as const;
export type Mood = keyof typeof MOODS;
export const isMood = (v: unknown): v is Mood => typeof v === "string" && v in MOODS;

export const EMOTION_MOOD: Record<DreamEmotion, Mood> = {
  anxiety: "peach", shame: "peach", guilt: "peach", anger: "peach",
  fear: "night", confusion: "night",
  sadness: "lavender",
  surprise: "lavender_gold", interest: "lavender_gold",
  joy: "mint_gold", relief: "mint_gold", calm: "mint_gold", tenderness: "mint_gold",
};

// Аватар «Сновидец»: один и тот же герой во всех кадрах. Фото не загружаем — это приватнее.
export const DREAMERS = {
  mint: { hair: "#2B2838", skin: "#F3D2B8", outfit: "#9FD6C8", en: "a young person with a short dark bob haircut, warm light skin, a mint green sweater and dark indigo trousers, simple friendly face with rosy cheeks" },
  peach: { hair: "#7A4B2E", skin: "#E9BE9B", outfit: "#F4B9A0", en: "a young person with wavy shoulder-length chestnut hair, light tan skin, a peach hoodie and dark indigo trousers, simple friendly face with rosy cheeks" },
  violet: { hair: "#1B1A26", skin: "#C99672", outfit: "#6E5BA8", en: "a young person with short curly black hair, medium brown skin, a dusk violet jacket and cream trousers, simple friendly face" },
  gold: { hair: "#D9C7A0", skin: "#F6DFCB", outfit: "#F2D58A", en: "a young person with a light blond ponytail, fair skin, a soft yellow cardigan, round glasses and dark indigo trousers, simple friendly face" },
} as const;
export type Dreamer = keyof typeof DREAMERS;
export const isDreamer = (v: unknown): v is Dreamer => typeof v === "string" && v in DREAMERS;

export const MAX_PANELS = 4;
export const DREAM_TEXT_MAX = 4000;

export type DreamPanel = {
  id: string;
  position: number;
  scene: string;
  caption: string;
  mood: Mood;
  added: string[];
  softened: boolean;
  skipped: boolean;
  status: "pending" | "ready" | "failed";
  url: string | null;
};

export type DreamReflection = { noticed: string; questions: string[] };

/* ---------- Промпт для генератора картинок (раздел 7.4 ТЗ) ---------- */

const STYLE =
  "Single comic panel, soft storybook flat illustration, clean crisp shapes, rounded forms, gentle film grain, " +
  "limited pastel night palette (deep indigo #2E2A4F, dusk violet #6E5BA8, lavender #B9AEE0, cream #FBF7F0, peach #F4B9A0, mint #9FD6C8, star gold #F2D58A), " +
  "soft moonlight with a clear light source, calm and safe mood, gentle surreal dreamlike composition.";
const FRAMING =
  "Vertical composition, the character occupies about a quarter of the frame and is fully visible, " +
  "keep the bottom fifth of the frame calm and empty.";
const NEGATIVE =
  "No text, no letters, no captions, no speech bubbles, no watermark, no gore, no blood, no wounds, no nudity, no weapons, " +
  "no horror style, no photorealism, no realistic faces of real people, no harsh black outlines, no neon.";

export function panelPrompt(visual: string, mood: Mood, dreamer: Dreamer, withCharacter = true) {
  return [
    `STYLE: ${STYLE}`,
    withCharacter ? `CHARACTER: ${DREAMERS[dreamer].en}. The same character in every panel.` : "",
    `SCENE: ${visual}`,
    `MOOD COLOR: ${MOODS[mood].en}.`,
    `FRAMING: ${FRAMING}`,
    NEGATIVE,
  ]
    .filter(Boolean)
    .join("\n");
}

// Тяжёлые образы в описании кадра (раздел 7.5 ТЗ): такой кадр рисуем символически, без фигур.
const HEAVY =
  /\b(blood|bloody|gore|wound|corpse|dead body|murder|kill|stab|knife|gun|rifle|pistol|weapon|naked|nude|sex|rape|suicide|hang(ing|ed)?|torture|mutilat|decapitat)\w*/i;
export const looksHeavy = (visual: string) => HEAVY.test(visual);
export const SYMBOLIC_SCENE =
  "an empty quiet place at night with soft mist and slow dark ribbons of fog, a single warm light far away, no people, no figures";

/* ---------- Запрещённые формулировки (раздел 2.1 ТЗ) ---------- */

// Толкования, прогнозы и диагнозы. Проверяется после генерации: если нашлось, текст не показываем.
const FORBIDDEN = [
  /это (значит|означает|символизирует|знак|признак|говорит о)/i,
  /(ваш|твой|этот) сон (говорит|означает|значит|предвещает|символизирует|показывает, что)/i,
  /подсознани\S* (хочет|говорит|пытается|подсказывает|сигнализирует)/i,
  /символизиру|предвеща|вещий|к (деньгам|болезни|смерти|беде|удаче)\b/i,
  /у вас (депресси|тревожное расстройство|птср|невроз|расстройство)/i,
  /диагноз/i,
  /(this|it|that) (means|symboli[sz]es|is a sign)/i,
  /your dream (means|says|tells|is telling|symboli[sz]es|predicts|reveals)/i,
  /your (subconscious|unconscious) (wants|is trying|is telling)/i,
  /you (have|are suffering from) (depression|anxiety disorder|ptsd)/i,
  /diagnos/i,
  /бұл (.{0,24})(білдіреді|нышаны|белгісі)/i,
  /түсіңіз (.{0,24})(айтады|білдіреді|болжайды)/i,
  /бейсана\S* (.{0,16})(қалайды|айтады)/i,
  /диагноз/i,
];
export const hasForbidden = (text: string) => FORBIDDEN.some((r) => r.test(text));

// Подпись кадра должна быть точной цитатой из слов человека (с точностью до пробелов и регистра).
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export function isQuote(caption: string, text: string) {
  const c = squash(caption).replace(/^[«"'…\s]+|[»"'….,!?\s]+$/g, "");
  return c.length >= 3 && squash(text).includes(c);
}
