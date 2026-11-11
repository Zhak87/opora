"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { emotionMessages } from "@/i18n/game-emotion";
import { gamesMessages, type GameSlug } from "@/i18n/games";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { drop } from "@/lib/sounds";
import { CrisisHelp } from "../course/CrisisHelp";
import { ArrowIcon } from "../icons";
import { buttonStyles } from "../ui";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";

// Цвета семей чувств — в том же порядке, что и families в src/i18n/game-emotion.ts.
const HUES = [
  ["#8db4ea", "#dcebfb"],
  ["#aaa4ff", "#e6e4ff"],
  ["#ff9f80", "#ffe4d8"],
  ["#b9ad92", "#efeadf"],
  ["#f2a7cb", "#fbe4f0"],
  ["#7ccfaa", "#d6f2e6"],
];
// Чего не хватает → какая практика может помочь (порядок как в needs).
const NEED_GAME: GameSlug[] = ["breath", "talk-out", "talk-out", "thought-jar", "grounding", "garden", "empty-bowl"];

type Step = 1 | 2 | 3 | 4 | 5;

export function EmotionName() {
  const locale = useLocale();
  const m = emotionMessages[locale];
  const catalog = gamesMessages[locale].catalog;
  const [step, setStep] = useState<Step>(1);
  const [family, setFamily] = useState<number | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [level, setLevel] = useState(5);
  const [before, setBefore] = useState("");
  const [needs, setNeeds] = useState<number[]>([]);
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [loading, start] = useTransition();
  const { report } = usePractice();

  const hue = family !== null ? HUES[family] : HUES[1];
  const needList = needs.map((i) => m.needs[i]).join(", ");
  const levelText = m.levels[Math.min(3, Math.floor((level - 1) / 2.5))];

  const pickWord = (w: string) => {
    setWord(w);
    setStep(2);
    chime(76, 0.04);
  };

  const see = () => {
    setStep(5);
    chime(79, 0.05);
    if (word) report(m.journal(word, level, before.trim(), needList));
    if (looksLikeCrisis(before)) {
      setCrisis(true);
      return;
    }
    start(async () => {
      const r = await askPractice("emotion", `Чувство: ${word}. Сила: ${level}/10. Перед этим: ${before || "—"}. Не хватает: ${needList || "—"}.`);
      if ("crisis" in r) setCrisis(true);
      else if ("ok" in r) setAi(r.data);
    });
  };

  const restart = () => {
    setStep(1);
    setFamily(null);
    setWord(null);
    setLevel(5);
    setBefore("");
    setNeeds([]);
    setAi(null);
    setCrisis(false);
  };

  const suggested = [...new Set(needs.map((i) => NEED_GAME[i]))].slice(0, 2);

  return (
    <div
      className="relative overflow-hidden rounded-[36px] p-5 shadow-soft transition-colors duration-700 sm:p-8"
      style={{ background: `radial-gradient(120% 80% at 80% 0%, ${hue[1]} 0%, #ffffff 60%)` }}
    >
      {step === 1 && (
        <div className="animate-rise">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.step1}</h2>
          <p className="mt-1 text-[14px] text-ink-soft">{m.step1Hint}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
            {m.families.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => {
                  setFamily(i);
                  drop(0.04, 600 + i * 70);
                }}
                aria-pressed={family === i}
                className={`group flex flex-col items-center gap-2 rounded-[24px] p-2 transition ${family === i ? "scale-105" : family !== null ? "opacity-55 hover:opacity-90" : ""}`}
              >
                <span
                  className="block aspect-square w-full max-w-[110px] animate-morph shadow-soft transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${HUES[i][1]} 35%, ${HUES[i][0]} 100%)`,
                    animationDelay: `${-i * 2.3}s`,
                    boxShadow: family === i ? `0 18px 40px -16px ${HUES[i][0]}` : undefined,
                  }}
                />
                <span className="text-center text-[13.5px] font-medium leading-tight text-ink">{f.name}</span>
              </button>
            ))}
          </div>
          {family !== null && (
            <div className="mt-6 flex animate-rise flex-wrap gap-2">
              {m.families[family].words.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => pickWord(w)}
                  className="rounded-full bg-paper px-4 py-2.5 text-[14.5px] text-ink shadow-soft transition hover:-translate-y-0.5"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${hue[0]}55` }}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && word && (
        <div className="animate-rise text-center">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.step2(word)}</h2>
          <div className="relative mx-auto my-8 flex h-[200px] items-center justify-center">
            <span
              className="block animate-morph transition-all duration-500"
              style={{
                width: 70 + level * 12,
                height: 70 + level * 12,
                background: `radial-gradient(circle at 35% 30%, #fff 0%, ${hue[1]} 30%, ${hue[0]} 100%)`,
                opacity: 0.45 + level * 0.055,
                boxShadow: `0 0 ${level * 6}px ${level * 1.5}px ${hue[0]}66`,
                animationDuration: `${16 - level}s`,
              }}
            />
            <span className="absolute font-serif text-[40px] text-ink/80">{level}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full max-w-sm"
            style={{ accentColor: hue[0] }}
            aria-label={m.step2(word)}
          />
          <p className="mt-2 text-[14px] text-ink-soft">{levelText}</p>
          <button type="button" onClick={() => setStep(3)} className={`${buttonStyles.primary} mt-6`}>
            {m.next}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="animate-rise">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.step3}</h2>
          <textarea
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            rows={3}
            maxLength={600}
            autoFocus
            placeholder={m.step3Placeholder}
            className="mt-4 w-full resize-none rounded-[20px] border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-lilac"
          />
          {looksLikeCrisis(before) && (
            <div className="mt-3">
              <CrisisHelp />
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStep(4)} className={buttonStyles.primary}>
              {before.trim() ? m.next : m.skip}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-rise">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.step4}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {m.needs.map((n, i) => {
              const on = needs.includes(i);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setNeeds((list) => (on ? list.filter((x) => x !== i) : [...list, i].slice(-2)));
                    if (!on) chime(72 + i, 0.03);
                  }}
                  className={`rounded-full px-4 py-2.5 text-[14.5px] transition ${on ? "bg-ink text-paper shadow-soft" : "bg-paper text-ink shadow-soft hover:-translate-y-0.5"}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={see} className={`${buttonStyles.primary} mt-6`}>
            {m.see}
          </button>
        </div>
      )}

      {step === 5 && word && (
        <div className="animate-rise">
          <div className="flex items-center gap-4">
            <span
              className="h-16 w-16 shrink-0 animate-morph"
              style={{ background: `radial-gradient(circle at 35% 30%, #fff 0%, ${hue[1]} 30%, ${hue[0]} 100%)`, boxShadow: `0 0 30px 6px ${hue[0]}55` }}
            />
            <div>
              <p className="font-serif text-[24px] leading-tight text-ink">{m.result(word, level)}</p>
              {needList && <p className="mt-1 text-[14px] text-ink-soft">{m.lacking(needList)}</p>}
            </div>
          </div>
          {crisis ? (
            <div className="mt-5">
              <CrisisHelp />
            </div>
          ) : (
            <>
              {loading ? (
                <p className="mt-5 animate-pulse text-[14px] text-lilac-deep">{m.thinking}</p>
              ) : (
                <p className="mt-5 text-[15.5px] leading-relaxed text-ink">{ai?.reflection ?? m.fallback}</p>
              )}
              {ai?.steps?.length ? (
                <div className="mt-5 rounded-[22px] bg-paper/80 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.stepsTitle}</p>
                  <ul className="mt-2 space-y-1.5 text-[14.5px] text-ink">
                    {ai.steps.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span style={{ color: hue[0] }}>●</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ai?.questions?.[0] && (
                <p className="mt-4 text-[14.5px] italic text-ink-soft">
                  {m.questionTitle}: {ai.questions[0]}
                </p>
              )}
            </>
          )}
          {suggested.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.try}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggested.map((s) => (
                  <Link key={s} href={`/play/${s}`} className="group inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2.5 text-[14px] text-ink shadow-soft transition hover:-translate-y-0.5">
                    {catalog[s].title}
                    <ArrowIcon className="h-3.5 w-3.5 text-ink-faint" />
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">
            <ResultActions prompt={m.prompt(word, level, before.trim(), needList)} journal={m.journal(word, level, before.trim(), needList)} kind="feeling" />
          </div>
          <button type="button" onClick={restart} className="mt-5 text-sm text-ink-faint hover:text-ink">
            {m.restart}
          </button>
        </div>
      )}
    </div>
  );
}
