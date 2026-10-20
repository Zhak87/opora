"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveCheckin, saveBalance, createGoal, addGoalStep } from "@/lib/wellbeing-actions";
import { Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { useMsg } from "@/i18n/client";
import { AREAS, FEELINGS, METRICS, wellbeingMessages, type Metric } from "@/i18n/wellbeing";
import type { Checkin } from "@/lib/wellbeing";

const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";
const input = "h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";

// Шкала 1–5 кнопками: крупные цели касания, подписи краёв.
function Scale({ name, label, low, high, value, onChange }: { name: Metric; label: string; low: string; high: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] text-ink">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="peer sr-only" />
            <span className="flex h-11 items-center justify-center rounded-xl border border-line bg-paper text-[15px] text-ink-soft transition peer-checked:border-lilac-deep peer-checked:bg-lilac-soft peer-checked:text-ink peer-focus-visible:ring-4 peer-focus-visible:ring-mist hover:border-sand-deep">
              {v}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-faint">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

export function CheckinForm({ today }: { today: Checkin | null }) {
  const [state, action] = useActionState(saveCheckin, undefined);
  const m = useMsg(wellbeingMessages);
  const [vals, setVals] = useState<Record<Metric, number | null>>({
    mood: today?.mood ?? null,
    energy: today?.energy ?? null,
    calm: today?.calm ?? null,
    sleep: today?.sleep ?? null,
  });
  const [feelings, setFeelings] = useState<string[]>(today?.feelings ?? []);
  const [note, setNote] = useState(today?.note ?? "");
  return (
    <form action={action} className="space-y-6">
      {today && !state && <p className="rounded-2xl bg-sage-soft/60 px-4 py-3 text-sm text-sage-deep">{m.checkin.edit}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        {METRICS.map((k) => (
          <Scale key={k} name={k} {...m.checkin.scales[k]} value={vals[k]} onChange={(v) => setVals((s) => ({ ...s, [k]: v }))} />
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-[15px] text-ink">{m.checkin.feelings}</legend>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => {
            const on = feelings.includes(f);
            return (
              <label key={f} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="feelings"
                  value={f}
                  checked={on}
                  onChange={() => setFeelings((all) => (on ? all.filter((x) => x !== f) : [...all, f].slice(0, 8)))}
                  className="peer sr-only"
                />
                <span className="inline-flex rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft transition peer-checked:border-sage peer-checked:bg-sage-soft peer-checked:text-ink peer-focus-visible:ring-4 peer-focus-visible:ring-mist">
                  {m.checkin.feelingNames[f]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-[15px] text-ink">{m.checkin.note}</span>
        <textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={m.checkin.notePlaceholder} className={area} />
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <SubmitButton className="w-full sm:w-auto">{m.checkin.save}</SubmitButton>
    </form>
  );
}

export function BalanceForm({ initial }: { initial: number[] }) {
  const [state, action] = useActionState(saveBalance, undefined);
  const m = useMsg(wellbeingMessages).balance;
  const [vals, setVals] = useState(initial.length ? initial : AREAS.map(() => 5));
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {AREAS.map((a, i) => (
          <label key={a} className="block">
            <span className="mb-1 flex items-baseline justify-between text-[15px] text-ink">
              {m.areas[a]}
              <span className="font-serif text-lg text-lilac-deep">{vals[i]}</span>
            </span>
            <input
              type="range"
              name={a}
              min={0}
              max={10}
              step={1}
              value={vals[i]}
              onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              className="w-full accent-[#6250d6]"
            />
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.note}</span>
        <textarea name="note" rows={2} maxLength={1000} className={area} />
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <SubmitButton>{m.save}</SubmitButton>
    </form>
  );
}

export function GoalForm() {
  const [state, action] = useActionState(createGoal, undefined);
  const m = useMsg(wellbeingMessages).goals;
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-[1fr_180px]">
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.name}</span>
        <input name="title" required maxLength={200} placeholder={m.namePlaceholder} className={input} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.target}</span>
        <input type="date" name="target_date" className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-2 block text-sm text-ink-soft">{m.why}</span>
        <input name="why" maxLength={1000} placeholder={m.whyPlaceholder} className={input} />
      </label>
      {state?.error && (
        <div className="sm:col-span-2">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      <div className="sm:col-span-2">
        <SubmitButton variant="soft">{m.create}</SubmitButton>
      </div>
    </form>
  );
}

export function GoalStepForm({ goal, progress }: { goal: string; progress: number }) {
  const [state, action] = useActionState(addGoalStep, undefined);
  const m = useMsg(wellbeingMessages).goals;
  const [value, setValue] = useState(progress);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="goal" value={goal} />
      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-sm text-ink-soft">
          {m.progress}
          <span className="text-ink">{value}%</span>
        </span>
        <input type="range" name="progress" min={0} max={100} step={10} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-[#6250d6]" />
      </label>
      <div className="flex gap-2">
        <input name="note" maxLength={1000} placeholder={m.stepPlaceholder} aria-label={m.step} className={input} />
        <SubmitButton variant="soft" className="h-11 shrink-0">
          {m.saveStep}
        </SubmitButton>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
