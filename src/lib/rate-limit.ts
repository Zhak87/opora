// Ограничение частоты запросов в памяти сервера: защищает ключ ИИ от перерасхода.
// Каждый экземпляр сервера считает сам, поэтому это мягкая граница, а не точный счётчик.
const buckets = new Map<string, number[]>();

export function tooMany(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) buckets.clear();
  return false;
}

export const HOUR = 60 * 60 * 1000;

// Адрес посетителя. На Vercel эти заголовки ставит сама платформа, подделать их из браузера нельзя.
export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}
