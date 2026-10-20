import { cookies } from "next/headers";

// Часовой пояс человека: браузер сохраняет его в cookie (TimezoneCookie), по умолчанию — Алматы.
export const TZ_COOKIE = "opora-tz";
export const DEFAULT_TZ = "Asia/Almaty";

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Сохранённый браузером пояс или null.
export async function savedTimeZone() {
  let tz = (await cookies()).get(TZ_COOKIE)?.value ?? "";
  try {
    tz = decodeURIComponent(tz);
  } catch {}
  return isTimeZone(tz) ? tz : null;
}

export async function getTimeZone() {
  return (await savedTimeZone()) ?? DEFAULT_TZ;
}
