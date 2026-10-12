"use client";

import { useEffect } from "react";

export const SEEN_EVENT = "opora:notifications-seen";
const SEEN_COOKIE = "opora-seen";

// Открыли центр уведомлений — новые становятся прочитанными в этом браузере.
// Cookie пишется прямо в браузере: так открытая страница не перерисовывается и подсветка новых остаётся
// до следующего захода, а счётчик на колокольчике сразу обнуляется.
export function MarkSeen({ ids }: { ids: string[] }) {
  const key = ids.join("|");
  useEffect(() => {
    if (!key) return;
    const prev = document.cookie.match(/(?:^|; )opora-seen=([^;]*)/)?.[1];
    const old = prev ? decodeURIComponent(prev).split("|") : [];
    const next = [...new Set([...key.split("|"), ...old])].filter(Boolean).slice(0, 60).join("|");
    document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, [key]);
  return null;
}
