import { INTL, type Locale } from "@/i18n/config";

// Время в часовых поясах без сторонних библиотек: только Intl.

// Насколько минут часовой пояс опережает UTC в данный момент.
function offsetMinutes(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return (Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second) - ts) / 60_000;
}

// «2026-10-21T10:00» в поясе tz → момент времени.
export function zonedToUtc(local: string, tz: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - offsetMinutes(guess, tz) * 60_000;
  const again = guess - offsetMinutes(utc, tz) * 60_000;
  if (again !== utc) utc = again;
  return new Date(utc);
}

// Дата в поясе tz в виде «2026-10-21» — для группировки по дням.
export function dayKey(iso: string | Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

// Значение для <input type="datetime-local"> в поясе tz.
export function toLocalInput(iso: string | Date, tz: string) {
  const d = new Date(iso);
  return `${dayKey(d, tz)}T${timeOf(d, tz, "en-GB")}`;
}

export function timeOf(iso: string | Date, tz: string, locale = "ru-RU") {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function dayLabel(iso: string | Date, tz: string, locale: Locale, withWeekday = true) {
  return new Intl.DateTimeFormat(INTL[locale], {
    timeZone: tz,
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

export function whenLabel(iso: string | Date, tz: string, locale: Locale) {
  return `${dayLabel(iso, tz, locale)}, ${timeOf(iso, tz, INTL[locale])}`;
}

// День недели 1..7 (понедельник — 1) для даты «2026-10-21».
export function isoWeekday(key: string) {
  const d = new Date(`${key}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const minutesToTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const timeToMinutes = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return m ? Math.min(1440, +m[1] * 60 + +m[2]) : null;
};
