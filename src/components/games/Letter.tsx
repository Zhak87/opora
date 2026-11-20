"use client";

import { useState, useTransition } from "react";
import { chime } from "@/lib/chime";
import { addJournalEntry } from "@/lib/actions";
import { StartForm } from "../StartForm";
import { buttonStyles } from "../ui";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { letterMessages } from "@/i18n/game-letter";
import { gamesMessages } from "@/i18n/games";
import { usePractice } from "./PracticeFlow";

// Письмо себе: написать и «запечатать». Запечатанное письмо сразу сохраняется в дневник (аудит 19.11.2026:
// раньше для этого нужно было отдельное действие). Если сохранить не вышло, текст остаётся и можно повторить.
export function Letter() {
  const m = useMsg(letterMessages);
  const locale = useLocale();
  const PROMPTS = m.prompts;
  const [text, setText] = useState("");
  const [sealed, setSealed] = useState(false);
  const [hint, setHint] = useState(0);
  const [save, setSave] = useState<"idle" | "saved" | "failed">("idle");
  const [saving, start] = useTransition();
  const { report } = usePractice();

  const seal = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("kind", "goal");
      fd.set("content", m.journal(new Date().toLocaleDateString(INTL[locale]), text));
      try {
        const r = await addJournalEntry(undefined, fd);
        if (r && "ok" in r) {
          setSave("saved");
          report("Письмо себе запечатано и сохранено в дневник.");
        } else setSave("failed");
      } catch {
        setSave("failed");
      }
    });

  if (sealed)
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-[200px] w-[300px] animate-[card-in_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both]" aria-hidden>
          <div className="absolute inset-0 rounded-[18px] bg-sand shadow-lift" />
          <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full">
            <path d="M0 18 L150 120 L300 18" fill="none" stroke="#d8cfc0" strokeWidth="2" />
            <path d="M0 200 L120 100 M300 200 L180 100" stroke="#dcdfea" strokeWidth="2" />
          </svg>
          <span
            className="absolute left-1/2 top-[104px] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lilac-deep font-serif text-lg text-paper shadow-lift"
            style={{ animation: "card-in 0.5s 0.5s cubic-bezier(0.3,1.6,0.5,1) both" }}
          >
            {m.sealMark}
          </span>
        </div>
        <p className="mt-8 font-serif text-[24px] text-ink">{m.sealed}</p>
        <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed text-ink-soft">
          {m.sealedBody}
        </p>
        <p className="mt-4 text-[14px] text-ink-soft" role="status">
          {saving ? m.saving : save === "saved" ? `✓ ${m.savedJournal}` : save === "failed" ? m.saveFailed : ""}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {save === "failed" && (
            <button type="button" onClick={seal} disabled={saving} className={buttonStyles.primary}>
              {m.retry}
            </button>
          )}
          <StartForm prompt={m.prompt(text)} className={buttonStyles.soft}>
            {gamesMessages[locale].result.discuss}
          </StartForm>
        </div>
        {save !== "saved" && (
          <button onClick={() => setSealed(false)} className="mt-6 text-sm text-ink-faint hover:text-ink">
            {m.back}
          </button>
        )}
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative rounded-[28px] bg-paper shadow-soft px-6 py-7 shadow-soft sm:px-9 sm:py-9">
        <p className="font-serif text-[20px] text-ink">{m.greeting}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={m.placeholder}
          className="mt-3 w-full resize-none bg-[repeating-linear-gradient(transparent,transparent_31px,#e6e8f0_32px)] bg-local text-[17px] leading-[32px] text-ink outline-none placeholder:text-ink-faint"
          aria-label={m.aria}
        />
      </div>
      <button
        onClick={() => setHint((hint + 1) % PROMPTS.length)}
        className="mt-4 block w-full animate-fade rounded-[20px] bg-lilac-soft/70 px-5 py-3 text-left text-[14.5px] text-ink-soft transition hover:text-ink"
        key={hint}
      >
        {m.hint} {PROMPTS[hint]} <span className="text-ink-faint">· {m.another}</span>
      </button>
      <button
        disabled={text.trim().length < 10}
        onClick={() => {
          chime(72, 0.05);
          setTimeout(() => chime(79, 0.05), 180);
          setSealed(true);
          seal();
        }}
        className={`${buttonStyles.primary} mt-6`}
      >
        {m.seal}
      </button>
    </div>
  );
}
