"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { compassMessages } from "@/i18n/game-compass";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { chime, PENTATONIC } from "@/lib/chime";
import { bowlStrike, drop } from "@/lib/sounds";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { Night, nightGhost, nightPrimary } from "./Night";

type Step = "ten" | "five" | "one" | "fit" | "result";
const HUES = ["#ffd59c", "#aaa4ff", "#9fe6c8", "#f2a7cb", "#8fd3f4"];
// Звёзды стоят по кругу вокруг компаса; угол в градусах от «севера» по часовой.
const angle = (i: number) => i * 18;
const pos = (i: number, r = i % 2 ? 116 : 134) => {
  const a = ((angle(i) - 90) * Math.PI) / 180;
  return [150 + Math.cos(a) * r, 150 + Math.sin(a) * r];
};

export function Compass() {
  const locale = useLocale();
  const m = compassMessages[locale];
  const { report } = usePractice();
  const [step, setStep] = useState<Step>("ten");
  const [ten, setTen] = useState<number[]>([]);
  const [five, setFive] = useState<number[]>([]);
  const [one, setOne] = useState<number | null>(null);
  const [fit, setFit] = useState(5);
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [loading, start] = useTransition();

  const toggle = (list: number[], set: (v: number[]) => void, max: number, i: number) => {
    if (list.includes(i)) return set(list.filter((x) => x !== i));
    if (list.length >= max) return;
    set([...list, i]);
    chime(PENTATONIC[list.length % PENTATONIC.length] + 12, 0.035);
  };
  const afterTen = () => {
    if (ten.length <= 5) {
      setFive(ten);
      setStep("one");
    } else setStep("five");
    drop(0.04, 700);
  };
  const pickOne = (i: number) => {
    setOne(i);
    setStep("fit");
    bowlStrike(0.07, 247);
  };
  const names = (list: number[]) => list.filter((i) => i !== one).map((i) => m.values[i]).join(", ");
  const see = () => {
    if (one === null) return;
    setStep("result");
    chime(79, 0.05);
    const text = m.journal(m.values[one], names(five), fit);
    report(text);
    start(async () => {
      const r = await askPractice("compass", `Важные ценности: ${ten.map((i) => m.values[i]).join(", ")}\nПять главных: ${five.map((i) => m.values[i]).join(", ")}\nСамая важная: ${m.values[one]}\nСоответствие жизни сейчас: ${fit}/10`);
      if ("ok" in r) setAi(r.data);
    });
  };
  const restart = () => {
    setStep("ten");
    setTen([]);
    setFive([]);
    setOne(null);
    setFit(5);
    setAi(null);
  };

  const pool = step === "ten" ? m.values.map((_, i) => i) : step === "five" ? ten : five;
  const picked = step === "ten" ? ten : five;
  const max = step === "ten" ? 10 : 5;
  const level = (i: number) => (one === i ? 3 : step !== "ten" && five.includes(i) ? 2 : ten.includes(i) && (step === "ten" || step === "five") ? 1 : 0);
  const showLife = step === "fit" || step === "result";

  return (
    <Night glow="#4f5aa6" className="p-5 sm:p-8">
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-start">
        <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[340px] md:sticky md:top-6" role="img" aria-label={m.aria}>
          <defs>
            <radialGradient id="cp-face" cx="50%" cy="40%">
              <stop offset="0" stopColor="#3a3780" />
              <stop offset="1" stopColor="#17183f" />
            </radialGradient>
          </defs>
          {m.values.map((v, i) => {
            const [x, y] = pos(i);
            const l = level(i);
            const c = HUES[i % HUES.length];
            return (
              <g key={v} style={{ opacity: l ? 1 : 0.28, transition: "opacity 0.8s" }}>
                {l > 0 && <circle cx={x} cy={y} r={[0, 7, 10, 16][l]} fill={c} opacity="0.35" style={{ filter: "blur(4px)" }} />}
                <circle cx={x} cy={y} r={[1.6, 3, 4.2, 6][l]} fill="#fff" style={{ transition: "r 0.6s" }} />
              </g>
            );
          })}
          <circle cx="150" cy="150" r="78" fill="url(#cp-face)" stroke="#cfc9ff" strokeOpacity="0.5" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="66" fill="none" stroke="#cfc9ff" strokeOpacity="0.2" />
          {Array.from({ length: 24 }, (_, i) => (
            <line key={i} x1="150" y1={i % 6 ? 80 : 76} x2="150" y2="86" stroke="#fff" strokeOpacity={i % 6 ? 0.25 : 0.7} strokeWidth={i % 6 ? 1 : 1.6} transform={`rotate(${i * 15} 150 150)`} />
          ))}
          {showLife && one !== null && (
            <g style={{ transform: `rotate(${angle(one) + (10 - fit) * 16}deg)`, transformOrigin: "150px 150px", transition: "transform 0.7s cubic-bezier(0.2,0.7,0.2,1)" }}>
              <path d="M150 96 L154 150 L146 150 Z" fill="#ffb79c" opacity="0.75" />
              <circle cx="150" cy="92" r="3" fill="#ffb79c" />
            </g>
          )}
          <g className={one === null ? "compass-seek" : ""}>
            <g style={{ transform: `rotate(${one === null ? 0 : angle(one)}deg)`, transformOrigin: "150px 150px", transition: "transform 1.6s cubic-bezier(0.3,1.4,0.4,1)" }}>
              <path d="M150 88 L158 150 L142 150 Z" fill="#fff" />
              <path d="M150 212 L158 150 L142 150 Z" fill="#8f8ad6" />
            </g>
          </g>
          <circle cx="150" cy="150" r="6" fill="#fff" stroke="#17183f" strokeWidth="2" />
        </svg>

        <div className="min-w-0">
          {(step === "ten" || step === "five" || step === "one") && (
            <div key={step} className="animate-rise">
              <h2 className="font-serif text-[22px] sm:text-[24px]">{step === "ten" ? m.tenTitle : step === "five" ? m.fiveTitle : m.oneTitle}</h2>
              <p className="mt-1 text-[14px] leading-snug text-paper/65">{step === "ten" ? m.tenHint : step === "five" ? m.fiveHint : m.oneHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pool.map((i) => {
                  const on = step !== "one" && picked.includes(i);
                  const c = HUES[i % HUES.length];
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={on}
                      onClick={() => (step === "one" ? pickOne(i) : step === "ten" ? toggle(ten, setTen, 10, i) : toggle(five, setFive, 5, i))}
                      className={`rounded-full border px-3.5 py-2 text-[14px] transition ${on ? "border-transparent bg-paper text-ink" : "border-paper/20 bg-paper/10 text-paper/85 hover:bg-paper/20"} ${step === "one" ? "px-5 py-3 font-serif text-[17px]" : ""}`}
                      style={on ? { boxShadow: `0 0 16px 2px ${c}` } : undefined}
                    >
                      {m.values[i]}
                    </button>
                  );
                })}
              </div>
              {step !== "one" && (
                <div className="mt-5 flex items-center gap-4">
                  <button type="button" disabled={picked.length < (step === "ten" ? 3 : 1)} onClick={step === "ten" ? afterTen : () => (five.length === 1 ? pickOne(five[0]) : setStep("one"))} className={nightPrimary}>
                    {m.next}
                  </button>
                  <span className="text-[13px] text-paper/55">{m.chosen(picked.length, max)}</span>
                </div>
              )}
            </div>
          )}

          {step === "fit" && one !== null && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#ffd59c]">{m.north}</p>
              <h2 className="mt-1 font-serif text-[22px] leading-snug sm:text-[24px]">{m.fitTitle(m.values[one])}</h2>
              <p className="mt-2 text-[13.5px] leading-snug text-paper/60">{m.fitHint}</p>
              <div className="mt-5 flex items-center gap-4">
                <input type="range" min={1} max={10} value={fit} onChange={(e) => setFit(Number(e.target.value))} className="w-full" style={{ accentColor: "#ffb79c" }} aria-label={m.fitTitle(m.values[one])} />
                <span className="w-8 shrink-0 text-center font-serif text-[28px]">{fit}</span>
              </div>
              <p className="mt-2 text-[14px] text-paper/80">{m.fitLevels[Math.min(3, Math.floor((fit - 1) / 2.5))]}</p>
              <p className="mt-3 flex gap-4 text-[12px] text-paper/55">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-paper" />{m.important}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ffb79c]" />{m.life}</span>
              </p>
              <button type="button" onClick={see} className={`${nightPrimary} mt-5`}>
                {m.see}
              </button>
            </div>
          )}

          {step === "result" && one !== null && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#ffd59c]">{m.north}</p>
              <p className="mt-1 font-serif text-[32px] leading-tight sm:text-[38px]">{m.values[one]}</p>
              {names(five) && (
                <p className="mt-1 text-[13.5px] text-paper/60">
                  {m.kept}: {names(five)}
                </p>
              )}
              {loading ? (
                <p className="mt-5 animate-pulse text-[14px] text-paper/70">{m.thinking}</p>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-paper/85">{ai?.reflection ?? m.fallback(m.values[one])}</p>
              )}
              {ai?.questions?.length ? (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.questions}</p>
                  <ul className="mt-2 space-y-1.5 text-[14.5px] text-paper/85">
                    {ai.questions.map((q) => (
                      <li key={q}>— {q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ai?.steps?.length ? (
                <div className="mt-4 rounded-[20px] bg-paper/10 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.steps}</p>
                  <ul className="mt-2 space-y-1.5 text-[14.5px]">
                    {ai.steps.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="text-[#ffd59c]">✦</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link href="/play/one-step" className={`${nightGhost} mt-4 inline-block`}>
                {m.toStep}
              </Link>
            </div>
          )}
        </div>
      </div>

      {step === "result" && one !== null && (
        <div className="relative mt-6 animate-rise rounded-[26px] bg-paper p-4 sm:p-5">
          <ResultActions kind="goal" prompt={m.prompt(m.values[one], names(five), fit)} journal={m.journal(m.values[one], names(five), fit)} />
        </div>
      )}
      {step !== "ten" && (
        <button type="button" onClick={restart} className={`${nightGhost} relative mt-5 block`}>
          {m.restart}
        </button>
      )}
    </Night>
  );
}
