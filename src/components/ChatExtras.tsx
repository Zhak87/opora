"use client";

import { useState } from "react";
import { addJournalEntry } from "@/lib/actions";
import { useLocale } from "@/i18n/client";
import { chatMessages } from "@/i18n/chat";

// Шкала «как вы сейчас, от 0 до 10» (собеседник v3, фазы 1 и 8): ответ уходит обычным сообщением.
export function ScaleChips({ onPick }: { onPick: (n: number) => void }) {
  const t = chatMessages[useLocale()];
  return (
    <div className="mt-3 animate-rise rounded-[20px] bg-paper/70 px-3 py-3 shadow-soft" role="group" aria-label={t.scaleLead}>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-label={t.scaleAnswer.replace("{n}", String(n))}
            className="aspect-square min-w-0 rounded-full border-2 border-sand-deep bg-paper text-[13px] font-medium text-ink transition hover:-translate-y-0.5 hover:border-lilac hover:bg-lilac-soft sm:text-sm"
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-[11px] text-ink-faint">
        <span>{t.scaleLow}</span>
        <span>{t.scaleHigh}</span>
      </div>
    </div>
  );
}

// «Сохранить вывод в дневник» (фаза 10): вывод словами человека становится записью дневника вида «Вывод».
export function SaveInsight({ text }: { text: string }) {
  const t = chatMessages[useLocale()];
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const save = async () => {
    setState("saving");
    const form = new FormData();
    form.set("kind", "insight");
    form.set("content", text);
    const result = await addJournalEntry(null, form).catch(() => null);
    setState(result && "ok" in result ? "done" : "error");
  };
  return (
    <div className="mt-2 animate-rise rounded-[20px] border-2 border-sage/50 bg-sage-soft/50 px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-sage-deep">{t.insightLead}</span>
      <p className="mt-1 text-[15px] leading-snug text-ink">{text}</p>
      {state === "done" ? (
        <p className="mt-2 text-sm text-sage-deep" role="status">{t.insightDone}</p>
      ) : (
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className="mt-2 rounded-full bg-ink px-4 py-1.5 text-sm text-paper transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {t.insightButton}
        </button>
      )}
      {state === "error" && <p className="mt-1.5 text-sm text-ink-soft" role="status">{t.insightFailed}</p>}
    </div>
  );
}
