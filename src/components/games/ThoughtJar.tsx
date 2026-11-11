"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { thoughtJarMessages } from "@/i18n/game-thought-jar";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { drop, whoosh } from "@/lib/sounds";
import { chime } from "@/lib/chime";
import { StartForm } from "../StartForm";
import { CrisisHelp } from "../course/CrisisHelp";
import { buttonStyles } from "../ui";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";

type Item = { id: number; text: string; color: string; gone?: boolean; leaving?: boolean };
type Phase = "fill" | "pick" | "decide" | "can" | "cant" | "unsure";

const COLORS = ["#f3c98b", "#aaa4ff", "#8db4ea", "#7ccfaa", "#f2a7cb", "#ffb79c"];

// Место огонька в банке: снизу вверх, слегка вразброс (детерминированно, чтобы не прыгали).
function spot(i: number) {
  const row = Math.floor(i / 4);
  const col = i % 4;
  const jitter = ((i * 37) % 11) - 5;
  return { left: 26 + col * 16 + (row % 2 ? 7 : 0) + jitter * 0.6, bottom: 10 + row * 11 + (((i * 53) % 7) - 3) };
}

export function ThoughtJar() {
  const locale = useLocale();
  const m = thoughtJarMessages[locale];
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("fill");
  const [chosen, setChosen] = useState<number | null>(null);
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [step, setStep] = useState("");
  const [stepSaved, setStepSaved] = useState(false);
  const [loading, start] = useTransition();
  const { report } = usePractice();
  const all = () => items.filter((i) => !i.gone).map((i) => i.text).join("; ");

  const alive = items.filter((i) => !i.gone);
  const current = items.find((i) => i.id === chosen) ?? null;

  const add = (value = text) => {
    const v = value.trim();
    if (!v) return;
    if (looksLikeCrisis(v)) setCrisis(true);
    setItems((list) => [...list, { id: Date.now() + list.length, text: v.slice(0, 200), color: COLORS[list.length % COLORS.length] }]);
    setText("");
    drop(0.055, 760 + (items.length % 5) * 60);
  };

  const sort = () => {
    setPhase("pick");
    setAi(null);
    start(async () => {
      const r = await askPractice("thought-jar", alive.map((t, i) => `${i}. ${t.text}`).join("\n"));
      if ("crisis" in r) setCrisis(true);
      else if ("ok" in r) setAi(r.data);
    });
  };

  const choose = (id: number) => {
    setChosen(id);
    setPhase("decide");
    setStep("");
    setStepSaved(false);
    chime(74, 0.04);
  };

  const letGo = () => {
    if (!current) return;
    whoosh(0.06, 2);
    setItems((list) => list.map((i) => (i.id === current.id ? { ...i, leaving: true } : i)));
    setTimeout(() => {
      setItems((list) => list.map((i) => (i.id === current.id ? { ...i, gone: true, leaving: false } : i)));
      chime(81, 0.035);
    }, 2100);
  };

  const pickIndex = ai?.pick !== undefined && ai.pick >= 0 && ai.pick < alive.length ? ai.pick : null;
  const released = current?.gone;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,300px)_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[300px]">
        <Jar items={items} chosen={chosen} label={m.aria(alive.length)} />
      </div>

      <div className="min-w-0">
        {crisis && (
          <div className="mb-5">
            <CrisisHelp onClose={() => setCrisis(false)} />
          </div>
        )}

        {phase === "fill" && (
          <div className="animate-rise">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
              className="flex gap-2"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={m.placeholder}
                maxLength={200}
                autoFocus
                className="h-14 min-w-0 flex-1 rounded-full border border-line bg-paper px-5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-lilac"
              />
              <button type="submit" disabled={!text.trim()} className={`${buttonStyles.primary} h-14 shrink-0 disabled:opacity-40`}>
                {m.add}
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.examples
                .filter((x) => !items.some((i) => i.text === x))
                .map((x) => (
                  <button key={x} type="button" onClick={() => add(x)} className="rounded-full bg-paper/70 px-3.5 py-1.5 text-[13px] text-ink-soft transition hover:bg-paper hover:text-ink">
                    + {x}
                  </button>
                ))}
            </div>
            <p className="mt-6 text-[14px] text-ink-soft">{m.count(alive.length)}</p>
            {alive.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {alive.map((i) => (
                  <li key={i.id} className="flex items-center gap-2.5 text-[14.5px] text-ink">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color, boxShadow: `0 0 8px 2px ${i.color}` }} />
                    {i.text}
                  </li>
                ))}
              </ul>
            )}
            {alive.length > 0 && (
              <button type="button" onClick={sort} className={`${buttonStyles.primary} mt-6`}>
                {m.sort}
              </button>
            )}
          </div>
        )}

        {phase === "pick" && (
          <div className="animate-rise">
            <h2 className="font-serif text-[22px] text-ink">{m.pickTitle}</h2>
            <p className="mt-1 text-[14px] text-ink-soft">{m.pickHint}</p>
            {loading && <p className="mt-4 animate-pulse text-[14px] text-lilac-deep">{m.looking}</p>}
            {ai && <p className="mt-4 animate-rise rounded-[20px] bg-lilac-soft/70 p-4 text-[15px] leading-relaxed text-ink">{ai.reflection}</p>}
            <div className="mt-4 space-y-2">
              {alive.map((i, n) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => choose(i.id)}
                  className={`flex w-full items-center gap-3 rounded-[20px] bg-paper px-4 py-3.5 text-left text-[15px] text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift ${pickIndex === n ? "ring-2 ring-lilac" : ""}`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: i.color, boxShadow: `0 0 10px 3px ${i.color}` }} />
                  <span className="flex-1">{i.text}</span>
                  {pickIndex === n && <span className="shrink-0 text-[12px] text-lilac-deep">{m.aiPick}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {current && phase !== "fill" && phase !== "pick" && (
          <div className="animate-rise">
            <p className="flex items-center gap-3 font-serif text-[22px] leading-snug text-ink">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: current.color, boxShadow: `0 0 12px 4px ${current.color}` }} />
              {current.text}
            </p>

            {phase === "decide" && (
              <>
                {pickIndex !== null && alive[pickIndex]?.id === current.id && ai?.questions?.length ? (
                  <div className="mt-4 rounded-[20px] bg-paper/70 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.questions}</p>
                    <ul className="mt-2 space-y-1.5 text-[14.5px] text-ink">
                      {ai.questions.map((q) => (
                        <li key={q}>— {q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <h3 className="mt-6 text-[16px] font-medium text-ink">{m.decideTitle}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["can", m.can, "bg-sage-soft"],
                      ["cant", m.cant, "bg-mist"],
                      ["unsure", m.unsure, "bg-lilac-soft"],
                    ] as const
                  ).map(([p, label, bg]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (p !== "can") report(`${all()}. ${label}: «${current.text}»`);
                        setPhase(p);
                        chime(p === "can" ? 79 : p === "cant" ? 72 : 76, 0.04);
                      }}
                      className={`rounded-[20px] ${bg} px-4 py-4 text-[15px] font-medium text-ink transition hover:-translate-y-0.5 hover:shadow-soft`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === "can" && (
              <div className="mt-5 animate-rise">
                <h3 className="text-[16px] font-medium text-ink">{m.canTitle}</h3>
                {!stepSaved ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (step.trim()) {
                        report(m.journal(current.text, step.trim()));
                        setStepSaved(true);
                        chime(79, 0.05);
                      }
                    }}
                  >
                    <textarea
                      value={step}
                      onChange={(e) => setStep(e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder={m.canPlaceholder}
                      className="mt-3 w-full resize-none rounded-[20px] border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-lilac"
                    />
                    <button type="submit" disabled={!step.trim()} className={`${buttonStyles.primary} mt-3 disabled:opacity-40`}>
                      {m.canSave}
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 animate-rise space-y-4">
                    <p className="rounded-[20px] bg-sage-soft p-4 text-[15px] leading-relaxed text-ink">{m.canDone(step.trim())}</p>
                    <ResultActions prompt={m.prompt(current.text, alive.map((i) => i.text).join("; "))} journal={m.journal(current.text, step.trim())} kind="goal" />
                    <Link href="/play/one-step" className="inline-block text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                      {m.toSteps}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {phase === "cant" && (
              <div className="mt-5 animate-rise">
                <p className="text-[15px] leading-relaxed text-ink-soft">{released ? m.released : m.cantText}</p>
                {!released && (
                  <button type="button" onClick={letGo} disabled={current.leaving} className={`${buttonStyles.primary} mt-4`}>
                    {m.letGo}
                  </button>
                )}
              </div>
            )}

            {phase === "unsure" && (
              <div className="mt-5 animate-rise">
                <p className="text-[15px] leading-relaxed text-ink-soft">{m.unsureText}</p>
                <div className="mt-4">
                  <StartForm prompt={m.prompt(current.text, alive.map((i) => i.text).join("; "))} className={buttonStyles.primary}>
                    {m.talk}
                  </StartForm>
                </div>
              </div>
            )}

            {phase !== "decide" && alive.filter((i) => i.id !== current.id).length > 0 && (phase !== "cant" || released) && (
              <button type="button" onClick={() => setPhase("pick")} className="mt-6 text-sm text-ink-faint hover:text-ink">
                {m.another}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Стеклянная банка с крышкой; внутри светятся мысли.
function Jar({ items, chosen, label }: { items: Item[]; chosen: number | null; label: string }) {
  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[36px] shadow-lift"
      style={{ background: "radial-gradient(120% 90% at 50% 110%, #6a4f96 0%, #2f2a68 45%, #14153a 100%)" }}
      role="img"
      aria-label={label}
    >
      {[
        [12, 10, 3.4], [80, 16, 4.6], [28, 22, 5.2], [90, 40, 3.8], [8, 48, 4.4], [64, 7, 5.6], [44, 13, 4.1],
      ].map(([x, y, t], i) => (
        <span key={i} className="twinkle absolute h-[3px] w-[3px] rounded-full bg-paper" style={{ left: `${x}%`, top: `${y}%`, ["--t" as string]: `${t}s`, ["--d" as string]: `${-i}s` } as React.CSSProperties} />
      ))}
      <span className="absolute inset-x-6 bottom-3 h-6 rounded-[50%] bg-[#0b0c26]/60 blur-md" />
      <svg viewBox="0 0 300 400" className="absolute left-[8%] top-[4%] h-[92%] w-[84%]">
        <defs>
          <linearGradient id="tj-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="0.35" stopColor="#cfd4ff" stopOpacity="0.10" />
            <stop offset="0.7" stopColor="#cfd4ff" stopOpacity="0.07" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="tj-lid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9d2b4" />
            <stop offset="1" stopColor="#c9a983" />
          </linearGradient>
        </defs>
        <path d="M70 92 C 70 72, 230 72, 230 92 L 236 112 C 266 132, 272 160, 272 200 L 272 340 C 272 372, 250 386, 220 386 L 80 386 C 50 386, 28 372, 28 340 L 28 200 C 28 160, 34 132, 64 112 Z" fill="url(#tj-glass)" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M52 170 C 46 220, 46 300, 54 350" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.45" fill="none" />
        <path d="M74 150 C 70 160, 68 172, 68 182" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.4" fill="none" />
        <rect x="60" y="44" width="180" height="44" rx="14" fill="url(#tj-lid)" />
        <rect x="60" y="74" width="180" height="10" rx="5" fill="#b8956c" opacity="0.35" />
        <path d="M80 56 L 220 56" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-x-[17%] bottom-[8%] top-[32%]">
        {items.map((it, i) => {
          if (it.gone) return null;
          const s = spot(i);
          const on = chosen === it.id;
          return (
            <span
              key={it.id}
              className={`absolute ${it.leaving ? "jar-free" : "jar-fly"}`}
              style={{ left: `${s.left}%`, bottom: `${s.bottom}%` }}
              title={it.text}
            >
              <span
                className="jar-bob block rounded-full"
                style={
                  {
                    width: on ? 22 : 16,
                    height: on ? 22 : 16,
                    background: `radial-gradient(circle at 35% 35%, #fff, ${it.color} 60%)`,
                    boxShadow: `0 0 ${on ? 26 : 16}px ${on ? 10 : 5}px ${it.color}`,
                    animationDelay: `${-(i * 0.7) % 5}s`,
                    "--bx": `${((i * 13) % 7) - 3}px`,
                    "--by": `${-4 - ((i * 7) % 5)}px`,
                  } as React.CSSProperties
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
