"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { skipIntake } from "@/lib/intake-actions";
import { useMsg } from "@/i18n/client";
import { intakeMessages } from "@/i18n/intake";
import { ArrowIcon } from "./icons";

// Приглашение заполнить анкету на главной. «Не сейчас» прячет его насовсем (анкета остаётся в профиле).
export function IntakeCard() {
  const m = useMsg(intakeMessages);
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();
  if (hidden) return null;
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-[24px] border border-lilac/40 bg-gradient-to-r from-lilac-soft/70 via-paper to-paper p-5 shadow-soft sm:flex-row sm:items-center">
      <Link href="/intake" className="group flex flex-1 items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-lilac-deep shadow-soft" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5h8a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V9" />
            <path d="M3 3l6 6M9 13h6M9 17h4" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium text-ink">{m.homeTitle}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">{m.homeText}</span>
        </span>
        <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink sm:hidden" />
      </Link>
      <div className="flex shrink-0 items-center gap-2 justify-end sm:justify-start">
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            start(() => skipIntake());
          }}
          className="rounded-full px-4 py-2 text-sm text-ink-faint transition hover:bg-sand/60 hover:text-ink"
        >
          {m.later}
        </button>
        <Link href="/intake" className="hidden rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper shadow-soft transition hover:bg-ink/90 sm:inline-flex">
          {m.homeStart}
        </Link>
      </div>
    </div>
  );
}
