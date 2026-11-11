"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { talkOutMessages } from "@/i18n/game-talk-out";
import { chime } from "@/lib/chime";
import { Orb } from "../Orb";
import { StartForm } from "../StartForm";
import { buttonStyles } from "../ui";

const MODES = ["heard", "sort", "step"] as const;
const EMOTION = { heard: "care", sort: "calm", step: "joy" } as const;

// «Мне нужно выговориться»: выбрать, чего хочется, и начать разговор с бережного вопроса Опи.
export function TalkOut() {
  const locale = useLocale();
  const m = talkOutMessages[locale];
  const [mode, setMode] = useState<(typeof MODES)[number]>("heard");
  return (
    <div className="rounded-[36px] bg-gradient-to-br from-lilac-soft via-paper to-peach-soft/60 p-5 shadow-soft sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Orb size={120} face emotion={EMOTION[mode]} />
        <p key={mode} className="mt-5 max-w-md animate-rise rounded-[24px] rounded-tl-[6px] bg-paper px-5 py-4 text-left text-[15.5px] leading-relaxed text-ink shadow-soft">
          {m.openers[mode]}
        </p>
      </div>
      <h2 className="mt-8 font-serif text-[22px] text-ink">{m.title}</h2>
      <p className="mt-1 text-[14px] text-ink-soft">{m.hint}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {MODES.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => {
              setMode(k);
              chime(k === "heard" ? 72 : k === "sort" ? 76 : 79, 0.035);
            }}
            className={`rounded-[22px] p-4 text-left transition ${mode === k ? "bg-ink text-paper shadow-lift" : "bg-paper/80 text-ink hover:-translate-y-0.5 hover:shadow-soft"}`}
          >
            <span className="block text-[15px] font-medium">{m.modes[k].label}</span>
            <span className={`mt-1 block text-[13px] leading-snug ${mode === k ? "text-paper/75" : "text-ink-soft"}`}>{m.modes[k].text}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col items-start gap-2">
        <StartForm opener={mode} className={buttonStyles.primary}>
          {m.begin}
        </StartForm>
        <p className="text-[13px] text-ink-faint">{m.voiceTip}</p>
      </div>
    </div>
  );
}
