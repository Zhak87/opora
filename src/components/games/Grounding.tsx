"use client";

import { useState } from "react";
import { chime, PENTATONIC } from "@/lib/chime";
import { buttonStyles } from "../ui";
import { useMsg } from "@/i18n/client";
import { groundingMessages } from "@/i18n/game-grounding";

const SENSES = [
  { n: 5, color: "bg-mist", dot: "bg-sky" },
  { n: 4, color: "bg-sage-soft", dot: "bg-sage" },
  { n: 3, color: "bg-lilac-soft", dot: "bg-lilac" },
  { n: 2, color: "bg-sand", dot: "bg-sand-deep" },
  { n: 1, color: "bg-mist", dot: "bg-sky-deep" },
];

// Заземление «5-4-3-2-1»: возвращает внимание в «здесь и сейчас» через пять чувств.
export function Grounding() {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const m = useMsg(groundingMessages);
  const done = step >= SENSES.length;

  if (done)
    return (
      <div className="animate-rise rounded-[32px] bg-gradient-to-br from-sage-soft via-paper to-mist px-7 py-12 text-center shadow-soft">
        <span className="mx-auto block h-16 w-16 animate-breathe rounded-full bg-sage/50" aria-hidden />
        <p className="mt-6 font-serif text-[26px] text-ink">{m.doneTitle}</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          {m.doneBody}
        </p>
        <button
          onClick={() => {
            setStep(0);
            setCount(0);
          }}
          className={`${buttonStyles.soft} mt-8`}
        >
          {m.again}
        </button>
      </div>
    );

  const s = SENSES[step];
  const text = m.senses[step];
  const tap = () => {
    chime(PENTATONIC[(count + step) % PENTATONIC.length], 0.05);
    if (count + 1 >= s.n) {
      setTimeout(() => {
        setStep(step + 1);
        setCount(0);
      }, 600);
    }
    setCount(count + 1);
  };

  return (
    <div key={step} className={`animate-rise rounded-[32px] ${s.color} px-6 py-10 text-center shadow-soft transition-colors duration-700`}>
      <p className="font-serif text-[64px] leading-none text-ink">{s.n}</p>
      <p className="mt-3 font-serif text-[22px] text-ink">{text.what}</p>
      <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-ink-soft">{text.hint}</p>
      <div className="mt-8 flex justify-center gap-3">
        {Array.from({ length: s.n }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition-all duration-500 ${i < count ? `${s.dot} scale-125 shadow-soft` : "bg-paper"}`}
          />
        ))}
      </div>
      <button
        onClick={tap}
        disabled={count >= s.n}
        className="mx-auto mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-paper text-[15px] text-ink shadow-lift transition active:scale-95 disabled:opacity-60"
      >
        {m.noticed}
      </button>
      <p className="mt-5 text-sm text-ink-faint">{m.tip}</p>
    </div>
  );
}
