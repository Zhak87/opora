import { INTL, type Locale } from "@/i18n/config";

const GREETINGS: Record<Locale, { morning: string; day: string; evening: string; night: string }> = {
  ru: { morning: "Доброе утро", day: "Добрый день", evening: "Добрый вечер", night: "Доброй ночи" },
  kk: { morning: "Қайырлы таң", day: "Қайырлы күн", evening: "Қайырлы кеш", night: "Тыныш түн" },
  en: { morning: "Good morning", day: "Good afternoon", evening: "Good evening", night: "Good night" },
};

const RELATIVE: Record<Locale, { now: string; minAgo: (n: number) => string; today: string; yesterday: string }> = {
  ru: { now: "только что", minAgo: (n) => `${n} мин назад`, today: "сегодня", yesterday: "вчера" },
  kk: { now: "жаңа ғана", minAgo: (n) => `${n} мин бұрын`, today: "бүгін", yesterday: "кеше" },
  en: { now: "just now", minAgo: (n) => `${n} min ago`, today: "today", yesterday: "yesterday" },
};

export function greeting(date = new Date(), locale: Locale = "ru") {
  const g = GREETINGS[locale];
  const h = Number(date.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Moscow" }));
  if (h >= 5 && h < 12) return g.morning;
  if (h >= 12 && h < 18) return g.day;
  if (h >= 18 && h < 23) return g.evening;
  return g.night;
}

export function relativeDate(iso: string, locale: Locale = "ru") {
  const r = RELATIVE[locale];
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < 60_000) return r.now;
  if (diff < 3_600_000) return r.minAgo(Math.floor(diff / 60_000));
  if (diff < day && new Date().getDate() === d.getDate()) return r.today;
  if (diff < 2 * day) return r.yesterday;
  return d.toLocaleDateString(INTL[locale], { day: "numeric", month: "long", timeZone: "Europe/Moscow" });
}
