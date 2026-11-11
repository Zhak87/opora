"use client";

import { useEffect } from "react";

type Once = "always" | "session" | "day";

// Отправить событие аналитики со страницы. Тексты и личные данные не передаются: только название.
export function sendEvent(name: string, game?: string, step?: string) {
  try {
    fetch("/api/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...(game ? { game } : {}), ...(step ? { step } : {}) }),
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
export function Track({ name, once = "session", game }: { name: string; once?: Once; game?: string }) {
  useEffect(() => {
    if (firstTime(`opora-ev-${name}-${game ?? ""}`, once)) sendEvent(name, game);
  }, [name, once, game]);
  return null;
}

// Практика: «начал» сразу, «прошёл» — когда человек провёл в ней не меньше 45 секунд с открытой вкладкой.
export function PracticeTrack({ game }: { game: string }) {
  useEffect(() => {
    sendEvent("practice_start", game);
    let seen = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seen += 1;
      if (seen >= 45) {
        clearInterval(timer);
        sendEvent("practice_complete", game);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [game]);
  return null;
}
