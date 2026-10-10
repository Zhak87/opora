"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { setLocale } from "@/i18n/actions";

// Переключатель языка: «Рус · Қаз · Eng». full — с полными названиями (для профиля).
export function LanguageSwitcher({ full = false, className = "" }: { full?: boolean; className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (l: Locale) => {
    if (l === current) return;
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  };
  return (
    <div role="radiogroup" aria-label="Язык · Тіл · Language" className={`inline-flex rounded-full bg-sand/70 p-1 text-sm ${pending ? "opacity-70" : ""} ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={l === current}
          lang={l}
          onClick={() => pick(l)}
          className={`rounded-full px-3.5 py-1.5 transition ${l === current ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink"}`}
        >
          {full ? LOCALE_NAMES[l] : LOCALE_SHORT[l]}
        </button>
      ))}
    </div>
  );
}
