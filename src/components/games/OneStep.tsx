"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { oneStepMessages } from "@/i18n/game-one-step";
import { askPractice } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { bowlStrike } from "@/lib/sounds";
import { CrisisHelp } from "../course/CrisisHelp";
import { buttonStyles } from "../ui";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";

type Phase = "goal" | "why" | "steps" | "pick" | "chosen";

// Текущий шаг хранится в этом браузере: карточка «Ваш шаг» на странице практик спросит, получилось ли.
export const STEP_KEY = "opora-one-step";
export type SavedStep = { text: string; at: number };

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadReminder(title: string, when: Date) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Opora//Practices//RU",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@myopora.kz`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(when)}`,
    "DURATION:PT20M",
    `SUMMARY:${title.replace(/[\n,;]/g, " ")}`,
    "URL:https://myopora.kz/play",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title.replace(/[\n,;]/g, " ")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "opora-step.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function OneStep() {
  const locale = useLocale();
  const m = oneStepMessages[locale];
  const [phase, setPhase] = useState<Phase>("goal");
  const [goal, setGoal] = useState("");
  const [why, setWhy] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [own, setOwn] = useState("");
  const [reflection, setReflection] = useState("");
  const [aiFailed, setAiFailed] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const [loading, start] = useTransition();
  const { report } = usePractice();

  useEffect(() => {
    if (looksLikeCrisis(goal) || looksLikeCrisis(why)) setCrisis(true);
  }, [goal, why]);

  const breakDown = () => {
    setPhase("steps");
    setAiFailed(false);
    start(async () => {
      const r = await askPractice("one-step", `Хочу изменить: ${goal}\nПочему важно: ${why}`);
      if ("crisis" in r) setCrisis(true);
      else if ("ok" in r && r.data.steps?.length) {
        setSteps(r.data.steps);
        setReflection(r.data.reflection);
      } else setAiFailed(true);
    });
  };

  const addOwn = () => {
    const v = own.trim();
    if (!v) return;
    setSteps((s) => [...s, v.slice(0, 160)]);
    setOwn("");
    chime(74, 0.03);
  };

  const choose = (s: string) => {
    setChosen(s);
    setPhase("chosen");
    report(m.journal(goal, why, s));
    bowlStrike(0.07, 262);
    try {
      localStorage.setItem(STEP_KEY, JSON.stringify({ text: s, at: Date.now() } satisfies SavedStep));
    } catch {}
  };

  const remind = (kind: "evening" | "morning") => {
    const d = new Date();
    if (kind === "evening") {
      d.setHours(19, 0, 0, 0);
      if (d.getTime() < Date.now() + 30 * 60_000) d.setTime(Date.now() + 2 * 3600_000);
    } else {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    }
    downloadReminder(m.calendarTitle(chosen ?? ""), d);
    setReminded(true);
  };

  const input = "mt-4 w-full resize-none rounded-[20px] border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-lilac";

  return (
    <div className="rounded-[36px] bg-gradient-to-br from-mist via-paper to-sage-soft/60 p-5 shadow-soft sm:p-8">
      {crisis && (
        <div className="mb-5">
          <CrisisHelp onClose={() => setCrisis(false)} />
        </div>
      )}

      <Stairs filled={phase === "goal" ? 0 : phase === "why" ? 1 : phase === "steps" ? 2 : phase === "pick" ? 3 : 5} />

      {phase === "goal" && (
        <div className="animate-rise">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.q1}</h2>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={300} autoFocus placeholder={m.q1Placeholder} className={input} />
          <button type="button" disabled={!goal.trim()} onClick={() => setPhase("why")} className={`${buttonStyles.primary} mt-4 disabled:opacity-40`}>
            {m.next}
          </button>
        </div>
      )}

      {phase === "why" && (
        <div className="animate-rise">
          <p className="text-[14px] text-ink-soft">{goal}</p>
          <h2 className="mt-2 font-serif text-[22px] text-ink sm:text-[24px]">{m.q2}</h2>
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} maxLength={500} autoFocus placeholder={m.q2Placeholder} className={input} />
          <button type="button" disabled={!why.trim()} onClick={breakDown} className={`${buttonStyles.primary} mt-4 disabled:opacity-40`}>
            {m.next}
          </button>
        </div>
      )}

      {(phase === "steps" || phase === "pick") && (
        <div className="animate-rise">
          <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{phase === "pick" ? m.pickTitle : m.stepsTitle}</h2>
          {loading ? (
            <p className="mt-4 animate-pulse text-[14px] text-sky-deep">{m.breaking}</p>
          ) : (
            <>
              {reflection && phase === "steps" && <p className="mt-3 text-[15px] leading-relaxed text-ink">{reflection}</p>}
              <p className="mt-2 text-[14px] text-ink-soft">{aiFailed && steps.length === 0 ? m.noAi : phase === "steps" ? m.stepsHint : ""}</p>
              <ol className="mt-4 space-y-2">
                {steps.map((s, i) => (
                  <li key={`${i}-${s}`} className="flex animate-rise items-center gap-3 rounded-[20px] bg-paper px-4 py-3 shadow-soft" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-[13px] font-medium text-sky-deep">{i + 1}</span>
                    <span className="flex-1 text-[15px] text-ink">{s}</span>
                    {phase === "pick" ? (
                      <button type="button" onClick={() => choose(s)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] text-paper transition hover:bg-lilac-deep">
                        {m.pick}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setSteps((l) => l.filter((_, j) => j !== i))} aria-label={m.remove} className="shrink-0 px-2 text-lg text-ink-faint hover:text-ink">
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {phase === "steps" && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addOwn();
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder={m.ownPlaceholder} maxLength={160} className="h-12 min-w-0 flex-1 rounded-full border border-line bg-paper px-4 text-[15px] outline-none focus:border-lilac" />
                    <button type="submit" disabled={!own.trim()} className={`${buttonStyles.soft} h-12 shrink-0 disabled:opacity-40`}>
                      {m.addOwn}
                    </button>
                  </form>
                  <button type="button" disabled={steps.length === 0} onClick={() => setPhase("pick")} className={`${buttonStyles.primary} mt-5 disabled:opacity-40`}>
                    {m.next}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {phase === "chosen" && chosen && (
        <div className="animate-rise">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-deep">{m.chosenTitle}</p>
          <p className="mt-2 font-serif text-[26px] leading-snug text-ink sm:text-[30px]">{chosen}</p>
          <p className="mt-2 text-[14.5px] text-ink-soft">{m.because(why)}</p>
          <div className="mt-6 rounded-[22px] bg-paper/80 p-4">
            <p className="text-[14px] font-medium text-ink">{m.remindTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => remind("evening")} className="rounded-full bg-mist px-4 py-2 text-[14px] text-ink transition hover:bg-sky/40">
                {m.evening}
              </button>
              <button type="button" onClick={() => remind("morning")} className="rounded-full bg-mist px-4 py-2 text-[14px] text-ink transition hover:bg-sky/40">
                {m.morning}
              </button>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-faint">{reminded ? m.remindDone : m.tracked}</p>
          </div>
          <div className="mt-5">
            <ResultActions prompt={m.prompt(goal, why, chosen)} journal={m.journal(goal, why, chosen)} kind="goal" />
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase("goal");
              setSteps([]);
              setChosen(null);
              setReflection("");
            }}
            className="mt-5 text-sm text-ink-faint hover:text-ink"
          >
            {m.restart}
          </button>
        </div>
      )}
    </div>
  );
}

// Лесенка прогресса: ступени заполняются по мере прохождения.
function Stairs({ filled }: { filled: number }) {
  return (
    <div className="mb-6 flex h-12 items-end gap-1.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-8 rounded-t-[8px] transition-all duration-700 ${i < filled ? "bg-sky-deep/70" : "bg-paper/80"}`}
          style={{ height: 10 + i * 9 }}
        />
      ))}
    </div>
  );
}

// Карточка «Ваш шаг» на странице практик: спросить, получилось ли.
export function StepCard() {
  const locale = useLocale();
  const m = oneStepMessages[locale].card;
  const [step, setStep] = useState<SavedStep | null>(null);
  const [answer, setAnswer] = useState<"done" | "not" | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STEP_KEY);
      if (raw) setStep(JSON.parse(raw) as SavedStep);
    } catch {}
  }, []);

  if (!step) return null;
  const clear = () => {
    try {
      localStorage.removeItem(STEP_KEY);
    } catch {}
  };

  return (
    <section className="animate-rise rounded-[28px] bg-mist p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-sky-deep">{m.eyebrow}</p>
      <p className="mt-1.5 font-serif text-[20px] leading-snug text-ink">{step.text}</p>
      {answer === null ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAnswer("done");
              clear();
              bowlStrike(0.08, 294);
              chime(84, 0.04);
            }}
            className="rounded-full bg-ink px-5 py-2.5 text-[14px] text-paper transition hover:bg-lilac-deep"
          >
            {m.done}
          </button>
          <button type="button" onClick={() => setAnswer("not")} className="rounded-full bg-paper px-5 py-2.5 text-[14px] text-ink shadow-soft">
            {m.notYet}
          </button>
        </div>
      ) : answer === "done" ? (
        <p className="mt-3 animate-rise text-[15px] text-ink">{m.doneText}</p>
      ) : (
        <div className="mt-3 animate-rise">
          <p className="text-[15px] text-ink-soft">{m.notYetText}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/play/one-step" onClick={clear} className="rounded-full bg-ink px-5 py-2.5 text-[14px] text-paper">
              {m.smaller}
            </Link>
            <button
              type="button"
              onClick={() => {
                clear();
                setStep(null);
              }}
              className="text-[14px] text-ink-faint hover:text-ink"
            >
              {m.hide}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
