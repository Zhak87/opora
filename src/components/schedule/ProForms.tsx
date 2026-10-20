"use client";

import { useActionState, useState } from "react";
import {
  addTimeOff,
  completeSession,
  createSessionForClient,
  rescheduleSession,
  saveAvailability,
  saveBookingSettings,
} from "@/lib/session-actions";
import { Field, Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { PlusIcon, TrashIcon } from "../icons";
import { useMsg } from "@/i18n/client";
import { scheduleMessages, TIMEZONES } from "@/i18n/schedule";
import { proLabels } from "@/i18n/pro";
import { minutesToTime } from "@/lib/time";

const input =
  "h-11 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";
const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";

type Window = { start_min: number; end_min: number };

export function AvailabilityForm({ initial }: { initial: Record<number, Window[]> }) {
  const [state, action] = useActionState(saveAvailability, undefined);
  const m = useMsg(scheduleMessages);
  const [days, setDays] = useState(() =>
    Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, (initial[d] ?? []).map((w) => ({ a: minutesToTime(w.start_min), b: minutesToTime(w.end_min % 1440) }))])),
  );
  const update = (d: number, rows: { a: string; b: string }[]) => setDays((all) => ({ ...all, [d]: rows }));
  return (
    <form action={action} className="space-y-1">
      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
        <div key={d} className="flex flex-col gap-2 border-b border-line/60 py-3 last:border-0 sm:flex-row sm:items-start">
          <p className="w-32 shrink-0 pt-2.5 text-[15px] text-ink">{m.weekdaysLong[d - 1]}</p>
          <div className="flex-1 space-y-2">
            {days[d].length === 0 && <p className="pt-2.5 text-sm text-ink-faint">{m.pro.dayOff}</p>}
            {days[d].map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" name={`start-${d}`} value={row.a} step={900} required onChange={(e) => update(d, days[d].map((r, j) => (j === i ? { ...r, a: e.target.value } : r)))} className={input} aria-label={m.pro.from} />
                <span className="text-ink-faint">—</span>
                <input type="time" name={`end-${d}`} value={row.b} step={900} required onChange={(e) => update(d, days[d].map((r, j) => (j === i ? { ...r, b: e.target.value } : r)))} className={input} aria-label={m.pro.to} />
                <button type="button" onClick={() => update(d, days[d].filter((_, j) => j !== i))} aria-label={m.pro.remove} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint hover:bg-[#fbf1ec] hover:text-[#a0614f]">
                  <TrashIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => update(d, [...days[d], { a: "10:00", b: "18:00" }])}
            className="inline-flex h-10 items-center gap-1.5 self-start rounded-full px-3 text-sm text-ink-soft hover:bg-sand/60 hover:text-ink"
          >
            <PlusIcon className="h-4 w-4" /> {m.pro.addHours}
          </button>
        </div>
      ))}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <div className="pt-4">
        <SubmitButton>{m.pro.save}</SubmitButton>
      </div>
    </form>
  );
}

export function BookingSettingsForm({ tz, buffer, notice, horizon }: { tz: string; buffer: number; notice: number; horizon: number }) {
  const [state, action] = useActionState(saveBookingSettings, undefined);
  const m = useMsg(scheduleMessages).pro;
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.timezone}</span>
        <select name="timezone" defaultValue={tz} className={`${input} w-full`}>
          {TIMEZONES.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={m.buffer} name="buffer_minutes" type="number" min={0} max={60} defaultValue={buffer} />
        <Field label={m.notice} name="booking_notice_hours" type="number" min={0} max={168} defaultValue={notice} />
        <Field label={m.horizon} name="booking_horizon_days" type="number" min={1} max={90} defaultValue={horizon} />
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <SubmitButton variant="soft">{m.save}</SubmitButton>
    </form>
  );
}

export function TimeOffForm({ tz }: { tz: string }) {
  const [state, action] = useActionState(addTimeOff, undefined);
  const m = useMsg(scheduleMessages).pro;
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="tz" value={tz} />
      <label>
        <span className="mb-2 block text-sm text-ink-soft">{m.from}</span>
        <input type="date" name="from" required className={input} />
      </label>
      <label>
        <span className="mb-2 block text-sm text-ink-soft">{m.to}</span>
        <input type="date" name="to" className={input} />
      </label>
      <label className="flex-1">
        <span className="mb-2 block text-sm text-ink-soft">{m.timeOffNote}</span>
        <input name="note" maxLength={200} className={`${input} w-full`} />
      </label>
      <SubmitButton variant="soft" className="h-11">
        {m.timeOffAdd}
      </SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

export function NewSessionForm({ clients, tz, minutes, formats }: { clients: { id: string; name: string }[]; tz: string; minutes: number; formats: string[] }) {
  const [state, action] = useActionState(createSessionForClient, undefined);
  const m = useMsg(scheduleMessages).pro;
  const labels = useMsg(proLabels);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="tz" value={tz} />
      {clients.length === 1 ? (
        <input type="hidden" name="client" value={clients[0].id} />
      ) : (
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm text-ink-soft">{m.client}</span>
          <select name="client" required className={`${input} w-full`}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span className="mb-2 block text-sm text-ink-soft">{m.start}</span>
        <input type="datetime-local" name="local" required step={900} className={`${input} w-full`} />
      </label>
      <Field label={m.duration} name="minutes" type="number" min={15} max={180} step={5} defaultValue={minutes} />
      {formats.length > 1 && (
        <label className="sm:col-span-2">
          <select name="format" className={`${input} w-full`}>
            {formats.map((f) => (
              <option key={f} value={f}>
                {labels.formats[f as keyof typeof labels.formats] ?? f}
              </option>
            ))}
          </select>
        </label>
      )}
      {state?.error && (
        <div className="sm:col-span-2">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {state?.ok && (
        <div className="sm:col-span-2">
          <Notice>{state.ok}</Notice>
        </div>
      )}
      <div className="sm:col-span-2">
        <SubmitButton variant="soft">{m.create}</SubmitButton>
      </div>
    </form>
  );
}

export function MoveSessionForm({ session, tz, value }: { session: string; tz: string; value: string }) {
  const [state, action] = useActionState(rescheduleSession, undefined);
  const m = useMsg(scheduleMessages).pro;
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="tz" value={tz} />
      <input type="hidden" name="back" value="pro" />
      <label className="flex-1">
        <span className="mb-2 block text-sm text-ink-soft">{m.reschedule}</span>
        <input type="datetime-local" name="local" defaultValue={value} required step={900} className={`${input} w-full`} />
      </label>
      <SubmitButton variant="soft" className="h-11">
        {m.move}
      </SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

export function SummaryForm({ session, summary, tasks, completed }: { session: string; summary: string; tasks: string; completed: boolean }) {
  const [state, action] = useActionState(completeSession, undefined);
  const m = useMsg(scheduleMessages);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="session" value={session} />
      <p className="text-sm text-ink-soft">{m.pro.summaryHint}</p>
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.care.summary}</span>
        <textarea name="summary" defaultValue={summary} rows={4} maxLength={4000} placeholder={m.pro.summaryPlaceholder} className={area} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-ink-soft">{m.care.tasks}</span>
        <textarea name="tasks" defaultValue={tasks} rows={3} maxLength={4000} placeholder={m.pro.tasksPlaceholder} className={area} />
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <SubmitButton>{completed ? m.pro.saveNotes : m.pro.complete}</SubmitButton>
    </form>
  );
}
