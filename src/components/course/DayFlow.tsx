"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeDay, prepareDay } from "@/lib/course-actions";
import type { DayContent } from "@/lib/course";
import { chime } from "@/lib/chime";
import { useMsg } from "@/i18n/client";
import { courseMessages } from "@/i18n/course";
import { buttonStyles } from "../ui";
import { StartForm } from "../StartForm";
import { CrisisHelp } from "./CrisisHelp";

type Step = "mood" | "letter" | "insight" | "practice" | "reflect" | "action";

// Пока ИИ готовит содержание дня, показываем спокойную анимацию.
export function DayPreparing({ courseId, day }: { courseId: string; day: number }) {
  const m = useMsg(courseMessages).day;
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const started = useRef(false);

  const run = (basic = false) =>
    start(async () => {
      setError("");
      const r = await prepareDay(courseId, day, basic);
      if ("error" in r) setError(r.error);
      else router.refresh();
    });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, m.preparing.length - 1)), 4000);
    return () => clearInterval(id);
  }, [pending, m.preparing.length]);

  if (error && !pending)
    return (
      <div className="rounded-[28px] border border-line/70 bg-paper/80 p-7 text-center shadow-soft">
        <p className="text-[15px] leading-relaxed text-ink-soft">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => run()} className={buttonStyles.primary}>
            {m.retry}
          </button>
          <button onClick={() => run(true)} className={buttonStyles.soft}>
            {m.useBasic}
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center text-center" role="status">
      <span className="relative mb-8 flex h-28 w-28 items-center justify-center" aria-hidden>
        <span className="absolute h-28 w-28 animate-breathe rounded-full bg-gradient-to-br from-lilac-soft via-mist to-sage-soft [animation-duration:4s]" />
        <span className="absolute h-14 w-14 animate-breathe rounded-full bg-paper/90 [animation-delay:-2s] [animation-duration:4s]" />
      </span>
      <p key={stage} className="animate-fade font-serif text-[21px] text-ink">
        {m.preparing[stage]}
      </p>
    </div>
  );
}

