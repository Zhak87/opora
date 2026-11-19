"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { programMessages } from "@/i18n/program";
import { Button, ButtonLink } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import {
  FOLLOW_UP,
  SCREENINGS,
  STEPS,
  band,
  isUnlocked,
  programState,
  type Program as ProgramRow,
  type Screening,
  type ScreeningKind,
} from "@/lib/program";
import {
  advanceStep,
  confirmSafety,
  makeHandoff,
  saveScreening,
  setGuided,
  setStepTaskDone,
  startProgram,
  startStepTalk,
  stopProgram,
} from "@/lib/program-actions";
import { sendCareMessage, } from "@/lib/chat-actions";
import { setConsent } from "@/lib/pro-actions";

export type CareInfo = { psychologistId: string; linkId: string; name: string; wellbeing: boolean } | null;

const card = "rounded-[28px] border border-line/70 bg-paper/80 p-6 shadow-soft sm:p-8";

export function ProgramView({ program, screenings, care }: { program: ProgramRow | null; screenings: Screening[]; care: CareInfo }) {
  const locale = useLocale();
  const t = programMessages[locale];
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | { ok: true }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r && "error" in r && r.error) setError(r.error);
      router.refresh();
    });

  const date = (iso: string) => new Date(iso).toLocaleDateString(INTL[locale], { day: "numeric", month: "long" });

  if (!program) return <Intro onStart={(goal, wish) => run(() => startProgram(goal, wish))} pending={pending} error={error} />;

  const state = programState(program, screenings);
  const header = (
    <header className="mb-8 animate-rise">
      <p className="mb-2 text-sm text-ink-soft">
        {t.brand}
        {program.status === "active" ? ` · ${t.homeContinue(program.step)}` : ""}
        {program.guided ? ` · ${t.guided.on}` : ""}
      </p>
      <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">
        {program.status === "active" ? t.steps[program.step - 1]?.title : program.step >= FOLLOW_UP ? t.followUp.title : t.finishedTitle}
      </h1>
      {program.wish && (
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          {t.goal}: {program.wish}
        </p>
      )}
    </header>
  );

  // Риск: программа на паузе, пока человек не подтвердит, что поговорил с живым человеком и в безопасности.
  if (state.safetyHold) {
    return (
      <>
        {header}
        <section className={`${card} border-peach/50 bg-peach-soft/40`} role="alert">
          <h2 className="font-serif text-[24px] text-ink">{t.risk.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{t.risk.text}</p>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink">{t.risk.lines}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => run(async () => { const r = await startStepTalk(); if (r.id) router.push(`/talk/${r.id}`); return r.error ? { error: r.error } : { ok: true as const }; })} disabled={pending}>
              {t.risk.talk}
            </Button>
            <ButtonLink href="/specialists" variant="soft">{t.risk.specialist}</ButtonLink>
          </div>
          <button type="button" onClick={() => run(confirmSafety)} disabled={pending} className="mt-6 text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            {t.risk.safe}
          </button>
        </section>
      </>
    );
  }

  if (state.needs.length) {
    return (
      <>
        {header}
        <ScreeningFlow kinds={state.needs} onDone={() => router.refresh()} />
      </>
    );
  }

  const step = t.steps[program.step - 1];
  const progress = program.progress[String(program.step)];
  const unlocked = isUnlocked(state.nextAt);
  const offerGuided = state.flags.guided && !program.guided && program.status === "active";
  const offerSpecialist = state.flags.specialist || state.noImprovement;

  return (
    <>
      {header}
      <div className="stagger space-y-6">
        {program.status === "active" && step && (
          <section className="relative overflow-hidden rounded-[32px] bg-ink p-7 text-paper shadow-lift sm:p-9">
            <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-breathe rounded-full bg-gradient-to-br from-lilac/40 via-sky/30 to-sage/30 blur-2xl" aria-hidden />
            <p className="relative text-xs uppercase tracking-[0.14em] text-paper/60">{t.stepLabel(program.step)} · {t.current}</p>
            <p className="relative mt-3 max-w-xl text-[16px] leading-relaxed text-paper/90">{step.about}</p>
            <p className="relative mt-2 max-w-xl text-[14px] leading-relaxed text-paper/60">{step.why}</p>
            <div className="relative mt-6 rounded-[20px] bg-paper/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-paper/60">{t.taskLabel}</p>
              <p className="mt-1 text-[16px]">{step.task}</p>
              <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-paper/80">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#7ccfaa]"
                  checked={Boolean(progress?.task_done)}
                  onChange={(e) => run(() => setStepTaskDone(e.target.checked))}
                  disabled={pending}
                />
                {progress?.task_done ? t.taskDone : t.taskNotYet}
              </label>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(async () => { const r = await startStepTalk(); if (r.id) router.push(`/talk/${r.id}`); return r.error ? { error: r.error } : { ok: true as const }; })}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-medium text-ink transition hover:gap-3 disabled:opacity-60"
              >
                {t.talk} <span aria-hidden>→</span>
              </button>
            </div>
          </section>
        )}

        {program.status === "done" && (
          <section className="rounded-[32px] bg-gradient-to-br from-sage-soft via-paper to-lilac-soft p-7 shadow-lift sm:p-10">
            <p className="max-w-md text-[15px] leading-relaxed text-ink-soft">{program.step >= FOLLOW_UP ? t.followUp.about : t.finishedText}</p>
            {program.step < FOLLOW_UP && state.nextAt && (
              unlocked ? (
                <Button className="mt-6" onClick={() => run(() => advanceStep())} disabled={pending}>{t.followUpReady}</Button>
              ) : (
                <p className="mt-4 text-sm text-ink-soft">{t.followUpOn(date(state.nextAt))}</p>
              )
            )}
            {program.step >= FOLLOW_UP && (
              <Button className="mt-6" onClick={() => run(async () => { const r = await startStepTalk(); if (r.id) router.push(`/talk/${r.id}`); return r.error ? { error: r.error } : { ok: true as const }; })} disabled={pending}>
                {t.talk}
              </Button>
            )}
          </section>
        )}

        {offerGuided && (
          <section className={`${card} bg-gradient-to-br from-lilac-soft/60 to-paper`}>
            <h2 className="font-serif text-[22px] text-ink">{t.guided.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t.guided.text}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => run(() => setGuided(true))} disabled={pending}>{t.guided.yes}</Button>
            </div>
          </section>
        )}

        {program.guided && (
          <section className={card}>
            <h2 className="font-serif text-[20px] text-ink">{t.guided.on}</h2>
            {care ? (
              <>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t.guided.linked(care.name)}</p>
                {!care.wellbeing && (
                  <form action={setConsent} className="mt-4">
                    <input type="hidden" name="link" value={care.linkId} />
                    <input type="hidden" name="scope" value="wellbeing" />
                    <input type="hidden" name="granted" value="1" />
                    <Button type="submit" variant="soft">{t.guided.consent}</Button>
                  </form>
                )}
              </>
            ) : (
              <ButtonLink href="/specialists" variant="soft" className="mt-4">{t.guided.pick}</ButtonLink>
            )}
          </section>
        )}

        <Scores state={state} />

        {(offerSpecialist || program.guided || care) && <Handoff program={program} care={care} why={state.flags.specialist ? t.handoff.why.severe : state.noImprovement ? t.handoff.why.noChange : null} />}

        <section>
          <ol className="space-y-2">
            {t.steps.map((s, i) => {
              const n = i + 1;
              const done = program.step > n || program.status === "done";
              const now = program.status === "active" && program.step === n;
              return (
                <li key={n} className={`flex items-center gap-4 rounded-[22px] border px-5 py-4 ${now ? "border-lilac/60 bg-lilac-soft/50" : "border-line/60 bg-paper/60"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${done ? "bg-sage text-paper" : now ? "bg-ink text-paper" : "bg-sand text-ink-soft"}`}>
                    {done ? "✓" : n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{s.title}</span>
                    <span className="block text-xs text-ink-faint">{done ? t.done : now ? t.current : t.locked}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {program.status === "active" && (
          <section className="flex flex-col items-start gap-2">
            {program.step < STEPS ? (
              unlocked ? (
                <Button onClick={() => run(() => advanceStep())} disabled={pending || !state.canAdvance}>{t.nextStep}</Button>
              ) : (
                <>
                  {state.nextAt && <p className="text-sm text-ink-soft">{t.unlocksOn(date(state.nextAt))}</p>}
                  <Button variant="soft" onClick={() => run(() => advanceStep(true))} disabled={pending || !state.canAdvance}>{t.nextStep}</Button>
                  <p className="text-xs text-ink-faint">{t.nextEarly}</p>
                </>
              )
            ) : (
              <Button onClick={() => run(() => advanceStep())} disabled={pending || !state.canAdvance}>{t.finish}</Button>
            )}
          </section>
        )}

        {error && <p className="text-sm text-peach-deep" role="alert">{error}</p>}

        <section className="flex flex-wrap gap-4 pt-4 text-sm">
          {program.status === "active" ? (
            <button type="button" className="text-ink-faint underline-offset-4 hover:text-ink hover:underline" onClick={() => { if (confirm(t.stopConfirm)) run(stopProgram); }}>
              {t.stop}
            </button>
          ) : (
            <button type="button" className="text-ink-faint underline-offset-4 hover:text-ink hover:underline" onClick={() => run(() => startProgram(program.goal ?? "", program.wish ?? ""))}>
              {t.restart}
            </button>
          )}
        </section>
      </div>
    </>
  );
}

function Intro({ onStart, pending, error }: { onStart: (goal: string, wish: string) => void; pending: boolean; error: string | null }) {
  const t = programMessages[useLocale()];
  const [goal, setGoal] = useState("");
  const [wish, setWish] = useState("");
  const [agree, setAgree] = useState(false);
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {t.back}
      </Link>
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-sm text-ink-soft">{t.brand}</p>
        <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{t.intro.title}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{t.intro.lead}</p>
      </header>
      <div className="stagger space-y-6">
        <ol className="grid gap-2 sm:grid-cols-5">
          {t.steps.map((s, i) => (
            <li key={i} className="rounded-[20px] border border-line/60 bg-paper/70 p-4">
              <span className="text-xs text-ink-faint">{t.stepLabel(i + 1)}</span>
              <span className="mt-1 block text-[14px] leading-snug text-ink">{s.title}</span>
            </li>
          ))}
        </ol>
        <form
          className={card}
          onSubmit={(e) => {
            e.preventDefault();
            if (agree) onStart(goal, wish);
          }}
        >
          <label className="block text-sm font-medium text-ink" htmlFor="program-goal">{t.intro.goalLabel}</label>
          <textarea id="program-goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={1000} rows={3} placeholder={t.intro.goalPlaceholder} className="mt-2 w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none" />
          <label className="mt-5 block text-sm font-medium text-ink" htmlFor="program-wish">{t.intro.wishLabel}</label>
          <textarea id="program-wish" value={wish} onChange={(e) => setWish(e.target.value)} maxLength={1000} rows={2} placeholder={t.intro.wishPlaceholder} className="mt-2 w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none" />
          <p className="mt-5 text-[13px] leading-relaxed text-ink-soft">{t.intro.not}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{t.intro.memory}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] text-ink">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#6c63ff]" />
            {t.intro.consent}
          </label>
          <Button type="submit" className="mt-6" disabled={pending || !agree}>{pending ? t.intro.starting : t.intro.start}</Button>
          {error && <p className="mt-3 text-sm text-peach-deep" role="alert">{error}</p>}
        </form>
      </div>
    </>
  );
}

// PHQ-9 и GAD-7 по одному вопросу на экран, ответы — четыре кнопки.
function ScreeningFlow({ kinds, onDone }: { kinds: ScreeningKind[]; onDone: () => void }) {
  const t = programMessages[useLocale()];
  const m = t.screening;
  const [k, setK] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<{ kind: ScreeningKind; score: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = kinds[k];
  const items = kind === "phq9" ? m.phq : m.gad;

  if (!kind) {
    return (
      <section className={card} aria-live="polite">
        <h2 className="font-serif text-[24px] text-ink">{m.resultTitle}</h2>
        <ul className="mt-4 space-y-1 text-[15px] text-ink">
          {results.map((r) => (
            <li key={r.kind}>{r.kind === "phq9" ? m.phqResult(r.score, m.bands[band("phq9", r.score)]) : m.gadResult(r.score, m.bands[band("gad7", r.score)])}</li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{m.resultLead}</p>
        <Button className="mt-6" onClick={onDone}>{m.continue}</Button>
      </section>
    );
  }

  const i = answers.length;
  const pick = async (value: number) => {
    const next = [...answers, value];
    if (next.length < SCREENINGS[kind]) return setAnswers(next);
    setSaving(true);
    setError(null);
    const r = await saveScreening(kind, next);
    setSaving(false);
    if ("error" in r) return setError(r.error);
    setResults((prev) => [...prev, { kind, score: r.score ?? 0 }]);
    setAnswers([]);
    setK(k + 1);
  };

  return (
    <section className={card}>
      <p className="text-xs uppercase tracking-[0.14em] text-lilac-deep">{m.title} · {kind === "phq9" ? m.phqTitle : m.gadTitle}</p>
      <p className="mt-2 text-[14px] text-ink-soft">{m.lead}</p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line/80">
        <div className="h-full rounded-full bg-lilac transition-all" style={{ width: `${(i / items.length) * 100}%` }} />
      </div>
      <p className="mt-5 text-xs text-ink-faint">{m.question(Math.min(i + 1, items.length), items.length)}</p>
      <p className="mt-1 min-h-[3.5rem] text-[19px] leading-snug text-ink">{items[Math.min(i, items.length - 1)]}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {m.options.map((label, value) => (
          <button
            key={value}
            type="button"
            disabled={saving}
            onClick={() => pick(value)}
            className="rounded-[18px] border-2 border-sand-deep bg-paper px-4 py-3 text-left text-[15px] text-ink transition hover:-translate-y-0.5 hover:border-lilac hover:bg-lilac-soft disabled:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>
      {i > 0 && (
        <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="mt-4 text-sm text-ink-faint hover:text-ink">
          ←
        </button>
      )}
      {saving && <p className="mt-3 text-sm text-ink-soft">{m.saving}</p>}
      {error && <p className="mt-3 text-sm text-peach-deep" role="alert">{error}</p>}
    </section>
  );
}

function Scores({ state }: { state: ReturnType<typeof programState> }) {
  const t = programMessages[useLocale()];
  const rows = ([["phq9", t.phq, 27], ["gad7", t.gad, 21]] as const).filter(([k]) => state.last[k]);
  if (!rows.length) return null;
  return (
    <section className={card}>
      <h2 className="text-[15px] text-ink-soft">{t.scores}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([k, label, max]) => {
          const first = state.first[k]!;
          const last = state.last[k]!;
          return (
            <div key={k} className="rounded-[20px] bg-mist/60 px-5 py-4">
              <p className="text-sm text-ink">{label}</p>
              <p className="mt-1 text-[22px] tabular-nums text-ink">
                {first !== last ? <>{first.score} → {last.score}</> : last.score}
                <span className="text-sm text-ink-faint"> / {max}</span>
              </p>
              <p className="text-xs text-ink-faint">{first !== last ? `${t.scoreFirst} → ${t.scoreLast}` : t.scoreLast}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Handoff({ program, care, why }: { program: ProgramRow; care: CareInfo; why: string | null }) {
  const t = programMessages[useLocale()].handoff;
  const [text, setText] = useState(program.handoff ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const make = async () => {
    setBusy(true);
    setNote(null);
    const r = await makeHandoff();
    setBusy(false);
    if (r.text) setText(r.text);
    else setNote(r.error ?? t.failed);
  };
  const send = async () => {
    if (!care || !text.trim()) return;
    setBusy(true);
    const r = await sendCareMessage(care.psychologistId, text);
    setBusy(false);
    setNote(r.message ? t.sent : r.error ?? t.failed);
  };
  return (
    <section className={card}>
      <h2 className="font-serif text-[20px] text-ink">{t.title}</h2>
      {why && <p className="mt-2 text-[15px] leading-relaxed text-ink">{why}</p>}
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t.lead}</p>
      {text ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={3000} className="mt-4 w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink focus:border-lilac focus:outline-none" />
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant={text ? "soft" : "primary"} onClick={make} disabled={busy}>{busy ? t.making : t.make}</Button>
        {text && care && <Button onClick={send} disabled={busy}>{t.send}</Button>}
        {text && (
          <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(text).then(() => setNote(t.copied))}>{t.copy}</Button>
        )}
      </div>
      {note && <p className="mt-3 text-sm text-ink-soft" role="status">{note}</p>}
    </section>
  );
}
