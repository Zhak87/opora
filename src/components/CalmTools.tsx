"use client";

import { useEffect } from "react";
import { Bubbles } from "./games/Bubbles";
import { Grounding } from "./games/Grounding";
import { LeafIcon } from "./icons";
import { useMsg } from "@/i18n/client";
import { chatMessages } from "@/i18n/chat";
import { gamesMessages } from "@/i18n/games";

export type CalmTool = "breath" | "bubbles" | "grounding";

// Карточка «Сначала немного успокоимся»: дыхание или спокойная игра прямо в разговоре, потом переписка.
export function CalmCard({ onPick, onSkip }: { onPick: (tool: CalmTool) => void; onSkip: () => void }) {
  const t = useMsg(chatMessages);
  const g = useMsg(gamesMessages).catalog;
  const tools: { tool: CalmTool; title: string; tone: string }[] = [
    { tool: "breath", title: t.breathe, tone: "bg-sage-soft" },
    { tool: "bubbles", title: g.bubbles.title, tone: "bg-mist" },
    { tool: "grounding", title: g.grounding.title, tone: "bg-lilac-soft" },
  ];
  return (
    <aside className="mt-8 animate-rise rounded-[26px] border border-line/70 bg-gradient-to-br from-paper via-paper to-sage-soft/50 p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute h-9 w-9 animate-breathe rounded-full bg-sage-soft" />
          <LeafIcon className="relative h-[18px] w-[18px] text-sage-deep" />
        </span>
        <div>
          <p className="text-[15.5px] font-medium text-ink">{t.calmTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.calmText}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {tools.map((x) => (
          <button
            key={x.tool}
            type="button"
            onClick={() => onPick(x.tool)}
            className={`rounded-[18px] ${x.tone} px-4 py-3 text-left text-[14.5px] text-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft`}
          >
            {x.title}
          </button>
        ))}
      </div>
      <button type="button" onClick={onSkip} className="mt-3 text-sm text-ink-faint transition hover:text-ink">
        {t.calmSkip}
      </button>
    </aside>
  );
}

// Игра поверх разговора: после неё человек возвращается в тот же чат.
export function CalmOverlay({ tool, onClose }: { tool: Exclude<CalmTool, "breath">; onClose: () => void }) {
  const t = useMsg(chatMessages);
  const meta = useMsg(gamesMessages).catalog[tool];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div role="dialog" aria-label={meta.title} className="fixed inset-0 z-50 animate-fade overflow-y-auto bg-milk/95 backdrop-blur-xl">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-serif text-[26px] leading-tight text-ink sm:text-[30px]">{meta.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{meta.hint}</p>
          </div>
        </div>
        {tool === "bubbles" ? <Bubbles /> : <Grounding />}
        <div className="mt-8 flex justify-center">
          <button onClick={onClose} className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-soft transition hover:bg-ink/90">
            {t.calmBack}
          </button>
        </div>
      </div>
    </div>
  );
}
