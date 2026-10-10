import type { Locale } from "@/i18n/config";
import { gamesMessages } from "@/i18n/games";

export type Game = {
  slug: string;
  title: string;
  hint: string;
  group: "calm" | "self";
  tone: "blue" | "green" | "lavender" | "beige";
};

type Slug = keyof (typeof gamesMessages)["ru"]["catalog"];

const BASE: { slug: Slug; group: Game["group"]; tone: Game["tone"] }[] = [
  { slug: "bubbles", group: "calm", tone: "blue" },
  { slug: "breath", group: "calm", tone: "green" },
  { slug: "light", group: "calm", tone: "lavender" },
  { slug: "grounding", group: "calm", tone: "blue" },
  { slug: "jar", group: "calm", tone: "beige" },
  { slug: "garden", group: "calm", tone: "green" },
  { slug: "values", group: "self", tone: "beige" },
  { slug: "what-if", group: "self", tone: "lavender" },
  { slug: "strengths", group: "self", tone: "green" },
  { slug: "letter", group: "self", tone: "blue" },
  { slug: "wheel", group: "self", tone: "green" },
];

// Список игр на нужном языке (названия и подсказки из src/i18n/games.ts).
export const getGames = (locale: Locale): Game[] =>
  BASE.map((g) => ({ ...g, ...gamesMessages[locale].catalog[g.slug] }));

// Русский список — для кода, которому язык не важен.
export const GAMES: Game[] = getGames("ru");

export const getGame = (slug: string, locale: Locale = "ru") => getGames(locale).find((g) => g.slug === slug);
