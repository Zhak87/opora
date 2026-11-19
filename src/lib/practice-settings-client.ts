"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, cleanSettings, type PracticeSettings } from "@/lib/practice-state";

// Настройки практик на этом устройстве: звук, вибрация, активные анимации.
// Звук выключается в общем звуковом контексте (src/lib/chime.ts), анимации — атрибутом data-calm на <html>.
const KEY = "opora-practice-settings";
const listeners = new Set<(s: PracticeSettings) => void>();
let current: PracticeSettings | null = null;

export function practiceSettings(): PracticeSettings {
  if (current) return current;
  try {
    current = cleanSettings(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    current = DEFAULT_SETTINGS;
  }
  return current;
}

function apply(s: PracticeSettings) {
  try {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!s.motion || reduced) document.documentElement.dataset.calm = "1";
    else delete document.documentElement.dataset.calm;
  } catch {}
}

export function setPracticeSettings(patch: Partial<PracticeSettings>) {
  current = { ...practiceSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  apply(current);
  listeners.forEach((l) => l(current!));
}

export const soundOn = () => (typeof window === "undefined" ? false : practiceSettings().sound);

export function vibrate(ms = 12) {
  try {
    if (practiceSettings().haptics) navigator.vibrate?.(ms);
  } catch {}
}

export function usePracticeSettings() {
  const [s, setS] = useState<PracticeSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const now = practiceSettings();
    setS(now);
    apply(now);
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}
