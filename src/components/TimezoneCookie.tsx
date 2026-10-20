"use client";

import { useEffect } from "react";

// Запоминает часовой пояс браузера, чтобы сервер показывал время встреч по-местному.
export function TimezoneCookie({ current }: { current: string | null }) {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== current) document.cookie = `opora-tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, [current]);
  return null;
}
