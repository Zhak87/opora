export type Game = {
  slug: string;
  title: string;
  hint: string;
  group: "calm" | "self";
  tone: "blue" | "green" | "lavender" | "beige";
};

export const GAMES: Game[] = [
  { slug: "bubbles", title: "Отпустить мысли", hint: "Лопайте пузырьки с тревожными мыслями", group: "calm", tone: "blue" },
  { slug: "breath", title: "Волна дыхания", hint: "Держите — вдох, отпустите — выдох", group: "calm", tone: "green" },
  { slug: "light", title: "Рисовать светом", hint: "Мягкие линии, которые тают сами", group: "calm", tone: "lavender" },
  { slug: "values", title: "Мои ценности", hint: "Узнайте, что для вас по-настоящему важно", group: "self", tone: "beige" },
  { slug: "what-if", title: "А если бы…", hint: "Карточки с вопросами о себе", group: "self", tone: "lavender" },
  { slug: "wheel", title: "Колесо жизни", hint: "Как сейчас в разных сферах жизни", group: "self", tone: "green" },
];

export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
