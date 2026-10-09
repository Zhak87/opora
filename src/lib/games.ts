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
  { slug: "grounding", title: "5-4-3-2-1", hint: "Вернуться в «здесь и сейчас» через пять чувств", group: "calm", tone: "blue" },
  { slug: "jar", title: "Банка хорошего", hint: "Соберите светлые мелочи этого дня", group: "calm", tone: "beige" },
  { slug: "garden", title: "Сад камней", hint: "Бороздки на песке и тихие камни", group: "calm", tone: "green" },
  { slug: "values", title: "Мои ценности", hint: "Узнайте, что для вас по-настоящему важно", group: "self", tone: "beige" },
  { slug: "what-if", title: "А если бы…", hint: "Карточки с вопросами о себе", group: "self", tone: "lavender" },
  { slug: "strengths", title: "Мои сильные стороны", hint: "Вспомните, на что в себе можно опереться", group: "self", tone: "green" },
  { slug: "letter", title: "Письмо себе", hint: "Напишите себе через год и запечатайте", group: "self", tone: "blue" },
  { slug: "wheel", title: "Колесо жизни", hint: "Как сейчас в разных сферах жизни", group: "self", tone: "green" },
];

export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
