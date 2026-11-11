"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { chime } from "@/lib/chime";
import { usePractice } from "./PracticeFlow";
import { ResultActions } from "./ResultActions";
import { useMsg } from "@/i18n/client";
import { wheelMessages } from "@/i18n/game-wheel";

// Цвета сфер; названия — в src/i18n/game-wheel.ts в том же порядке.
const AREAS = ["#7ccfaa", "#aaa4ff", "#d8b98f", "#8db4ea", "#a9c7c0", "#c6b0d8", "#c9bfa3", "#9fb4cf"].map((color) => ({ color }));

const C = 160;
const R = 140;

function wedge(i: number, value: number) {
  const n = AREAS.length;
  const r = (R * value) / 10;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.02;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.02;
  const p = (a: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  return `M ${C} ${C} L ${p(a0)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${p(a1)} Z`;
}

export function Wheel() {
  const m = useMsg(wheelMessages);
  const [values, setValues] = useState(() => AREAS.map(() => 5));
  const [done, setDone] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [loading, start] = useTransition();
  const { report } = usePractice();

  const sorted = AREAS.map((a, i) => ({ ...a, name: m.areas[i], v: values[i] })).sort((a, b) => a.v - b.v);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const summary = AREAS.map((_, i) => `${m.areas[i]}: ${values[i]}`).join(", ");

  const pickFocus = (i: number) => {
    setFocus(i);
    setAi(null);
    report(`${m.journal(summary)} ${m.choose} ${m.areas[i]}.`);
    chime(74 + (i % 5), 0.04);
    start(async () => {
      const r = await askPractice("wheel", `Оценки: ${summary}. Хочу улучшить: ${m.areas[i]}.`);
      if ("ok" in r) setAi(r.data);
    });
  };

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[340px]">
        <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={m.aria}>
          {[2, 4, 6, 8, 10].map((r) => (
            <circle key={r} cx={C} cy={C} r={(R * r) / 10} fill="none" stroke="#e6e8f0" strokeWidth={1} />
          ))}
          {AREAS.map((a, i) => (
            <path
              key={i}
              d={wedge(i, values[i])}
              fill={a.color}
              fillOpacity={focus === null ? 0.75 : focus === i ? 0.95 : 0.35}
              onClick={done ? () => pickFocus(i) : undefined}
              className={done ? "cursor-pointer" : ""}
              style={{ transition: "d 0.5s cubic-bezier(0.2,0.7,0.2,1), fill-opacity 0.4s" }}
            />
          ))}
          <circle cx={C} cy={C} r={4} fill="#ffffff" />
        </svg>
      </div>

      <div>
        {!done ? (
          <>
            <div className="space-y-4">
              {AREAS.map((a, i) => (
                <label key={i} className="block">
                  <span className="mb-1.5 flex items-center justify-between text-[15px] text-ink">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                      {m.areas[i]}
                    </span>
                    <span className="font-serif text-ink-soft">{values[i]}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={values[i]}
                    onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                    className="w-full"
                    style={{ accentColor: a.color }}
                  />
                </label>
              ))}
            </div>
            <button onClick={() => {
              setDone(true);
              report(m.journal(summary));
            }} className="mt-6 h-12 rounded-full bg-ink px-7 text-[15px] text-paper shadow-soft transition hover:bg-ink/90">
              {m.see}
            </button>
          </>
        ) : (
          <div className="animate-rise">
            <p className="font-serif text-[22px] leading-snug text-ink">
              {m.high(high.name)}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              {m.low(low.name)}
            </p>
            <h3 className="mt-6 text-[16px] font-medium text-ink">{m.choose}</h3>
            <p className="mt-1 text-[13.5px] text-ink-soft">{m.chooseHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {AREAS.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickFocus(i)}
                  aria-pressed={focus === i}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] transition ${focus === i ? "bg-ink text-paper" : "bg-paper text-ink shadow-soft hover:-translate-y-0.5"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                  {m.areas[i]} · {values[i]}
                </button>
              ))}
            </div>
            {focus !== null && (
              <div className="mt-5 animate-rise rounded-[22px] bg-paper/80 p-4 shadow-soft">
                {loading || !ai ? (
                  <p className={`text-[14px] text-sage-deep ${loading ? "animate-pulse" : ""}`}>{loading ? m.thinking : m.low(m.areas[focus])}</p>
                ) : (
                  <>
                    <p className="text-[15px] leading-relaxed text-ink">{ai.reflection}</p>
                    {ai.questions?.length ? (
                      <>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-ink-faint">{m.questionsTitle}</p>
                        <ul className="mt-1.5 space-y-1 text-[14.5px] text-ink">
                          {ai.questions.map((q) => (
                            <li key={q}>— {q}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {ai.steps?.length ? (
                      <>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-ink-faint">{m.stepsTitle}</p>
                        <ul className="mt-1.5 space-y-1 text-[14.5px] text-ink">
                          {ai.steps.map((q) => (
                            <li key={q} className="flex gap-2">
                              <span style={{ color: AREAS[focus].color }}>●</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </>
                )}
                <Link href="/play/one-step" className="mt-4 inline-block text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                  {m.toOneStep}
                </Link>
              </div>
            )}
            <div className="mt-6">
              <ResultActions
                prompt={m.prompt(summary, focus !== null ? m.areas[focus] : low.name)}
                journal={m.journal(summary)}
                kind="goal"
              />
            </div>
            <button onClick={() => setDone(false)} className="mt-6 text-sm text-ink-faint hover:text-ink">
              {m.edit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
