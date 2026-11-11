// Знакомство с «Опорой» показываем один раз. Отметка хранится в метаданных пользователя (видна на любом
// устройстве) и в куке (на случай, если токен входа ещё не обновился).
export const GUIDE_COOKIE = "opora-guide";

export function guideSeen(claims: Record<string, unknown> | null | undefined, cookie: string | undefined) {
  const meta = claims?.user_metadata as { guide?: string } | undefined;
  return Boolean(meta?.guide) || cookie === "1";
}

// Куда можно уйти после знакомства.
export const GUIDE_DESTINATIONS = ["/", "/play", "/rooms", "/specialists", "talk"] as const;
export type GuideDestination = (typeof GUIDE_DESTINATIONS)[number];
