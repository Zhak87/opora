"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveIntake } from "@/lib/intake-actions";
import { INTAKE_OPTIONS, MAX_REASONS, MULTI, NOTE_MAX, type Intake, type IntakeKey } from "@/lib/intake";
import { useMsg } from "@/i18n/client";
import { intakeMessages } from "@/i18n/intake";
import { StartForm } from "./StartForm";
import { buttonStyles } from "./ui";
import { CrisisHelp } from "./course/CrisisHelp";

type Step = IntakeKey | "note";
const STEPS: Step[] = ["reasons", "feeling", "style", "length", "calm", "support", "note"];

type Answers = { [K in IntakeKey]: string[] } & { note: string };

const toAnswers = (v: Intake | null): Answers => ({
  reasons: v?.reasons ?? [],
  feeling: v?.feeling ? [v.feeling] : [],
  style: v?.style ? [v.style] : [],
  length: v?.length ? [v.length] : [],
  calm: v?.calm ?? [],
  support: v?.support ? [v.support] : [],
  note: v?.note ?? "",
});

// Анкета по одному вопросу на экран: выбор вариантов, «Дальше», в конце свободный текст.
export function IntakeForm({ initial }: { initial: Intake | null }) {
  const m = useMsg(intakeMessages);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(() => toAnswers(initial));
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | { crisis: boolean }>(null);
  const [pending, start] = useTransition();

  const key = STEPS[step];
  const last = step === STEPS.length - 1;

  const choose = (k: IntakeKey, value: string) => {
    setA((prev) => {
      if (!MULTI.includes(k)) return { ...prev, [k]: [value] };
      const cur = prev[k];
      if (cur.includes(value)) return { ...prev, [k]: cur.filter((x) => x !== value) };
      if (k === "reasons" && cur.length >= MAX_REASONS) return prev;
      // «Пока не знаю» не сочетается с другими вариантами.
      if (k === "calm") {
        const next = value === "unknown" ? ["unknown"] : [...cur.filter((x) => x !== "unknown"), value];
        return { ...prev, calm: next };
      }
      return { ...prev, [k]: [...cur, value] };
    });
    // Для вопросов с одним ответом сразу переходим дальше.
    if (!MULTI.includes(k)) setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 220);
  };

  const submit = () =>
    start(async () => {
      setError("");
      const r = await saveIntake({
        reasons: a.reasons,
        feeling: a.feeling[0] ?? null,
        style: a.style[0] ?? null,
        length: a.length[0] ?? null,
        calm: a.calm,
        support: a.support[0] ?? null,
        note: a.note,
      });
      if ("error" in r) setError(r.error);
      else setDone({ crisis: r.crisis });
    });

  if (done)
    return (
      <div className="animate-rise space-y-6">
        {done.crisis && <CrisisHelp />}
        <div className="rounded-[28px] border border-line/70 bg-gradient-to-br from-paper to-sage-soft/60 p-8 text-center shadow-soft">
          <span className="mx-auto mb-6 block h-14 w-14 animate-breathe rounded-full bg-gradient-to-br from-mist via-lilac-soft to-sage-soft" aria-hidden />
          <p className="font-serif text-[26px] text-ink">{m.doneTitle}</p>
          <p className="mt-2 text-[15px] text-ink-soft">{m.doneText}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <StartForm className={buttonStyles.primary}>{m.doneTalk}</StartForm>
            <Link href="/" className={buttonStyles.soft}>
              {m.doneHome}
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.step(step + 1, STEPS.length)}</p>
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-6 bg-lilac" : "w-1.5 bg-line"}`} />
          ))}
        </div>
      </div>

      <fieldset key={key} className="animate-rise">
        <legend className="font-serif text-[24px] leading-snug text-ink sm:text-[28px]">{m.q[key]}</legend>
        <p className="mt-2 text-sm text-ink-faint">
          {key === "reasons" ? m.upTo(MAX_REASONS) : key === "calm" ? m.many : key === "note" ? m.optional : " "}
        </p>

        {key === "note" ? (
          <div className="mt-6">
            <textarea
              value={a.note}
              maxLength={NOTE_MAX}
              rows={4}
              onChange={(e) => setA((prev) => ({ ...prev, note: e.target.value }))}
              placeholder={m.notePlaceholder}
              aria-label={m.q.note}
              className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 text-[16px] leading-relaxed text-ink shadow-soft outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
            />
            <p className="mt-1 text-right text-xs text-ink-faint">
              {a.note.length}/{NOTE_MAX}
            </p>
          </div>
        ) : (
          <div className={`mt-6 grid gap-2.5 ${key === "reasons" || key === "calm" ? "sm:grid-cols-2" : ""}`}>
            {INTAKE_OPTIONS[key].map((value) => {
              const on = a[key].includes(value);
              const label = (m.o[key] as Record<string, string>)[value];
              return (
                <button
                  key={value}
                  type="button"
                  role={MULTI.includes(key) ? "checkbox" : "radio"}
                  aria-checked={on}
                  onClick={() => choose(key, value)}
                  className={`flex items-center gap-3 rounded-[20px] border px-5 py-4 text-left text-[15.5px] transition-all duration-200 ${
                    on ? "border-lilac bg-lilac-soft/70 text-ink shadow-soft" : "border-line bg-paper/80 text-ink-soft hover:border-sand-deep hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border transition ${MULTI.includes(key) ? "rounded-md" : "rounded-full"} ${
                      on ? "border-lilac-deep bg-lilac-deep" : "border-sand-deep"
                    }`}
                    aria-hidden
                  >
                    {on && <span className={`bg-paper ${MULTI.includes(key) ? "h-2 w-2 rounded-sm" : "h-1.5 w-1.5 rounded-full"}`} />}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {error && <p className="text-sm text-[#a0614f]">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className={buttonStyles.ghost}>
            {m.back}
          </button>
        )}
        <span className="flex-1" />
        {!last && a[key as IntakeKey].length === 0 && (
          <button type="button" onClick={() => setStep(step + 1)} className={buttonStyles.ghost}>
            {m.skip}
          </button>
        )}
        {last ? (
          <button type="button" onClick={submit} disabled={pending} className={buttonStyles.primary}>
            {pending ? m.saving : m.finish}
          </button>
        ) : (
          a[key as IntakeKey].length > 0 && (
            <button type="button" onClick={() => setStep(step + 1)} className={buttonStyles.primary}>
              {m.next}
            </button>
          )
        )}
      </div>
    </div>
  );
}
