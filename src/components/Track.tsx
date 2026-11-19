"use client";

import { useEffect } from "react";

type Once = "always" | "session" | "day";

// Отправить событие аналитики со страницы. Тексты и личные данные не передаются: только название.
export function sendEvent(
  name: string,
  props: { game?: string; step?: string; need?: string; aud?: string; before?: number; after?: number; useful?: number; sec?: number; done?: 0 | 1 } = {},
) {
  try {
    fetch("/api/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...props }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function firstTime(key: string, once: Once) {
  if (once === "always") return true;
  try {
    const store = once === "session" ? sessionStorage : localStorage;
    const mark = once === "day" ? new Date().toISOString().slice(0, 10) : "1";
    if (store.getItem(key) === mark) return false;
    store.setItem(key, mark);
  } catch {}
  return true;
}

// Невидимая отметка «человек открыл этот экран». once: раз за вкладку, раз в день или каждый раз.
export function Track({ name, once = "session", game, aud }: { name: string; once?: Once; game?: string; aud?: string }) {
  useEffect(() => {
    if (firstTime(`opora-ev-${name}-${game ?? ""}${aud ?? ""}`, once)) sendEvent(name, { game, aud });
  }, [name, once, game, aud]);
  return null;
}
