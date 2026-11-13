import { defineMessages, plural } from "./config";

// Главная психолога и статистика приглашений.
export const dashboardMessages = defineMessages<{
  week: (n: number) => string;
  needSummary: { title: string; hint: string; action: string };
  funnel: {
    title: string;
    views: string;
    joined: string;
    active: string;
    sharing: string;
    conversion: (pct: number) => string;
    noData: string;
  };
  invite: { conversion: string; active: string };
}>({
  ru: {
    week: (n) => plural("ru", n, { one: "встреча за 7 дней", few: "встречи за 7 дней", many: "встреч за 7 дней" }),
    needSummary: {
      title: "Запишите встречу",
      hint: "Эти встречи уже прошли. Заметка для себя, итог и задания заполняются на одном экране. Клиент получит только то, чем вы поделитесь.",
      action: "Записать",
    },
    funnel: {
      title: "Как работают ссылки",
      views: "Переходы",
      joined: "Подключились",
      active: "Работают сейчас",
      sharing: "Делятся данными",
      conversion: (pct) => `${pct}% переходов заканчиваются подключением`,
      noData: "Статистика появится, когда по ссылкам начнут переходить.",
    },
    invite: { conversion: "конверсия", active: "работают" },
  },
  kk: {
    week: () => "7 күндегі кездесу",
    needSummary: {
      title: "Кездесуді жазып алыңыз",
      hint: "Бұл кездесулер өтіп кетті. Жеке жазба, қорытынды және тапсырмалар бір экранда толтырылады. Клиент тек сіз бөліскенді алады.",
      action: "Жазу",
    },
    funnel: {
      title: "Сілтемелер қалай жұмыс істейді",
      views: "Өтулер",
      joined: "Қосылды",
      active: "Қазір жұмыс істейді",
      sharing: "Деректермен бөліседі",
      conversion: (pct) => `Өтулердің ${pct}%-ы қосылумен аяқталады`,
      noData: "Сілтемелер арқылы өте бастағанда статистика шығады.",
    },
    invite: { conversion: "конверсия", active: "жұмыс істейді" },
  },
  en: {
    week: (n) => plural("en", n, { one: "session in 7 days", other: "sessions in 7 days" }),
    needSummary: {
      title: "Record your sessions",
      hint: "These sessions are over. Your private note, the summary and assignments are on one screen. The client gets only what you share.",
      action: "Record",
    },
    funnel: {
      title: "How your links perform",
      views: "Visits",
      joined: "Joined",
      active: "Working now",
      sharing: "Sharing data",
      conversion: (pct) => `${pct}% of visits end with joining`,
      noData: "Stats will appear once people start opening your links.",
    },
    invite: { conversion: "conversion", active: "working" },
  },
});
