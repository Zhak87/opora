import { gameHref } from "./games";
// «Следующий шаг» от собеседника (раздел 4.1 стратегии): в конце ответа ИИ может поставить метку
// [[step:код]]. Человек её не видит: приложение убирает метку из текста и показывает под ответом кнопку,
// которая ведёт к практике, в комнаты, к психологам или в дневник.
export const PRACTICE_STEPS = [
  "breath", "bubbles", "grounding", "light", "jar", "garden", "values", "what-if", "strengths", "letter", "wheel",
  "empty-bowl", "thought-jar", "emotion", "one-step", "boundaries", "mirror", "wins", "unsaid",
] as const;
export const PLACE_STEPS = ["rooms", "specialists", "journal", "dreams"] as const;
export type StepCode = (typeof PRACTICE_STEPS)[number] | (typeof PLACE_STEPS)[number];

const ALL = [...PRACTICE_STEPS, ...PLACE_STEPS] as readonly string[];

export const isStep = (v: unknown): v is StepCode => typeof v === "string" && ALL.includes(v);

// Служебные метки собеседника v3 (документ «ИИ-собеседник v3», разделы 6 и 10), их тоже никто не видит:
// [[scale]] — под ответом кнопки 0–10 («как вы сейчас»);
// [[save:текст]] — карточка «Сохранить вывод в дневник» с выводом словами человека;
// [[route:focus=…;phase=…;intent=…;score=…;practice=…;risk=…]] — запись маршрутизатора для аналитики.
export type Route = {
  focus?: string;
  phase?: number;
  intent?: string;
  score?: number;
  practice?: string;
  risk?: string;
};
export type ReplyMeta = { scale?: true; save?: string; route?: Route };

const TAG = /\[\[\s*(step|scale|save|route)\s*(?::([^\]\n]{0,600}))?\]\]/gi;
// Пока ответ ещё пишется, метка может прийти не целиком: прячем её начало.
const PARTIAL = /\[\[?[^\]\n]{0,600}\]?$/;

const ROUTE_VALUES: Record<keyof Route, RegExp> = {
  focus: /^(core_stress|core_ba|core_ps|core_cbt|core_support|act|cft|dbt|mi|emotion|none)$/,
  phase: /^(10|[0-9])$/,
  intent: /^(vent|understand|practice|calm)$/,
  score: /^(10|[0-9])$/,
  practice: /^([A-Z]{2,3}-\d{2}|none)$/,
  risk: /^(none|elevated|acute)$/,
};

function parseRoute(raw: string): Route | undefined {
  const route: Route = {};
  for (const part of raw.split(/[;,]/)) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim().toLowerCase() as keyof Route;
    const value = rest.join("=").trim();
    if (!(key in ROUTE_VALUES) || !ROUTE_VALUES[key].test(value)) continue;
    if (key === "phase" || key === "score") route[key] = Number(value);
    else route[key] = value;
  }
  return Object.keys(route).length ? route : undefined;
}

// Текст без меток, сам шаг (последний из известных, если модель поставила несколько) и служебные метки v3.
export function splitStep(raw: string): { text: string; step: StepCode | null; meta: ReplyMeta | null } {
  let step: StepCode | null = null;
  const meta: ReplyMeta = {};
  const text = raw
    .replace(TAG, (_, kind: string, value: string | undefined) => {
      const v = (value ?? "").trim();
      switch (kind.toLowerCase()) {
        case "step": {
          const c = v.toLowerCase();
          if (isStep(c)) step = c;
          break;
        }
        case "scale":
          meta.scale = true;
          break;
        case "save":
          if (v) meta.save = v.replace(/\s+/g, " ").slice(0, 400);
          break;
        case "route": {
          const route = parseRoute(v);
          if (route) meta.route = route;
          break;
        }
      }
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return { text, step, meta: Object.keys(meta).length ? meta : null };
}

// Для показа во время набора ответа: без целой метки и без её недописанного хвоста.
export function visibleText(raw: string) {
  return splitStep(raw.replace(PARTIAL, (tail) => (tail.startsWith("[[") || tail === "[" ? "" : tail))).text;
}

// Обратно в текст для истории, которую видит собеседник: так он помнит, что уже предлагал и на какой фазе разговор.
export function joinTags(content: string, step: string | null | undefined, meta: ReplyMeta | null | undefined) {
  const tags: string[] = [];
  if (meta?.scale) tags.push("[[scale]]");
  if (meta?.save) tags.push(`[[save:${meta.save}]]`);
  if (step) tags.push(`[[step:${step}]]`);
  if (meta?.route) {
    const r = Object.entries(meta.route).map(([k, v]) => `${k}=${v}`).join(";");
    if (r) tags.push(`[[route:${r}]]`);
  }
  return tags.length ? `${content}\n${tags.join("\n")}` : content;
}

// Метаданные из базы: берём только то, что умеем показать.
export function readMeta(value: unknown): ReplyMeta | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const meta: ReplyMeta = {};
  if (v.scale === true) meta.scale = true;
  if (typeof v.save === "string" && v.save) meta.save = v.save.slice(0, 400);
  if (v.route && typeof v.route === "object") meta.route = v.route as Route;
  return Object.keys(meta).length ? meta : null;
}

export function stepHref(step: StepCode) {
  if (step === "rooms") return "/rooms";
  if (step === "specialists") return "/specialists";
  if (step === "journal") return "/journal";
  if (step === "dreams") return "/dreams/new";
  return gameHref(step);
}
