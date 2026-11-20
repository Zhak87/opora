// «Мои границы»: механика без ИИ и без обязательного письма. Ситуация идёт в три хода; на каждом ходу
// человек выбирает ответ, другой реагирует, и меняются две шкалы: «ваши силы» и «связь».
// Концовка зависит от всего пути. Тексты сценариев — в src/i18n/game-boundaries.ts.

// 0 — уступить, 1 — ответить резко, 2 — уйти от разговора, 3 — сказать спокойно и ясно.
export type Style = 0 | 1 | 2 | 3;
export type Ending = "clear" | "yield" | "wall" | "fog" | "mixed";
export const ENDINGS: Ending[] = ["clear", "yield", "wall", "fog", "mixed"];

export const SCENARIO_IDS = ["debt", "work", "relatives", "night", "weekend"] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type Meters = { self: number; link: number };
export const START: Meters = { self: 3, link: 3 };
export const MAX = 6;

const EFFECT: Record<Style, [number, number]> = { 0: [-1, 1], 1: [1, -2], 2: [0, -1], 3: [1, 0] };

// Как меняются шкалы после хода. Повторная уступка уже не добавляет близости,
// а спокойный ответ подряд добавляет уважения.
export function step(m: Meters, style: Style, prev: Style | null): Meters {
  const ds = EFFECT[style][0];
  let dl = EFFECT[style][1];
  if (style === 0 && prev === 0) dl = 0;
  if (style === 3 && prev === 3) dl = 1;
  const c = (n: number) => Math.max(0, Math.min(MAX, n));
  return { self: c(m.self + ds), link: c(m.link + dl) };
}

export function meters(path: Style[]): Meters {
  return path.reduce<{ m: Meters; prev: Style | null }>((acc, s) => ({ m: step(acc.m, s, acc.prev), prev: s }), { m: START, prev: null }).m;
}

export function ending(path: Style[]): Ending {
  const n = (s: Style) => path.filter((x) => x === s).length;
  if (n(3) >= 2) return "clear";
  if (n(0) >= 2) return "yield";
  if (n(1) >= 2) return "wall";
  if (n(2) >= 2) return "fog";
  return "mixed";
}

// Цвета сцены для каждого вида ответа.
export const TINT: Record<Style, string> = { 0: "#8db4ea", 1: "#ff8f7a", 2: "#b9b4d6", 3: "#9fe6c8" };
export const GLOW: Record<Style, string> = { 0: "#4d5f96", 1: "#8a4660", 2: "#4a4a78", 3: "#3f7f7a" };
export const ENDING_STYLE: Record<Ending, Style> = { clear: 3, yield: 0, wall: 1, fog: 2, mixed: 3 };
export const ENDING_TINT: Record<Ending, string> = { clear: "#9fe6c8", yield: "#8db4ea", wall: "#ff8f7a", fog: "#b9b4d6", mixed: "#ffd59c" };
