"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { boundariesMessages } from "@/i18n/game-boundaries";
import { ENDINGS, ENDING_STYLE, ENDING_TINT, GLOW, MAX, SCENARIO_IDS, TINT, ending, meters, type ScenarioId, type Style } from "@/lib/boundaries";
import { cleanBoundaries, type BoundariesProgress } from "@/lib/practice-state";
import { useSynced } from "@/lib/use-synced";
import { chime } from "@/lib/chime";
import { vibrate } from "@/lib/practice-settings-client";
import { bowlStrike, drop, whoosh } from "@/lib/sounds";
import { StartForm } from "../StartForm";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { useActiveStep } from "./useActiveStep";
import { Night, nightChip, nightGhost, nightInput, nightPrimary } from "./Night";

type Phase = "pick" | "play" | "end";

const sound = (k: Style) => {
  vibrate(k === 1 ? 24 : 10);
  if (k === 0) drop(0.05, 520);
  else if (k === 1) drop(0.07, 1200);
  else if (k === 2) whoosh(0.04, 1.2);
  else bowlStrike(0.06, 294);
};

// «Мои границы»: ситуация в три хода. На каждом ходу выбор, реакция другого и две шкалы:
// «ваши силы» и «связь». Концовка зависит от всего пути; любую ситуацию можно переиграть.
// Механика работает без ИИ и без обязательного письма; своя фраза и разговор с Опи — по желанию.
export function Boundaries() {
  const locale = useLocale();
  const m = boundariesMessages[locale];
  const { report } = usePractice();
  const progress = useSynced<BoundariesProgress>("boundaries", (v) => cleanBoundaries(v));
  const seen = progress.value?.seen ?? {};
  const { set: setStep } = useActiveStep();
  const [phase, setPhase] = useState<Phase>("pick");
  const [scene, setScene] = useState<ScenarioId>("debt");
  const [path, setPath] = useState<Style[]>([]);
  const [picked, setPicked] = useState<number | null>(null); // выбранный вариант текущего хода
  const [lastPath, setLastPath] = useState<Record<string, number[]>>({});
  const [choices, setChoices] = useState<number[]>([]);
  const [own, setOwn] = useState("");
  const [phrase, setPhrase] = useState("");
  const [stepSaved, setStepSaved] = useState(false);

  const sc = m.scenarios[scene];
  const round = choices.length - (picked !== null ? 1 : 0);
  const current = sc.rounds[Math.min(round, 2)];
  const mtr = meters(path);
  const end = ending(path);
  const totalSeen = Object.values(seen).reduce((n, l) => n + l.length, 0);

  const begin = (id: ScenarioId) => {
    setScene(id);
    setPath([]);
    setChoices([]);
    setPicked(null);
    setPhrase("");
    setStepSaved(false);
    setPhase("play");
    chime(72, 0.04);
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    const style = current.options[i][0] as Style;
    setPicked(i);
    setChoices((c) => [...c, i]);
    setPath((p) => [...p, style]);
    sound(style);
  };

  const next = () => {
    if (choices.length >= 3) {
      finishScene();
      return;
    }
    setPicked(null);
  };

  const finishScene = () => {
    const e = ending(path);
    const list = seen[scene] ?? [];
    const fresh = !list.includes(e);
    progress.save({ seen: { ...seen, [scene]: fresh ? [...list, e] : list } }, true);
    setLastPath((lp) => ({ ...lp, [scene]: choices }));
    setPhase("end");
    chime(e === "clear" ? 84 : 76, 0.05);
    report(m.journal(sc.text, m.endings[e].title, path.map((s) => m.styles[s].toLowerCase()).join(" → ")));
  };

  const replay = () => begin(scene);

  const shown: Style | null = phase === "pick" ? null : phase === "end" ? ENDING_STYLE[end] : picked !== null ? path[path.length - 1] : path.length ? path[path.length - 1] : null;
  const glow = shown === null ? "#5a4f96" : GLOW[shown];

  return (
    <Night glow={glow} className="p-5 sm:p-8">
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
        <div className="md:sticky md:top-6">
          <Scene kind={shown} you={m.you} other={m.other} label={m.aria} />
          {phase !== "pick" && <MetersView self={mtr.self} link={mtr.link} labels={[m.meterSelf, m.meterLink]} />}
        </div>

        <div className="min-w-0">
          {phase === "pick" && (
            <div className="animate-rise">
              <h2 className="font-serif text-[22px] sm:text-[24px]">{m.pickTitle}</h2>
              <p className="mt-1 text-[14px] leading-snug text-paper/65">{m.pickHint}</p>
              <p className="mt-2 text-[12.5px] text-[#9fe6c8]">{m.seen(totalSeen, SCENARIO_IDS.length * ENDINGS.length)}</p>
              <div className="mt-4 space-y-2">
                {SCENARIO_IDS.map((id) => (
                  <button key={id} type="button" onClick={() => begin(id)} className="block w-full rounded-[20px] border border-paper/15 bg-paper/10 px-4 py-3 text-left backdrop-blur transition hover:-translate-y-0.5 hover:bg-paper/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-paper">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.scenarios[id].title}</span>
                      <EndingDots seen={seen[id] ?? []} />
                    </span>
                    <span className="mt-0.5 block text-[14.5px] leading-snug">{m.scenarios[id].text}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-[20px] border border-dashed border-paper/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.ownTitle}</p>
                <p className="mt-1 text-[13px] text-paper/60">{m.ownHint}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input value={own} onChange={(e) => setOwn(e.target.value)} maxLength={240} placeholder={m.ownPlaceholder} className={`${nightInput} h-12 rounded-full`} />
                  {own.trim() ? (
                    <StartForm prompt={m.ownPrompt(own.trim())} className={`${nightPrimary} shrink-0`}>
                      {m.ownGo}
                    </StartForm>
                  ) : (
                    <button type="button" disabled className={`${nightPrimary} shrink-0`}>
                      {m.ownGo}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "play" && (
            <div key={`${scene}-${round}`} className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">
                {sc.title} · {m.round(round + 1)}
              </p>
              <Bubble side="other">{current.say}</Bubble>
              <h2 className="mt-5 text-[15px] font-medium text-paper/85">{m.choose}</h2>
              <div className="mt-2 space-y-2">
                {current.options.map(([style, text], i) => {
                  const on = picked === i;
                  const before = lastPath[scene]?.[round] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={picked !== null && !on}
                      aria-pressed={on}
                      onClick={() => choose(i)}
                      className={`block w-full rounded-[18px] border px-4 py-3 text-left text-[14.5px] leading-snug transition ${
                        on ? "bg-paper text-ink" : picked !== null ? "border-paper/10 bg-paper/5 text-paper/40" : "border-paper/15 bg-paper/10 hover:-translate-y-0.5 hover:bg-paper/20"
                      }`}
                      style={on ? { borderColor: TINT[style as Style], boxShadow: `0 0 22px 2px ${TINT[style as Style]}66` } : undefined}
                    >
                      {text}
                      {before && picked === null && <span className="ml-2 text-[11.5px] text-paper/45">· {m.lastTime}</span>}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="mt-4 animate-rise">
                  <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: TINT[path[path.length - 1]] }}>
                    {m.styles[path[path.length - 1]]}
                  </p>
                  <Bubble side="other" soft>
                    {current.options[picked][2]}
                  </Bubble>
                  <button type="button" onClick={next} autoFocus className={`${nightPrimary} mt-4`}>
                    {choices.length >= 3 ? m.toEnding : m.next}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === "end" && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">{sc.title}</p>
              <h2 className="mt-1 font-serif text-[26px] leading-tight sm:text-[30px]" style={{ color: ENDING_TINT[end] }}>
                {m.endings[end].title}
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-paper/90">{m.endings[end].text}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-paper/55">{m.pathTitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {path.map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-paper/40">→</span>}
                    <span className="rounded-full px-3 py-1 text-[12.5px] text-ink" style={{ background: TINT[s] }}>
                      {m.styles[s]}
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[13px] italic leading-snug text-paper/55">{m.kindNote}</p>
              <p className="mt-3 text-[12.5px] text-[#9fe6c8]">{m.seen((seen[scene] ?? []).length, ENDINGS.length)}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={replay} className={nightPrimary}>
                  {m.again}
                </button>
                <button type="button" onClick={() => setPhase("pick")} className={nightChip}>
                  {m.otherScene}
                </button>
              </div>

              <details className="mt-6 rounded-[22px] bg-paper/10 p-4 backdrop-blur">
                <summary className="cursor-pointer text-[14.5px] text-paper/85">{m.phraseTitle}</summary>
                <p className="mt-2 text-[13px] leading-snug text-paper/60">{m.phraseHint}</p>
                <textarea value={phrase} onChange={(e) => { setPhrase(e.target.value); setStepSaved(false); }} rows={2} maxLength={300} placeholder={m.phrasePlaceholder} className={`${nightInput} mt-3 resize-none`} />
                {phrase.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep(m.stepText(phrase.trim()), "boundaries");
                      setStepSaved(true);
                      chime(81, 0.04);
                    }}
                    disabled={stepSaved}
                    className={`${nightPrimary} mt-3`}
                  >
                    {stepSaved ? m.stepSaved : m.makeStep}
                  </button>
                )}
              </details>
            </div>
          )}
        </div>
      </div>

      {phase === "end" && (
        <div className="relative mt-6 animate-rise rounded-[26px] bg-paper p-4 sm:p-5">
          <ResultActions
            prompt={m.prompt(sc.text, m.endings[end].title, phrase.trim())}
            journal={m.journal(sc.text, m.endings[end].title, path.map((s) => m.styles[s].toLowerCase()).join(" → "))}
          />
        </div>
      )}
      {phase === "play" && (
        <button type="button" onClick={() => setPhase("pick")} className={`${nightGhost} relative mt-5 block`}>
          {m.otherScene}
        </button>
      )}
    </Night>
  );
}

function Bubble({ children, side, soft = false }: { children: React.ReactNode; side: "other"; soft?: boolean }) {
  return (
    <p
      data-side={side}
      className={`mt-2 rounded-[22px] rounded-tl-[6px] px-4 py-3 font-serif text-[17.5px] leading-snug backdrop-blur ${soft ? "bg-[#ffb79c]/15 text-paper/90" : "bg-paper/10"}`}
    >
      {children}
    </p>
  );
}

// Две шкалы под сценой: ваши силы и связь с человеком.
function MetersView({ self, link, labels }: { self: number; link: number; labels: [string, string] }) {
  return (
    <div className="mx-auto mt-3 grid max-w-[320px] grid-cols-2 gap-3">
      {[self, link].map((v, i) => (
        <div key={i}>
          <p className="text-[11px] uppercase tracking-[0.12em] text-paper/55">{labels[i]}</p>
          <div className="mt-1.5 flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={v} aria-label={labels[i]}>
            {Array.from({ length: MAX }, (_, k) => (
              <span
                key={k}
                className="h-2 flex-1 rounded-full transition-all duration-700"
                style={{ background: k < v ? (i === 0 ? "#cfc9ff" : "#9fe6c8") : "rgba(255,255,255,0.12)", boxShadow: k < v ? `0 0 8px ${i === 0 ? "#cfc9ff" : "#9fe6c8"}88` : undefined }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Какие концовки ситуации уже открыты: пять точек, цвет — вид концовки.
function EndingDots({ seen }: { seen: string[] }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {ENDINGS.map((e) => (
        <span key={e} className="h-1.5 w-1.5 rounded-full" style={{ background: seen.includes(e) ? ENDING_TINT[e] : "rgba(255,255,255,0.18)" }} />
      ))}
    </span>
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
