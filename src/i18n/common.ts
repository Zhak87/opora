import { defineMessages } from "./config";

// Общие тексты: название, навигация, кнопки, которые встречаются в разных местах.
export const common = defineMessages({
  ru: {
    brand: "Опора",
    metaTitle: "Опора — место, где можно остановиться",
    metaDescription: "Спокойное пространство, чтобы выговориться, разобраться в себе и найти внутреннюю опору.",
    nav: { home: "Главная", talk: "Поговорить", journal: "Дневник", hope: "Надежда", profile: "Профиль" },
    navTagline: "Меньше интерфейса — больше пространства для вас.",
    back: "Назад",
    language: "Язык",
  },
  kk: {
    brand: "Опора",
    metaTitle: "Опора — тоқтап, тыныстауға болатын орын",
    metaDescription: "Көңілдегіні айтып, өзіңізді түсініп, ішкі тірек табуға арналған тыныш кеңістік.",
    nav: { home: "Басты бет", talk: "Сөйлесу", journal: "Күнделік", hope: "Үміт", profile: "Профиль" },
    navTagline: "Интерфейс азырақ, сізге кеңістік көбірек.",
    back: "Артқа",
    language: "Тіл",
  },
  en: {
    brand: "Opora",
    metaTitle: "Opora — a place to pause",
    metaDescription: "A calm space to talk things through, understand yourself and find your inner support.",
    nav: { home: "Home", talk: "Talk", journal: "Journal", hope: "Hope", profile: "Profile" },
    navTagline: "Less interface, more space for you.",
    back: "Back",
    language: "Language",
  },
});
