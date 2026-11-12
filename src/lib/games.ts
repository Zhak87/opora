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
};

export const CATEGORIES: Category[] = ["calm", "self", "relations", "confidence", "path", "heard"];

// Порядок внутри категории = порядок на странице. Названия и тексты — в src/i18n/games.ts.
const BASE: Omit<Game, "title" | "hint" | "why" | "how">[] = [
  { slug: "empty-bowl", group: "calm", tone: "lavender", minutes: "3–7", flagship: true },
  { slug: "thought-jar", group: "calm", tone: "beige", minutes: "3–5" },
  { slug: "breath", group: "calm", tone: "blue", minutes: "2–4" },
  { slug: "grounding", group: "calm", tone: "green", minutes: "3–5" },
  { slug: "bubbles", group: "calm", tone: "blue", minutes: "2–3" },
  { slug: "light", group: "calm", tone: "lavender", minutes: "2–5" },
  { slug: "garden", group: "calm", tone: "green", minutes: "3–5" },
  { slug: "emotion", group: "self", tone: "lavender", minutes: "3–5" },
  { slug: "mirror", group: "self", tone: "lavender", minutes: "5–7", isNew: true },
  { slug: "what-if", group: "self", tone: "beige", minutes: "5–7" },
  { slug: "letter", group: "self", tone: "blue", minutes: "5–10" },
  { slug: "boundaries", group: "relations", tone: "blue", minutes: "5–7", isNew: true },
  { slug: "unsaid", group: "relations", tone: "beige", minutes: "5–10", isNew: true },
  { slug: "wins", group: "confidence", tone: "beige", minutes: "2–3", isNew: true },
  { slug: "strengths", group: "confidence", tone: "green", minutes: "5–7" },
  { slug: "jar", group: "confidence", tone: "beige", minutes: "2–3" },
  { slug: "wheel", group: "path", tone: "green", minutes: "5–7" },
  { slug: "values", group: "path", tone: "lavender", minutes: "5–7", isNew: true },
  { slug: "one-step", group: "path", tone: "blue", minutes: "3–5" },
  { slug: "talk-out", group: "heard", tone: "lavender", minutes: "5–15" },
];

export const GAME_SLUGS = BASE.map((g) => g.slug);

// Список практик на нужном языке.
export const getGames = (locale: Locale): Game[] =>
  BASE.map((g) => ({ ...g, ...gamesMessages[locale].catalog[g.slug] }));

// Русский список — для кода, которому язык не важен.
export const GAMES: Game[] = getGames("ru");

export const getGame = (slug: string, locale: Locale = "ru") => getGames(locale).find((g) => g.slug === slug);

// Что предложить после практики: соседей по категории и одну практику из другой.
const AFTER: Partial<Record<GameSlug, GameSlug[]>> = {
  "empty-bowl": ["breath", "thought-jar"],
  "thought-jar": ["one-step", "empty-bowl"],
  breath: ["empty-bowl", "grounding"],
  grounding: ["breath", "emotion"],
  emotion: ["thought-jar", "talk-out"],
  wheel: ["one-step", "values"],
  values: ["one-step", "mirror"],
  "one-step": ["strengths", "wheel"],
  "talk-out": ["emotion", "empty-bowl"],
  bubbles: ["empty-bowl", "thought-jar"],
  jar: ["wins", "empty-bowl"],
  strengths: ["wins", "one-step"],
  wins: ["strengths", "jar"],
  mirror: ["values", "emotion"],
  boundaries: ["unsaid", "talk-out"],
  unsaid: ["talk-out", "empty-bowl"],
};

export function nextGames(slug: string, locale: Locale): Game[] {
  const all = getGames(locale);
  const picked = AFTER[slug as GameSlug] ?? ["empty-bowl", "emotion"];
  return picked.filter((s) => s !== slug).map((s) => all.find((g) => g.slug === s)!).filter(Boolean);
}
