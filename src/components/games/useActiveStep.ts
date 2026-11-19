"use client";

import { cleanStep, type ActiveStep } from "@/lib/practice-state";
import { useSynced } from "@/lib/use-synced";

// Старый шаг, сохранённый только в этом браузере до аудита (ключ opora-one-step), переносим в аккаунт.
function legacy(): ActiveStep | null {
  try {
    const raw = localStorage.getItem("opora-one-step");
    if (!raw) return null;
    localStorage.removeItem("opora-one-step");
    return cleanStep(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Активный «следующий шаг» аккаунта: общий для сайта и приложения, для всех практик.
export function useActiveStep() {
  const { value, save, status } = useSynced<ActiveStep>("step", cleanStep, legacy);
  return {
    step: value,
    status,
    set: (text: string, from?: string, when?: ActiveStep["when"]) => save({ text: text.trim().slice(0, 300), at: Date.now(), from, when }, true),
    clear: () => save(null, true),
  };
}
