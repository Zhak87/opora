export function greeting(date = new Date()) {
  const h = Number(date.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Moscow" }));
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  if (h >= 18 && h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

export function relativeDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < 60_000) return "только что";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < day && new Date().getDate() === d.getDate()) return "сегодня";
  if (diff < 2 * day) return "вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" });
}
