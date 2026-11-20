"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { thoughtJarMessages } from "@/i18n/game-thought-jar";
import { askPractice } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { cleanJarDraft, type ActiveStep, type JarDraft, type JarThought, type JarZone } from "@/lib/practice-state";
import { useSynced } from "@/lib/use-synced";
import { drop, whoosh } from "@/lib/sounds";
import { chime } from "@/lib/chime";
import { vibrate } from "@/lib/practice-settings-client";
import { CrisisHelp } from "../course/CrisisHelp";
import { buttonStyles } from "../ui";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { useActiveStep } from "./useActiveStep";

type Phase = JarDraft["phase"];
const ZONES: JarZone[] = ["can", "part", "cant"];
const ZONE_COLOR: Record<JarZone, string> = { can: "#7ccfaa", part: "#f3c98b", cant: "#aaa4ff" };
const COLORS = ["#f3c98b", "#aaa4ff", "#8db4ea", "#7ccfaa", "#f2a7cb", "#ffb79c"];

// «Банка мыслей»: выгрузить → разложить по возможности повлиять → одна мысль → конкретный шаг →
// отпустить то, что не от вас. Каждый шаг сохраняется как черновик (в аккаунте и на устройстве).
// Основное взаимодействие работает без ИИ; ИИ только подсказывает варианты шага, если попросить.
export function ThoughtJar() {
  const locale = useLocale();
  const m = thoughtJarMessages[locale];
  const { report } = usePractice();
  const draft = useSynced<JarDraft>("thought-jar", cleanJarDraft);
  const active = useActiveStep();
  const [thoughts, setThoughts] = useState<JarThought[]>([]);
  const [phase, setPhase] = useState<Phase>("fill");
  const [focus, setFocus] = useState<number | null>(null);
  const [step, setStep] = useState("");
  const [when, setWhen] = useState<NonNullable<ActiveStep["when"]>>("today");
  const [text, setText] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [offer, setOffer] = useState<"ask" | "hidden" | null>(null); // показать «продолжить разбор»
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [ideasFailed, setIdeasFailed] = useState(false);
  const [savedStep, setSavedStep] = useState<string>("");
  const [loading, start] = useTransition();
  const loaded = useRef(false);

  // Есть незаконченный разбор — предлагаем продолжить.
  useEffect(() => {
    if (loaded.current || draft.status === "loading") return;
    loaded.current = true;
    if (draft.value && draft.value.thoughts.length) setOffer("ask");
  }, [draft.status, draft.value]);

  // Черновик сохраняется на каждом изменении.
  const keep = (next: Partial<JarDraft>) => {
    const d: JarDraft = { thoughts, phase, focus: focus ?? undefined, step, at: Date.now(), ...next };
    if (!d.thoughts.length || d.phase === "done") draft.save(null);
    else draft.save(d);
  };

  const resume = () => {
    const d = draft.value!;
    setThoughts(d.thoughts);
    setPhase(d.phase);
    setFocus(d.focus ?? null);
    setStep(d.step ?? "");
    setOffer("hidden");
  };
  const fresh = () => {
    draft.save(null, true);
    setOffer("hidden");
  };

  const add = (value = text) => {
    const parts = value.split(/\n+/).map((v) => v.trim()).filter(Boolean).slice(0, 30 - thoughts.length);
    if (!parts.length) return;
    if (parts.some((p) => looksLikeCrisis(p))) setCrisis(true);
    const next = [...thoughts, ...parts.map((p, i) => ({ id: Date.now() + i, text: p.slice(0, 200) }))];
    setThoughts(next);
    setText("");
    drop(0.055, 760 + (thoughts.length % 5) * 60);
    vibrate(8);
    keep({ thoughts: next });
  };

  const unsorted = thoughts.filter((t) => !t.zone);
  const by = (z: JarZone) => thoughts.filter((t) => t.zone === z);
  const current = unsorted[0] ?? null;

  const place = (z: JarZone) => {
    if (!current) return;
    const next = thoughts.map((t) => (t.id === current.id ? { ...t, zone: z } : t));
    setThoughts(next);
    chime(z === "can" ? 79 : z === "part" ? 76 : 72, 0.04);
    vibrate(10);
    keep({ thoughts: next });
  };
  const unplace = (id: number) => {
    const next = thoughts.map((t) => (t.id === id ? { ...t, zone: undefined } : t));
    setThoughts(next);
    keep({ thoughts: next });
  };

  useEffect(() => {
    if (phase !== "sort" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0) place(ZONES[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (p: Phase, extra: Partial<JarDraft> = {}) => {
    setPhase(p);
    keep({ phase: p, ...extra });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const workable = thoughts.filter((t) => t.zone === "can" || t.zone === "part");
  const toRelease = thoughts.filter((t) => t.zone === "cant" && !t.released);
  const focusThought = thoughts.find((t) => t.id === focus) ?? null;

  const askIdeas = () => {
    if (!focusThought) return;
    setIdeasFailed(false);
    start(async () => {
      try {
        const r = await askPractice("one-step", `Хочу изменить или сдвинуть: ${focusThought.text}`);
        if ("crisis" in r) setCrisis(true);
        else if ("ok" in r && r.data.steps?.length) setIdeas(r.data.steps.slice(0, 4));
        else setIdeasFailed(true);
      } catch {
        setIdeasFailed(true);
      }
    });
  };

  const commitStep = () => {
    const s = step.trim();
    if (!s) return;
    active.set(s, "thought-jar", when);
    setSavedStep(s);
    chime(84, 0.05);
    go(toRelease.length ? "release" : "done");
    if (!toRelease.length) complete(s);
  };

  const release = (id: number) => {
    const next = thoughts.map((t) => (t.id === id ? { ...t, released: true } : t));
    setThoughts(next);
    whoosh(0.05, 1.4);
    vibrate(14);
    keep({ thoughts: next });
  };

  const complete = (s = savedStep) => {
    setPhase("done");
    draft.save(null, true);
    report(m.summary(by("can").length, by("part").length, by("cant").length, focusThought?.text ?? "", s));
  };

  const restart = () => {
    setThoughts([]);
    setPhase("fill");
    setFocus(null);
    setStep("");
    setIdeas(null);
    setSavedStep("");
    setCrisis(false);
    draft.save(null, true);
  };

  return (
    <div className="space-y-4">
      {offer === "ask" && draft.value && (
        <div className="animate-rise rounded-[26px] bg-sand/80 p-5">
          <p className="font-serif text-[19px] text-ink">{m.resumeTitle}</p>
          <p className="mt-1 text-[14px] text-ink-soft">{m.resumeText(draft.value.thoughts.length)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={resume} className={buttonStyles.primary}>
              {m.resume}
            </button>
            <button type="button" onClick={fresh} className={buttonStyles.ghost}>
              {m.fresh}
            </button>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[32px] p-5 text-paper shadow-lift sm:p-7" style={{ background: "radial-gradient(120% 100% at 50% 110%,#6a4f96,#2f2a68 50%,#14153a)" }}>
        {crisis && (
          <div className="mb-4 rounded-[22px] bg-paper text-ink">
            <CrisisHelp />
          </div>
        )}

        {phase === "fill" && (
          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <Jar thoughts={thoughts} label={m.aria(thoughts.length)} />
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
                className="flex gap-2"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      add();
                    }
                  }}
                  onPaste={(e) => {
                    const v = e.clipboardData.getData("text");
                    if (v.includes("\n")) {
                      e.preventDefault();
                      add(v);
                    }
                  }}
                  rows={1}
                  maxLength={600}
                  placeholder={m.placeholder}
                  aria-label={m.placeholder}
                  className="min-h-12 w-full resize-none rounded-[22px] border border-paper/20 bg-paper/10 px-4 py-3 text-[15px] text-paper outline-none placeholder:text-paper/45 focus:border-paper/50"
                />
                <button type="submit" disabled={!text.trim()} className="h-12 shrink-0 rounded-full bg-paper px-5 text-[14.5px] font-medium text-ink disabled:opacity-40">
                  {m.add}
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.examples
                  .filter((x) => !thoughts.some((t) => t.text === x))
                  .map((x) => (
                    <button key={x} type="button" onClick={() => add(x)} className="rounded-full border border-paper/20 bg-paper/10 px-3.5 py-1.5 text-[13.5px] text-paper/85 transition hover:bg-paper/20">
                      + {x}
                    </button>
                  ))}
              </div>
              <p className="mt-4 text-[13.5px] text-paper/65">{m.count(thoughts.length)}</p>
              {thoughts.length > 0 && (
                <button type="button" onClick={() => go("sort")} className="mt-4 inline-flex h-12 items-center rounded-full bg-paper px-6 text-[15px] font-medium text-ink shadow-[0_0_30px_4px_rgba(255,255,255,0.18)]">
                  {m.sort}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "sort" && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-[22px] sm:text-[24px]">{m.sortTitle}</h2>
              <span className="shrink-0 whitespace-nowrap text-[13px] text-paper/60">{m.progress(thoughts.length - unsorted.length, thoughts.length)}</span>
            </div>
            <p className="mt-1 text-[13.5px] text-paper/60">{m.sortHint}</p>
            {current ? (
              <div key={current.id} className="mx-auto mt-5 max-w-md animate-rise rounded-[24px] bg-paper px-5 py-4 text-center font-serif text-[20px] leading-snug text-ink shadow-lift">
                {current.text}
              </div>
            ) : (
              <div className="mt-5 text-center">
                <button type="button" onClick={() => go(workable.length ? "focus" : toRelease.length ? "release" : "done")} className="inline-flex h-12 items-center rounded-full bg-paper px-6 text-[15px] font-medium text-ink">
                  {m.finish}
                </button>
              </div>
            )}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {ZONES.map((z, i) => (
                <div key={z} className="flex min-w-0 flex-col">
                  <button
                    type="button"
                    onClick={() => place(z)}
                    disabled={!current}
                    className="rounded-[20px] border-2 px-2 py-3 text-center transition hover:-translate-y-0.5 disabled:hover:translate-y-0 sm:px-3"
                    style={{ borderColor: ZONE_COLOR[z], background: `${ZONE_COLOR[z]}22` }}
                  >
                    <span className="block text-[14px] font-medium leading-tight sm:text-[15px]">
                      <span className="mr-1 text-paper/45">{i + 1}</span>
                      {m.zones[z]}
                    </span>
                    <span className="mt-0.5 hidden text-[12px] text-paper/60 sm:block">{m.zoneHints[z]}</span>
                  </button>
                  <div className="mt-2 flex min-h-[64px] flex-col gap-1.5 rounded-[18px] bg-paper/5 p-1.5">
                    {by(z).map((t) => (
                      <button key={t.id} type="button" onClick={() => unplace(t.id)} className="animate-rise line-clamp-3 break-words rounded-[14px] px-2.5 py-1.5 text-left text-[12.5px] leading-snug text-ink" style={{ background: ZONE_COLOR[z] }} title={t.text}>
                        {t.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 hidden text-[12px] text-paper/45 sm:block">{m.keysHint}</p>
          </div>
        )}

        {phase === "focus" && (
          <div className="animate-rise">
            <h2 className="font-serif text-[22px] sm:text-[24px]">{m.focusTitle}</h2>
            <p className="mt-1 text-[13.5px] text-paper/60">{m.focusHint}</p>
            {workable.length ? (
              <div className="mt-4 space-y-2">
                {workable.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setFocus(t.id);
                      setStep("");
                      setIdeas(null);
                      go("step", { focus: t.id, step: "" });
                    }}
                    className="flex w-full items-center gap-3 rounded-[18px] border border-paper/15 bg-paper/10 px-4 py-3 text-left text-[15px] transition hover:-translate-y-0.5 hover:bg-paper/20"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: ZONE_COLOR[t.zone!], boxShadow: `0 0 10px 2px ${ZONE_COLOR[t.zone!]}` }} />
                    {t.text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[15px]">{m.noFocus}</p>
            )}
            {toRelease.length > 0 && (
              <button type="button" onClick={() => go("release")} className="mt-5 text-[14px] text-paper/65 underline-offset-4 hover:text-paper hover:underline">
                {m.toRelease}
              </button>
            )}
          </div>
        )}

        {phase === "step" && focusThought && (
          <div className="animate-rise">
            <p className="rounded-[20px] bg-paper/10 px-4 py-3 font-serif text-[18px] leading-snug">{focusThought.text}</p>
            <h2 className="mt-5 font-serif text-[22px] sm:text-[24px]">{m.stepTitle}</h2>
            <p className="mt-1 text-[13.5px] text-paper/60">{m.stepHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.templates.map((tpl) => (
                <button key={tpl} type="button" onClick={() => setStep(tpl)} className="rounded-full border border-paper/20 bg-paper/10 px-3.5 py-1.5 text-[13.5px] text-paper/85 transition hover:bg-paper/20">
                  {tpl.trim()}…
                </button>
              ))}
            </div>
            <textarea
              value={step}
              onChange={(e) => {
                setStep(e.target.value);
                keep({ step: e.target.value });
              }}
              rows={2}
              maxLength={300}
              placeholder={m.stepPlaceholder}
              className="mt-3 w-full resize-none rounded-[20px] border border-paper/20 bg-paper/10 px-4 py-3 text-[15px] text-paper outline-none placeholder:text-paper/45 focus:border-paper/50"
            />
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
              {(["today", "tomorrow", "week"] as const).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={when === w} onClick={() => setWhen(w)} className={`rounded-full px-4 py-1.5 text-[13.5px] transition ${when === w ? "bg-paper text-ink" : "bg-paper/10 text-paper/80 hover:bg-paper/20"}`}>
                  {m.when[w]}
                </button>
              ))}
            </div>
            {ideas && (
              <div className="mt-4 space-y-2">
                {ideas.map((x) => (
                  <button key={x} type="button" onClick={() => setStep(x)} className="block w-full rounded-[16px] bg-paper/10 px-4 py-2.5 text-left text-[14px] transition hover:bg-paper/20">
                    {x}
                  </button>
                ))}
              </div>
            )}
            {ideasFailed && <p className="mt-3 text-[13.5px] text-paper/65">{m.helpFailed}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={commitStep} disabled={!step.trim() || step.trim().endsWith(":")} className="inline-flex h-12 items-center rounded-full bg-paper px-6 text-[15px] font-medium text-ink disabled:opacity-40">
                {m.makeStep}
              </button>
              {!ideas && (
                <button type="button" onClick={askIdeas} disabled={loading} className="text-[14px] text-paper/70 underline-offset-4 hover:text-paper hover:underline">
                  {loading ? m.helping : m.help}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "release" && (
          <div className="animate-rise">
            <h2 className="font-serif text-[22px] sm:text-[24px]">{m.releaseTitle}</h2>
            <p className="mt-1 text-[13.5px] text-paper/60">{m.releaseHint}</p>
            <div className="relative mt-4 h-[260px] overflow-hidden rounded-[24px] bg-paper/5">
              {toRelease.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-[15px] text-paper/70">{m.releaseEmpty}</p>}
              {toRelease.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => release(t.id)}
                  className="jar-bob absolute flex max-w-[46%] items-center justify-center rounded-full border border-paper/40 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.45),rgba(170,164,255,0.18)_60%,rgba(170,164,255,0.08))] px-4 py-5 text-center text-[13px] leading-tight shadow-[inset_0_0_18px_rgba(255,255,255,0.25)] transition hover:scale-105"
                  style={{ left: `${8 + ((i * 29) % 52)}%`, top: `${10 + ((i * 41) % 55)}%`, animationDelay: `${-i * 1.3}s` }}
                >
                  {t.text}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => complete()} className="mt-5 inline-flex h-12 items-center rounded-full bg-paper px-6 text-[15px] font-medium text-ink">
              {toRelease.length ? m.skip : m.finish}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="animate-rise">
            <h2 className="font-serif text-[24px]">{m.doneTitle}</h2>
            <p className="mt-2 text-[13.5px] text-paper/65">{m.tally(by("can").length, by("part").length, by("cant").length)}</p>
            {savedStep ? (
              <div className="mt-4 rounded-[22px] bg-paper/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#9fe6c8]">{m.stepIs}</p>
                <p className="mt-1 font-serif text-[20px] leading-snug">{savedStep}</p>
                <p className="mt-1 text-[13px] text-paper/60">{m.stepSaved}</p>
              </div>
            ) : (
              <p className="mt-4 text-[15px] text-paper/85">{m.noStep}</p>
            )}
            <button type="button" onClick={restart} className="mt-5 text-[14px] text-paper/70 underline-offset-4 hover:text-paper hover:underline">
              {m.another}
            </button>
          </div>
        )}
      </div>

      {phase === "done" && (
        <div className="animate-rise rounded-[26px] bg-paper p-4 shadow-soft sm:p-5">
          <ResultActions
            prompt={m.prompt(focusThought?.text ?? thoughts[0]?.text ?? "", thoughts.map((t) => t.text).join("; "))}
            journal={m.journal(focusThought?.text ?? "", savedStep || "—")}
          />
        </div>
      )}
    </div>
  );
}

// Стеклянная банка, в которой огоньками светятся мысли.
function Jar({ thoughts, label }: { thoughts: JarThought[]; label: string }) {
  return (
    <svg viewBox="0 0 200 240" className="mx-auto w-[170px] sm:w-[200px]" role="img" aria-label={label}>
      <defs>
        <linearGradient id="tj-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x="62" y="14" width="76" height="20" rx="6" fill="#c9b3e8" opacity="0.7" />
      <path d="M58 34 h84 c14 0 26 14 26 30 v130 c0 18 -14 32 -32 32 h-72 c-18 0 -32 -14 -32 -32 v-130 c0 -16 12 -30 26 -30 z" fill="url(#tj-glass)" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" />
      {thoughts.slice(0, 30).map((t, i) => {
        const row = Math.floor(i / 5);
        const x = 52 + (i % 5) * 24 + (row % 2 ? 10 : 0) + (((i * 37) % 9) - 4);
        const y = 206 - row * 22 + (((i * 53) % 7) - 3);
        const c = COLORS[i % COLORS.length];
        return (
          <g key={t.id} className="animate-rise">
            <circle cx={x} cy={y} r="13" fill={c} opacity="0.25" />
            <circle cx={x} cy={y} r="6.5" fill={c} />
          </g>
        );
      })}
    </svg>
  );
}
