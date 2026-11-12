"use client";

import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { mirrorMessages } from "@/i18n/game-mirror";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime, PENTATONIC } from "@/lib/chime";
import { bowlStrike, whoosh } from "@/lib/sounds";
import { CrisisHelp } from "../course/CrisisHelp";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { Night, nightGhost, nightInput, nightPrimary } from "./Night";

const TOTAL = 10;
const SHARD = ["#aaa4ff", "#f2a7cb", "#8fd3f4", "#ffd59c", "#9fe6c8"];

export function Mirror() {
  const locale = useLocale();
  const m = mirrorMessages[locale];
  const { report } = usePractice();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  // Последние два вопроса ИИ подбирает лично; пока их нет, остаются обычные.
  const [personal, setPersonal] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [loading, start] = useTransition();

  const isPersonal = index >= TOTAL - 2 && !!personal[index - (TOTAL - 2)];
  const question = isPersonal ? personal[index - (TOTAL - 2)] : m.questions[index];
  const pairs = (list = answers) => list.map((x) => `— ${x.q}\n${x.a}`).join("\n");

  const look = (list = answers) => {
    setDone(true);
    bowlStrike(0.07, 220);
    report(m.summary("", list.length));
    start(async () => {
      const r = await askPractice("mirror", pairs(list));
      if ("crisis" in r) setCrisis(true);
      else if ("ok" in r) {
        setAi(r.data);
        report(m.summary((r.data.themes ?? []).join(", "), list.length));
      }
    });
  };

  const go = (skip: boolean) => {
    const a = text.trim();
    let list = answers;
    if (!skip && a) {
      if (looksLikeCrisis(a)) setCrisis(true);
      list = [...answers, { q: question, a: a.slice(0, 500) }];
      setAnswers(list);
      chime(PENTATONIC[list.length % PENTATONIC.length] + 12, 0.04);
      // После шестого ответа просим у ИИ два личных вопроса; если не успеет, останутся обычные.
      if (list.length === 6 && personal.length === 0)
        askPractice("mirror-ask", pairs(list)).then((r) => {
          if ("ok" in r && r.data.questions?.length) setPersonal(r.data.questions.slice(0, 2));
        });
    } else whoosh(0.025, 0.8);
    setText("");
    if (index + 1 >= TOTAL) {
      if (list.length > 0) look(list);
      else setIndex(0);
    } else setIndex(index + 1);
  };

  const restart = () => {
    setIndex(0);
    setText("");
    setAnswers([]);
    setPersonal([]);
    setDone(false);
    setAi(null);
    setCrisis(false);
  };

  return (
    <Night glow="#56508f" className="p-5 sm:p-8">
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,300px)_1fr] md:items-start">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] md:sticky md:top-6" role="img" aria-label={m.aria}>
          <div className="absolute inset-0 rounded-[50%] p-[7px]" style={{ background: "linear-gradient(150deg,#f4e7c8,#b79a6a 40%,#f1dfb6 60%,#8f764c)", boxShadow: "0 0 50px 6px rgba(190,180,255,0.28)" }}>
            <div className="relative h-full w-full overflow-hidden rounded-[50%]" style={{ background: "radial-gradient(120% 90% at 40% 20%, #6f6bb8 0%, #2c2a66 55%, #15163c 100%)" }}>
              <span className="mirror-sheen absolute -top-1/4 left-0 h-[150%] w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center px-7 text-center">
                {!done ? (
                  <p key={question} className="mirror-say font-serif text-[21px] leading-snug sm:text-[23px]">{question}</p>
                ) : ai?.themes?.length ? (
                  <ul className="space-y-2">
                    {ai.themes.map((t, i) => (
                      <li key={t} className="mirror-say font-serif text-[22px] leading-tight" style={{ animationDelay: `${i * 0.35}s`, textShadow: `0 0 18px ${SHARD[i % SHARD.length]}`, color: "#fff" }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="h-16 w-16 animate-breathe rounded-full bg-paper/30 blur-md" aria-hidden />
                )}
              </div>
            </div>
          </div>
          {answers.map((_, i) => {
            const a = ((i * 36 - 90) * Math.PI) / 180;
            return (
              <span
                key={i}
                aria-hidden
                className="star-born absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-paper"
                style={{ left: `${50 + Math.cos(a) * 53}%`, top: `${50 + Math.sin(a) * 52}%`, boxShadow: `0 0 12px 4px ${SHARD[i % SHARD.length]}` }}
              />
            );
          })}
        </div>

        <div className="min-w-0">
          {crisis && (
            <div className="mb-5 rounded-[24px] bg-paper">
              <CrisisHelp onClose={() => setCrisis(false)} />
            </div>
          )}
          {!done ? (
            <form
              className="animate-rise"
              onSubmit={(e) => {
                e.preventDefault();
                go(false);
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">
                {m.progress(index + 1, TOTAL)}
                {isPersonal && <span className="ml-2 text-[#ffd59c]">· {m.personal}</span>}
              </p>
              <div className="mt-2 flex gap-1.5" aria-hidden>
                {Array.from({ length: TOTAL }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i < index ? "bg-paper/70" : i === index ? "bg-paper" : "bg-paper/20"}`} />
                ))}
              </div>
              <textarea key={index} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} autoFocus placeholder={m.placeholder} className={`${nightInput} mt-4 resize-none`} />
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={!text.trim()} className={nightPrimary}>
                  {m.next}
                </button>
                <button type="button" onClick={() => go(true)} className={nightGhost}>
                  {m.skip}
                </button>
              </div>
              {answers.length >= 3 && (
                <div className="mt-6 border-t border-paper/15 pt-4">
                  <button type="button" onClick={() => look()} className="rounded-full border border-paper/30 px-5 py-2.5 text-[14px] transition hover:bg-paper/10">
                    {m.look}
                  </button>
                  <p className="mt-2 text-[12.5px] text-paper/50">{m.lookHint}</p>
                </div>
              )}
            </form>
          ) : (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#cfc9ff]">{m.reflectTitle}</p>
              {loading ? (
                <p className="mt-3 animate-pulse text-[14px] text-paper/70">{m.thinking}</p>
              ) : (
                <p className="mt-2 text-[15.5px] leading-relaxed text-paper/90">{ai?.reflection ?? m.fallback}</p>
              )}
              {ai?.questions?.length ? (
                <div className="mt-5 rounded-[20px] bg-paper/10 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.more}</p>
                  <ul className="mt-2 space-y-1.5 text-[14.5px]">
                    {ai.questions.map((q) => (
                      <li key={q}>— {q}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <details className="mt-4 text-[14px] text-paper/75">
                <summary className="cursor-pointer text-paper/60 hover:text-paper">{m.answers}</summary>
                <dl className="mt-3 space-y-3">
                  {answers.map((x, i) => (
                    <div key={i}>
                      <dt className="text-[12.5px] text-paper/50">{x.q}</dt>
                      <dd className="mt-0.5">{x.a}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          )}
        </div>
      </div>

      {done && !loading && (
        <div className="relative mt-6 animate-rise rounded-[26px] bg-paper p-4 sm:p-5">
          <ResultActions kind="thought" prompt={m.prompt(pairs())} journal={m.journal(pairs(), (ai?.themes ?? []).join(", "))} />
        </div>
      )}
      {(done || answers.length > 0) && (
        <button type="button" onClick={restart} className={`${nightGhost} relative mt-5 block`}>
          {m.restart}
        </button>
      )}
    </Night>
  );
}
