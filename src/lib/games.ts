import type { Locale } from "@/i18n/config";
import { gamesMessages, type Category, type GameSlug } from "@/i18n/games";

export type { Category, GameSlug, Feeling } from "@/i18n/games";

export type Game = {
  slug: GameSlug;
  title: string;
  hint: string;
  why: string;
  how: string[];
  group: Category;
  tone: "blue" | "green" | "lavender" | "beige";
  minutes: string;
  flagship?: boolean;
  isNew?: boolean;
  // Где практика живёт после аудита 19.11.2026: в каталоге игр или в другом разделе.
  place: Place;
  // Свободный формат: нет обязательного результата, есть отдельное «закончить сессию».
  free?: boolean;
};

export type Place = "play" | "inside" | "journal" | "day" | "planning" | "profile" | "explore" | "chat";

export const CATEGORIES: Category[] = ["calm", "self", "relations", "confidence", "path", "heard"];

// Восемь форматов основного каталога (аудит 19.11.2026) и то, что переехало в другие разделы.
// Записи и история переехавших практик остаются в базе под прежними названиями (practice_runs.game).
const BASE: Omit<Game, "title" | "hint" | "why" | "how">[] = [
  { slug: "boundaries", group: "relations", tone: "blue", minutes: "4–6", flagship: true, isNew: true, place: "play" },
  { slug: "garden", group: "calm", tone: "green", minutes: "2–10", isNew: true, place: "play", free: true },
  { slug: "thought-jar", group: "calm", tone: "beige", minutes: "3–5", isNew: true, place: "play" },
  { slug: "breath", group: "calm", tone: "blue", minutes: "1–4", place: "play", free: true },
  { slug: "grounding", group: "calm", tone: "green", minutes: "2–3", place: "play" },
  { slug: "light", group: "calm", tone: "lavender", minutes: "2–5", place: "play", free: true },
  { slug: "empty-bowl", group: "calm", tone: "lavender", minutes: "3–7", place: "play" },
  { slug: "emotion", group: "self", tone: "lavender", minutes: "1–3", place: "play" },
  { slug: "bubbles", group: "calm", tone: "blue", minutes: "1–2", place: "inside" },
  { slug: "what-if", group: "self", tone: "beige", minutes: "5–7", place: "journal" },
  { slug: "letter", group: "self", tone: "blue", minutes: "5–10", place: "journal" },
  { slug: "unsaid", group: "relations", tone: "beige", minutes: "5–10", place: "journal" },
  { slug: "wins", group: "confidence", tone: "beige", minutes: "2–3", place: "day" },
  { slug: "jar", group: "confidence", tone: "beige", minutes: "2–3", place: "day" },
  { slug: "strengths", group: "confidence", tone: "green", minutes: "5–7", place: "profile" },
  { slug: "wheel", group: "path", tone: "green", minutes: "5–7", place: "planning" },
  { slug: "values", group: "path", tone: "lavender", minutes: "5–7", place: "planning" },
  { slug: "one-step", group: "path", tone: "blue", minutes: "3–5", place: "planning" },
  { slug: "mirror", group: "self", tone: "lavender", minutes: "10–15", place: "explore" },
  { slug: "talk-out", group: "heard", tone: "lavender", minutes: "5–15", place: "chat" },
];

export const GAME_SLUGS = BASE.map((g) => g.slug);
export const CATALOG_SLUGS = BASE.filter((g) => g.place === "play").map((g) => g.slug);

// Список практик на нужном языке (все, включая переехавшие: их названия нужны в отчётах и новых разделах).
export const getGames = (locale: Locale): Game[] =>
  BASE.map((g) => ({ ...g, ...gamesMessages[locale].catalog[g.slug] }));

// Только основной каталог игр.
export const getCatalog = (locale: Locale): Game[] => getGames(locale).filter((g) => g.place === "play");

// Русский список — для кода, которому язык не важен.
export const GAMES: Game[] = getGames("ru");

export const getGame = (slug: string, locale: Locale = "ru") => getGames(locale).find((g) => g.slug === slug);

// Инструменты, переехавшие из каталога: адрес /tools/<tool> и практика, чьи записи они продолжают.
export const TOOLS = {
  letter: "letter",
  unsaid: "unsaid",
  day: "wins",
  strengths: "strengths",
  wheel: "wheel",
  compass: "values",
  step: "one-step",
  mirror: "mirror",
} as const satisfies Record<string, GameSlug>;
export type ToolId = keyof typeof TOOLS;
export const isTool = (v: string): v is ToolId => v in TOOLS;
// В каком разделе инструмент и куда ведёт «назад».
export const TOOL_HOME: Record<ToolId, { place: Place; href: string }> = {
  letter: { place: "journal", href: "/journal" },
  unsaid: { place: "journal", href: "/journal" },
  day: { place: "day", href: "/" },
  strengths: { place: "profile", href: "/profile" },
  wheel: { place: "planning", href: "/planning" },
  compass: { place: "planning", href: "/planning" },
  step: { place: "planning", href: "/planning" },
  mirror: { place: "explore", href: "/explore" },
};

// Старые ссылки /play/<slug> (из чата, подборок, закладок) ведут в новое место.
const MOVED: Partial<Record<GameSlug, string>> = {
  bubbles: "/play/thought-jar",
  "what-if": "/journal?prompts=what-if",
  letter: "/tools/letter",
  unsaid: "/tools/unsaid",
  wins: "/tools/day",
  jar: "/tools/day",
  strengths: "/tools/strengths",
  wheel: "/tools/wheel",
  values: "/tools/compass",
  "one-step": "/tools/step",
  mirror: "/tools/mirror",
  "talk-out": "/talk",
};
export const movedHref = (slug: string): string | null => MOVED[slug as GameSlug] ?? null;
export const gameHref = (slug: string) => movedHref(slug) ?? `/play/${slug}`;

// Что предложить после практики: соседей по категории и одну практику из другой.
const AFTER: Partial<Record<GameSlug, GameSlug[]>> = {
  boundaries: ["thought-jar", "breath"],
  garden: ["breath", "light"],
  "thought-jar": ["breath", "boundaries"],
  breath: ["garden", "grounding"],
  grounding: ["breath", "emotion"],
  light: ["garden", "empty-bowl"],
  "empty-bowl": ["breath", "thought-jar"],
  emotion: ["thought-jar", "breath"],
};

export function nextGames(slug: string, locale: Locale): Game[] {
  const all = getGames(locale);
  const picked = AFTER[slug as GameSlug] ?? ["breath", "emotion"];
  return picked.filter((s) => s !== slug).map((s) => all.find((g) => g.slug === s)!).filter((g) => g && g.place === "play");
}
