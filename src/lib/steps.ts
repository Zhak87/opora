// «Следующий шаг» от собеседника (раздел 4.1 стратегии): в конце ответа ИИ может поставить метку
// [[step:код]]. Человек её не видит: приложение убирает метку из текста и показывает под ответом кнопку,
// которая ведёт к практике, в комнаты, к психологам или в дневник.
export const PRACTICE_STEPS = ["breath", "bubbles", "grounding", "light", "jar", "garden", "values", "what-if", "strengths", "letter", "wheel"] as const;
export const PLACE_STEPS = ["rooms", "specialists", "journal"] as const;
export type StepCode = (typeof PRACTICE_STEPS)[number] | (typeof PLACE_STEPS)[number];

const ALL = [...PRACTICE_STEPS, ...PLACE_STEPS] as readonly string[];
const TAG = /\[\[\s*step\s*:\s*([a-z0-9-]{1,24})\s*\]\]/gi;
// Пока ответ ещё пишется, метка может прийти не целиком: прячем её начало.
const PARTIAL = /\[\[?[^\]\n]{0,40}\]?$/;

export const isStep = (v: unknown): v is StepCode => typeof v === "string" && ALL.includes(v);

// Текст без метки и сам шаг (последний из известных, если модель поставила несколько).
export function splitStep(raw: string): { text: string; step: StepCode | null } {
  let step: StepCode | null = null;
  const text = raw
    .replace(TAG, (_, code: string) => {
      const c = code.toLowerCase();
      if (isStep(c)) step = c;
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return { text, step };
}

// Для показа во время набора ответа: без целой метки и без её недописанного хвоста.
export function visibleText(raw: string) {
  return splitStep(raw.replace(PARTIAL, (tail) => (tail.startsWith("[[") || tail === "[" ? "" : tail))).text;
}

export function stepHref(step: StepCode) {
  if (step === "rooms") return "/rooms";
  if (step === "specialists") return "/specialists";
  if (step === "journal") return "/journal";
  return `/play/${step}`;
}