export function DayFlow(props: {
  courseId: string;
  day: number;
  length: number;
  title: string;
  minutes: number;
  content: DayContent;
  weekEndTitle: string | null;
  nextTitle: string | null;
  streak: number;
  firstMood: number | null;
}) {
  const t = useMsg(courseMessages);
  const m = t.day;
  const { content } = props;
  const steps: Step[] = ["mood", "letter", ...(content.insight ? ["insight" as const] : []), ...(content.practice ? ["practice" as const] : []), "reflect", "action"];
  const [i, setI] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [commit, setCommit] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ crisis: boolean } | null>(null);
  const [pending, start] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  const go = (d: number) => {
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const finish = () =>
    start(async () => {
      setError("");
      const r = await completeDay(props.courseId, props.day, { moodBefore, moodAfter, reflection, actionDone: commit });
      if ("error" in r) return setError(r.error);
      chime(72, 0.06);
      setTimeout(() => chime(79, 0.05), 180);
      setResult({ crisis: r.crisis });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  if (result) return <DayDone {...props} crisis={result.crisis} moodAfter={moodAfter} reflection={reflection} />;

  return (
    <div ref={topRef} className="scroll-mt-6">
      {/* Шаги дня: тонкие сегменты сверху */}
      <div className="mb-8 flex gap-1.5" aria-hidden>
        {steps.map((s, k) => (
          <span key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${k <= i ? "bg-ink/70" : "bg-line"}`} />
        ))}
      </div>
      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-lilac-deep">
        {m.label(props.day)} · {m.steps[step]}
      </p>

      <div key={step} className="animate-rise">
        {step === "mood" && (
          <>
            <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{props.title}</h1>
            <p className="mt-8 text-[17px] text-ink">{m.moodQuestion}</p>
            <MoodPicker value={moodBefore} onChange={setMoodBefore} labels={m.moods} />
          </>
        )}

        {step === "letter" && (
          <article className="relative overflow-hidden rounded-[30px] border border-line/70 bg-gradient-to-b from-paper to-sand/40 p-7 shadow-soft sm:p-10">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lilac-soft/70 blur-2xl" aria-hidden />
            <p className="relative text-xs uppercase tracking-[0.14em] text-ink-faint">{m.letter}</p>
            <div className="relative mt-4 space-y-4 font-serif text-[19px] leading-[1.7] text-ink sm:text-[21px]">
              {content.letter.split(/\n+/).map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
          </article>
        )}

        {step === "insight" && content.insight && (
          <>
            <h2 className="font-serif text-[28px] leading-tight text-ink">{content.insight.title || m.insight}</h2>
            <div className="mt-5 space-y-4 text-[16px] leading-[1.75] text-ink-soft">
              {content.insight.text.split(/\n+/).map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
          </>
        )}

        {step === "practice" && content.practice && <Practice title={content.practice.title || m.practice} steps={content.practice.steps} />}

        {step === "reflect" && (
          <>
            <h2 className="font-serif text-[26px] leading-snug text-ink sm:text-[30px]">{content.question || m.basicQuestion}</h2>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={6}
              maxLength={4000}
              autoFocus
              placeholder={m.reflectPlaceholder}
              className="mt-6 w-full resize-none rounded-[24px] border border-line bg-paper px-5 py-4 text-[16px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
            />
            <p className="mt-2 text-xs text-ink-faint">{m.reflectHint}</p>
          </>
        )}

        {step === "action" && (
          <>
            <div className="rounded-[30px] bg-gradient-to-br from-sage-soft to-paper p-7 shadow-soft sm:p-9">
              <p className="text-xs uppercase tracking-[0.14em] text-sage-deep">{m.action}</p>
              <p className="mt-3 font-serif text-[24px] leading-snug text-ink">{content.action}</p>
              <button
                type="button"
                onClick={() => {
                  if (!commit) chime(76, 0.05);
                  setCommit((c) => !c);
                }}
                aria-pressed={commit}
                className={`mt-6 inline-flex items-center gap-3 rounded-full px-5 py-3 text-[15px] transition-all duration-300 ${
                  commit ? "bg-sage text-paper shadow-soft" : "bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${commit ? "border-paper" : "border-ink-faint"}`}>
                  {commit && "✓"}
                </span>
                {m.actionCommit}
              </button>
            </div>
            <p className="mt-10 text-[17px] text-ink">{m.moodAfterQuestion}</p>
            <MoodPicker value={moodAfter} onChange={setMoodAfter} labels={m.moods} />
          </>
        )}
      </div>

      <div className="mt-10 flex items-center gap-3">
        {i > 0 && (
          <button onClick={() => go(-1)} className={buttonStyles.ghost}>
            {m.back}
          </button>
        )}
        <div className="flex-1" />
        {step === "action" ? (
          <button onClick={finish} disabled={pending} className={`${buttonStyles.primary} px-8`}>
            {pending ? m.saving : m.finish}
          </button>
        ) : (
          <button onClick={() => go(1)} className={`${buttonStyles.primary} px-8`}>
            {step === "mood" && !moodBefore ? m.skip : m.next}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-right text-sm text-[#94594a]">{error}</p>}
    </div>
  );
}

const MOOD_TONES = ["bg-[#d9d3e6]", "bg-lilac-soft", "bg-mist", "bg-sage-soft", "bg-[#d5e5cf]"];

function MoodPicker({ value, onChange, labels }: { value: number | null; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="mt-4 grid grid-cols-5 gap-2" role="radiogroup">
      {labels.map((label, k) => {
        const v = k + 1;
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`flex flex-col items-center gap-2 rounded-[20px] px-1 py-3 transition-all duration-300 ${on ? "bg-paper shadow-lift" : "hover:bg-paper/60"}`}
          >
            <span
              className={`rounded-full transition-all duration-500 ${MOOD_TONES[k]} ${on ? "scale-110 ring-4 ring-paper" : ""}`}
              style={{ width: 22 + k * 5, height: 22 + k * 5 }}
            />
            <span className={`text-center text-[11.5px] leading-tight ${on ? "text-ink" : "text-ink-soft"}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Practice({ title, steps }: { title: string; steps: { text: string; seconds: number }[] }) {
  const m = useMsg(courseMessages).day;
  const [at, setAt] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const s = steps[at];

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      chime(74, 0.05);
      setLeft(null);
      setAt((a) => Math.min(a + 1, steps.length - 1));
      return;
    }
    const id = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(id);
  }, [left, steps.length]);

  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = left !== null && s.seconds ? left / s.seconds : 1;

  return (
    <>
      <h2 className="font-serif text-[28px] leading-tight text-ink">{title}</h2>
      <div className="mt-6 rounded-[30px] border border-line/70 bg-gradient-to-b from-mist/60 to-paper p-6 text-center shadow-soft sm:p-8">
        <p className="text-xs text-ink-faint">{m.stepOf(at + 1, steps.length)}</p>
        {s.seconds > 0 && (
          <div className="relative mx-auto my-5 h-32 w-32">
            <span className={`absolute inset-4 rounded-full bg-lilac-soft ${left !== null ? "animate-breathe" : ""}`} />
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-line)" strokeWidth="4" />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="var(--color-lilac-deep)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - frac)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-serif text-[28px] tabular-nums text-ink">{left ?? s.seconds}</span>
          </div>
        )}
        <p key={at} className={`mx-auto max-w-md animate-fade text-[18px] leading-relaxed text-ink ${s.seconds > 0 ? "" : "my-6"}`}>
          {s.text}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {s.seconds > 0 && (
            <button onClick={() => setLeft(left === null ? s.seconds : null)} className={buttonStyles.soft}>
              {left === null ? m.startTimer : m.pause}
            </button>
          )}
          {at < steps.length - 1 && (
            <button
              onClick={() => {
                setLeft(null);
                setAt(at + 1);
              }}
              className={buttonStyles.ghost}
            >
              {m.next}
            </button>
          )}
        </div>
      </div>
      <ol className="mt-5 space-y-1.5">
        {steps.map((x, k) => (
          <li key={k}>
            <button
              onClick={() => {
                setLeft(null);
                setAt(k);
              }}
              className={`flex w-full gap-3 rounded-2xl px-3 py-2 text-left text-sm transition ${k === at ? "bg-paper text-ink shadow-soft" : k < at ? "text-ink-faint line-through decoration-line" : "text-ink-soft hover:bg-paper/60"}`}
            >
              <span className="tabular-nums">{k + 1}.</span>
              <span>{x.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

function DayDone(props: {
  day: number;
  length: number;
  title: string;
  content: DayContent;
  weekEndTitle: string | null;
  nextTitle: string | null;
  streak: number;
  firstMood: number | null;
  crisis: boolean;
  moodAfter: number | null;
  reflection: string;
}) {
  const t = useMsg(courseMessages);
  const m = t.done;
  const last = props.day >= props.length;
  const pct = Math.round((props.day / props.length) * 100);
  const [fill, setFill] = useState(Math.round(((props.day - 1) / props.length) * 100));
  useEffect(() => {
    const id = setTimeout(() => setFill(pct), 300);
    return () => clearTimeout(id);
  }, [pct]);
  const r = 70;
  const c = 2 * Math.PI * r;
  const moods = t.day.moods;

  return (
    <div className="animate-rise text-center">
      {props.crisis && (
        <div className="mb-8 text-left">
          <CrisisHelp />
        </div>
      )}
      <div className="relative mx-auto h-48 w-48">
        {/* Тихие искры вокруг кольца */}
        {Array.from({ length: 10 }, (_, k) => (
          <span
            key={k}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-lilac"
            style={{
              transform: `rotate(${k * 36}deg) translateY(-104px)`,
              animation: `spark 1.8s ${k * 0.08}s ease-out both`,
            }}
            aria-hidden
          />
        ))}
        <span className="absolute inset-6 animate-breathe rounded-full bg-gradient-to-br from-sage-soft via-paper to-lilac-soft" />
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="var(--color-sage)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - fill / 100)}
            className="transition-[stroke-dashoffset] duration-[1600ms] ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-[40px] leading-none text-ink">{props.day}</span>
          <span className="mt-1 text-xs text-ink-soft">/ {props.length}</span>
        </span>
      </div>

      <h1 className="mt-8 font-serif text-[32px] leading-tight text-ink">{last ? m.courseDone : m.title(props.day)}</h1>
      {last && <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">{m.courseDoneText}</p>}
      {!last && props.weekEndTitle && (
        <p className="mx-auto mt-3 inline-block rounded-full bg-sage-soft px-4 py-1.5 text-sm text-sage-deep">{m.weekDone(props.weekEndTitle)}</p>
      )}
      {props.streak >= 2 && <p className="mt-3 text-sm text-ink-soft">{m.streak(props.streak)}</p>}
      {last && props.firstMood && props.moodAfter && (
        <p className="mx-auto mt-4 max-w-md text-[15px] text-ink">{m.moodChange(moods[props.firstMood - 1], moods[props.moodAfter - 1])}</p>
      )}

      {props.content.takeaway && (
        <figure className="mx-auto mt-10 max-w-md rounded-[26px] border border-line/70 bg-paper/80 px-6 py-6 shadow-soft">
          <figcaption className="text-xs uppercase tracking-[0.14em] text-lilac-deep">{m.takeaway}</figcaption>
          <blockquote className="mt-3 font-serif text-[21px] leading-snug text-ink">{props.content.takeaway}</blockquote>
        </figure>
      )}

      {props.nextTitle && (
        <div className="mx-auto mt-4 max-w-md rounded-[22px] bg-gradient-to-r from-mist/70 to-lilac-soft/70 px-6 py-4 text-left">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{m.tomorrow}</p>
          <p className="mt-1 text-[16px] text-ink">{props.nextTitle}</p>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Link href="/course" className={`${buttonStyles.primary} w-full sm:w-auto`}>
          {m.path}
        </Link>
        <StartForm prompt={m.discussPrompt(props.day, props.title, props.reflection.slice(0, 600))} className={`${buttonStyles.soft} w-full sm:w-auto`}>
          {m.discuss}
        </StartForm>
      </div>
      <Link href="/" className="mt-4 inline-block text-sm text-ink-faint hover:text-ink">
        {m.home}
      </Link>
    </div>
  );
}
