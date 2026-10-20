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
      title: "Подведите итоги",
      hint: "Эти встречи уже прошли, но не завершены. Клиент увидит итоги и задачи, когда вы их запишете.",
      action: "Подвести итоги",
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
      title: "Қорытынды жазыңыз",
      hint: "Бұл кездесулер өтіп кетті, бірақ аяқталмаған. Қорытынды мен тапсырмаларды жазғанда клиент оларды көреді.",
      action: "Қорытынды жазу",
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
      title: "Write session outcomes",
      hint: "These sessions are over but not completed. The client sees the outcome and tasks once you write them.",
      action: "Write outcome",
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
