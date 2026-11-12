"use client";

import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { boundariesMessages } from "@/i18n/game-boundaries";
import { askPractice, type PracticeAI } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { bowlStrike, drop, whoosh } from "@/lib/sounds";
import { CrisisHelp } from "../course/CrisisHelp";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { Night, nightChip, nightGhost, nightInput, nightPrimary } from "./Night";

type Step = "pick" | "react" | "why" | "phrase" | "result";
// Виды реакции: 0 уступить, 1 резко, 2 уйти, 3 спокойно. Порядок кнопок меняется от ситуации к ситуации.
const ORDERS = [[0, 3, 1, 2], [2, 0, 3, 1], [1, 2, 0, 3], [3, 1, 2, 0], [0, 2, 3, 1], [1, 0, 2, 3]];
const TINT = ["#8db4ea", "#ff8f7a", "#b9b4d6", "#9fe6c8"];
const GLOW = ["#4d5f96", "#8a4660", "#4a4a78", "#3f7f7a"];

export function Boundaries() {
  const locale = useLocale();
  const m = boundariesMessages[locale];
  const { report } = usePractice();
  const [step, setStep] = useState<Step>("pick");
  const [scene, setScene] = useState<number | null>(null); // номер ситуации, -1 — своя
  const [own, setOwn] = useState("");
  const [kind, setKind] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const [phrase, setPhrase] = useState("");
  const [ai, setAi] = useState<PracticeAI | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [loading, start] = useTransition();

  const situation = scene === null ? "" : scene === -1 ? own.trim() : m.scenarios[scene].text;
  const options = scene === null ? [] : scene === -1 ? m.ownOptions : m.scenarios[scene].options;
  const order = ORDERS[(scene ?? 0) < 0 ? 5 : (scene ?? 0) % ORDERS.length];

  const open = (i: number) => {
    setScene(i);
    setKind(null);
    setStep("react");
    chime(72, 0.04);
  };
  const react = (k: number) => {
    setKind(k);
    if (k === 0) drop(0.05, 520);
    else if (k === 1) drop(0.07, 1200);
    else if (k === 2) whoosh(0.04, 1.2);
    else bowlStrike(0.06, 294);
  };
  const finish = () => {
    const p = phrase.trim();
    if (!p || kind === null) return;
    setStep("result");
    chime(79, 0.05);
    report(m.journal(situation, m.kinds[kind].name, p));
    if (looksLikeCrisis(`${own} ${why} ${p}`)) return setCrisis(true);
    start(async () => {
      const r = await askPractice("boundaries", `Ситуация: ${situation}\nБлиже реакция: ${m.kinds[kind].name} (${options[kind]})\nПочему: ${why.trim() || "—"}\nСвоя фраза: ${p}`);
      if ("crisis" in r) setCrisis(true);
      else if ("ok" in r) setAi(r.data);
    });
  };
  const restart = () => {
    setStep("pick");
    setScene(null);
    setKind(null);
    setWhy("");
    setPhrase("");
    setAi(null);
    setCrisis(false);
  };

  // На итоговом экране граница всегда спокойная и ясная: человек нашёл свои слова.
  const shown = step === "result" ? 3 : step === "pick" ? null : kind;

  return (
    <Night glow={shown === null ? "#5a4f96" : GLOW[shown]} className="p-5 sm:p-8">
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-start">
        <Scene kind={shown} you={m.you} other={m.other} label={m.aria} />

        <div className="min-w-0">
          {step === "pick" && (
            <div className="animate-rise">
              <h2 className="font-serif text-[22px] sm:text-[24px]">{m.pickTitle}</h2>
              <p className="mt-1 text-[14px] text-paper/65">{m.pickHint}</p>
              <div className="mt-4 space-y-2">
                {m.scenarios.map((s, i) => (
                  <button key={s.title} type="button" onClick={() => open(i)} className="block w-full rounded-[20px] border border-paper/15 bg-paper/10 px-4 py-3 text-left backdrop-blur transition hover:-translate-y-0.5 hover:bg-paper/20">
                    <span className="block text-[11px] uppercase tracking-[0.14em] text-paper/55">{s.title}</span>
                    <span className="mt-0.5 block text-[14.5px] leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (own.trim()) open(-1);
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.own}</p>
                <div className="mt-2 flex gap-2">
                  <input value={own} onChange={(e) => setOwn(e.target.value)} maxLength={240} placeholder={m.ownPlaceholder} className={`${nightInput} h-12 rounded-full`} />
                  <button type="submit" disabled={!own.trim()} className={`${nightPrimary} shrink-0`}>
                    {m.ownGo}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "react" && (
            <div className="animate-rise">
              <p className="rounded-[20px] bg-paper/10 px-4 py-3 font-serif text-[18px] leading-snug backdrop-blur">{situation}</p>
              <h2 className="mt-5 text-[16px] font-medium">{m.reactTitle}</h2>
              <p className="mt-1 text-[13.5px] text-paper/60">{m.reactHint}</p>
              <div className="mt-3 space-y-2">
                {order.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => react(k)}
                    className={`block w-full rounded-[18px] border px-4 py-3 text-left text-[14.5px] leading-snug transition ${kind === k ? "bg-paper text-ink" : "border-paper/15 bg-paper/10 hover:bg-paper/20"}`}
                    style={kind === k ? { borderColor: TINT[k], boxShadow: `0 0 22px 2px ${TINT[k]}66` } : undefined}
                  >
                    {options[k]}
                  </button>
                ))}
              </div>
              {kind !== null && (
                <div key={kind} className="mt-4 animate-rise rounded-[22px] bg-[#0f1030]/55 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: TINT[kind] }}>{m.kinds[kind].name}</p>
                  <dl className="mt-2 space-y-2 text-[14px] leading-snug">
                    <div className="flex gap-3">
                      <dt className="w-14 shrink-0 text-paper/50">{m.now}</dt>
                      <dd>{m.kinds[kind].now}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-14 shrink-0 text-paper/50">{m.later}</dt>
                      <dd>{m.kinds[kind].later}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[14px] leading-snug text-paper/85">{m.kinds[kind].ring}</p>
                  <p className="mt-1 text-[13px] italic text-paper/55">{m.kinds[kind].kind}</p>
                  <button type="button" onClick={() => setStep("why")} className={`${nightPrimary} mt-4`}>
                    {m.closer}
                  </button>
                  <p className="mt-2 text-[12.5px] text-paper/50">{m.closerHint}</p>
                </div>
              )}
            </div>
          )}

          {step === "why" && kind !== null && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: TINT[kind] }}>{m.kinds[kind].name}</p>
              <h2 className="mt-1 font-serif text-[22px] leading-snug sm:text-[24px]">{m.whyTitle}</h2>
              <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} maxLength={500} autoFocus placeholder={m.whyPlaceholder} className={`${nightInput} mt-4 resize-none`} />
              <button type="button" onClick={() => setStep("phrase")} className={`${nightPrimary} mt-4`}>
                {why.trim() ? m.next : m.skip}
              </button>
            </div>
          )}

          {step === "phrase" && (
            <div className="animate-rise">
              <h2 className="font-serif text-[22px] sm:text-[24px]">{m.phraseTitle}</h2>
              <p className="mt-1 text-[14px] leading-snug text-paper/65">{m.phraseHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.starters.map((s) => (
                  <button key={s} type="button" onClick={() => setPhrase((p) => (p.trim() ? `${p.trim()} ${s.replace("…", " ")}` : s.replace("…", " ")))} className={nightChip}>
                    {s}
                  </button>
                ))}
              </div>
              <textarea value={phrase} onChange={(e) => setPhrase(e.target.value)} rows={3} maxLength={300} placeholder={m.phrasePlaceholder} className={`${nightInput} mt-3 resize-none`} />
              <button type="button" onClick={finish} disabled={!phrase.trim()} className={`${nightPrimary} mt-4`}>
                {m.see}
              </button>
            </div>
          )}

          {step === "result" && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#9fe6c8]">{m.yours}</p>
              <p className="mt-2 font-serif text-[22px] leading-snug sm:text-[26px]">«{phrase.trim()}»</p>
              {crisis ? (
                <div className="mt-5 rounded-[24px] bg-paper">
                  <CrisisHelp />
                </div>
              ) : loading ? (
                <p className="mt-5 animate-pulse text-[14px] text-paper/70">{m.thinking}</p>
              ) : (
                <>
                  <p className="mt-4 text-[15px] leading-relaxed text-paper/85">{ai?.reflection ?? m.fallback}</p>
                  {ai?.steps?.length ? (
                    <div className="mt-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.variants}</p>
                      <div className="mt-2 space-y-2">
                        {ai.steps.slice(0, 2).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setPhrase(s);
                              report(m.journal(situation, m.kinds[kind ?? 3].name, s));
                              chime(81, 0.04);
                            }}
                            className="block w-full rounded-[18px] border border-paper/15 bg-paper/10 px-4 py-3 text-left text-[14.5px] leading-snug transition hover:bg-paper/20"
                          >
                            «{s}»<span className="ml-2 text-[12px] text-paper/50">{m.use}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {ai?.questions?.[0] && (
                    <p className="mt-4 text-[14.5px] italic text-paper/70">
                      {m.ask}: {ai.questions[0]}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {step === "result" && kind !== null && (
        <div className="relative mt-6 animate-rise rounded-[26px] bg-paper p-4 sm:p-5">
          <ResultActions prompt={m.prompt(situation, m.kinds[kind].name, why.trim(), phrase.trim())} journal={m.journal(situation, m.kinds[kind].name, phrase.trim())} />
        </div>
      )}
      {step !== "pick" && (
        <button type="button" onClick={restart} className={`${nightGhost} relative mt-5 block`}>
          {m.again}
        </button>
      )}
    </Night>
  );
}

// Сцена: вы (слева), круг вашей границы и другой человек, который подходит справа.
function Scene({ kind, you, other, label }: { kind: number | null; you: string; other: string; label: string }) {
  const ease = "transform 1s cubic-bezier(0.2,0.7,0.2,1), opacity 0.8s, stroke 0.8s, stroke-width 0.8s";
  const otherX = kind === null ? 78 : [36, 150, 78, 92][kind];
  const youX = kind === 2 ? -34 : 0;
  const ringScale = kind === null ? 1 : [0.52, 1.06, 1, 1][kind];
  const ringColor = kind === null ? "#cfc9ff" : ["#8db4ea", "#ff8f7a", "#cfc9ff", "#9fe6c8"][kind];
  const spikes = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 ? 62 : 80;
    return `${115 + Math.cos(a) * r},${110 + Math.sin(a) * r}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 320 220" className="mx-auto w-full max-w-[340px] md:sticky md:top-6" role="img" aria-label={label}>
      <defs>
        <radialGradient id="bd-you" cx="35%" cy="30%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#aaa4ff" />
        </radialGradient>
        <radialGradient id="bd-other" cx="35%" cy="30%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#ffb79c" />
        </radialGradient>
        <filter id="bd-blur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g style={{ transform: `translateX(${youX}px)`, transition: ease }}>
        <g style={{ transform: `scale(${ringScale})`, transformBox: "fill-box", transformOrigin: "center", transition: ease }}>
          <circle cx="115" cy="110" r="62" fill={ringColor} opacity={kind === 3 ? 0.16 : 0.08} style={{ transition: "opacity 0.8s" }} />
          <polygon points={spikes} fill="none" stroke="#ff8f7a" strokeWidth="2" strokeLinejoin="round" opacity={kind === 1 ? 0.9 : 0} style={{ transition: "opacity 0.6s" }} />
          <circle
            cx="115"
            cy="110"
            r="62"
            fill="none"
            stroke={ringColor}
            strokeWidth={kind === 3 ? 3.5 : 2}
            strokeDasharray={kind === 3 ? undefined : kind === 2 ? "2 9" : "6 7"}
            opacity={kind === 2 ? 0.25 : kind === 1 ? 0 : kind === 3 ? 1 : 0.7}
            style={{ transition: ease, filter: kind === 3 ? `drop-shadow(0 0 8px ${ringColor})` : undefined }}
          />
        </g>
        <circle cx="115" cy="110" r="26" fill="#aaa4ff" opacity="0.5" filter="url(#bd-blur)" />
        <circle cx="115" cy="110" r="17" fill="url(#bd-you)" opacity={kind === 0 ? 0.6 : 1} style={{ transition: "opacity 0.8s" }} />
        <text x="115" y="150" textAnchor="middle" fontSize="11" fill="#fff" opacity="0.6">{you}</text>
      </g>
      <g style={{ transform: `translateX(${otherX}px)`, opacity: kind === 1 ? 0.4 : 1, transition: ease }}>
        <g className={kind === null ? "press" : ""}>
          <circle cx="115" cy="110" r="22" fill="#ffb79c" opacity="0.45" filter="url(#bd-blur)" />
          <circle cx="115" cy="110" r="15" fill="url(#bd-other)" />
          <text x="115" y="148" textAnchor="middle" fontSize="11" fill="#fff" opacity="0.6">{other}</text>
          {kind === 2 && <text x="115" y="84" textAnchor="middle" fontSize="18" fill="#fff" opacity="0.7">?</text>}
        </g>
      </g>
      {kind === 3 && <path d="M134 110 H 190" stroke="#9fe6c8" strokeWidth="1.5" strokeDasharray="1 6" strokeLinecap="round" opacity="0.8" />}
    </svg>
  );
}
