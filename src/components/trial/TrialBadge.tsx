"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMsg } from "@/i18n/client";
import { trialMessages } from "@/i18n/trial";

const format = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Обратный отсчёт пробного времени. Когда оно выходит, ведёт на экран «Создать аккаунт».
export function Countdown({ until, className = "" }: { until: number; className?: string }) {
  const router = useRouter();
  // До первого тика на клиенте показываем прочерк: время сервера и браузера может отличаться.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const ms = until - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(timer);
        router.replace("/trial");
        router.refresh();
      }
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [until, router]);
  return <span className={`tabular-nums ${className}`}>{left === null ? "–:––" : format(left)}</span>;
}

// Плашка гостя поверх приложения: сколько осталось и кнопка «Сохранить» (создать аккаунт).
export function TrialBadge({ until }: { until: number }) {
  const t = useMsg(trialMessages).badge;
  return (
    <div className="fixed left-4 top-4 z-40 mt-[env(safe-area-inset-top)] flex items-center gap-2 rounded-full bg-ink py-1.5 pl-3.5 pr-1.5 text-[13px] text-paper shadow-lift md:left-auto md:right-6 md:top-5">
      <span className="h-2 w-2 rounded-full bg-sage [animation:guide-blink_1.6s_ease-in-out_infinite]" aria-hidden />
      <span className="text-paper/70">{t.guest}</span>
      <Countdown until={until} className="font-medium" />
      <Link href="/trial" className="rounded-full bg-lilac-deep px-3 py-1.5 font-medium transition hover:bg-lilac">{t.keep}</Link>
    </div>
  );
}
