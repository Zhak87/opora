"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { bookSession, rescheduleSession } from "@/lib/session-actions";
import { Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { scheduleMessages } from "@/i18n/schedule";
import { careMessages } from "@/i18n/care";
import { proLabels } from "@/i18n/pro";
import { SCOPES } from "@/lib/pro";
import type { Slot } from "@/lib/sessions";

// Выбор свободного окна: сначала день, потом время. Время показывается в поясе браузера.
function Picker({ slots, value, onChange }: { slots: Slot[]; value: string; onChange: (v: string) => void }) {
  const locale = useLocale();
  const m = useMsg(scheduleMessages).book;
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.starts_at).toLocaleDateString("en-CA");
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots]);
  const [picked, setDay] = useState("");
  // Дни и часы зависят от пояса браузера, поэтому рисуем их только в браузере.
  const [tz, setTz] = useState("");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"), []);

  if (!days.length) return <p className="rounded-2xl bg-sand/50 px-4 py-6 text-center text-sm text-ink-soft">{m.noSlots}</p>;
  if (!tz) return <div className="h-40 animate-pulse rounded-2xl bg-sand/40" />;
  const day = picked || days[0][0];
  const current = days.find(([k]) => k === day)?.[1] ?? [];
  return (
    <div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {days.map(([key, list]) => {
          const d = new Date(list[0].starts_at);
          const active = key === day;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDay(key)}
              className={`flex min-w-[72px] snap-start flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                active ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-sand-deep"
              }`}
            >
              <span className={`text-xs ${active ? "text-paper/70" : "text-ink-faint"}`}>{d.toLocaleDateString(INTL[locale], { weekday: "short" })}</span>
              <span className="font-serif text-[20px] leading-tight">{d.getDate()}</span>
              <span className={`text-[11px] ${active ? "text-paper/70" : "text-ink-faint"}`}>{d.toLocaleDateString(INTL[locale], { month: "short" })}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {current.map((s) => {
          const active = value === s.starts_at;
          return (
            <button
              key={s.starts_at}
              type="button"
              onClick={() => onChange(s.starts_at)}
              aria-pressed={active}
              className={`h-11 rounded-xl border text-[15px] transition ${
                active ? "border-sage bg-sage-soft text-ink" : "border-line bg-paper text-ink-soft hover:border-sand-deep hover:text-ink"
              }`}
            >
              {new Date(s.starts_at).toLocaleTimeString(INTL[locale], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
            </button>
          );
        })}
      </div>
      {tz && <p className="mt-3 text-xs text-ink-faint">{m.tzNote(tz)}</p>}
    </div>
  );
}

export function BookForm({
  psychologist,
  slots,
  formats,
  firstTime,
}: {
  psychologist: string;
  slots: Slot[];
  formats: string[];
  firstTime: boolean;
}) {
  const [state, action] = useActionState(bookSession, undefined);
  const [slot, setSlot] = useState("");
  const m = useMsg(scheduleMessages).book;
  const care = useMsg(careMessages);
  const labels = useMsg(proLabels);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="psychologist" value={psychologist} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="first" value={firstTime ? "1" : "0"} />
      <div>
        <p className="mb-3 text-[15px] font-medium text-ink">{m.chooseTime}</p>
        <Picker slots={slots} value={slot} onChange={setSlot} />
      </div>
      {formats.length > 1 && (
        <div>
          <p className="mb-2 text-[15px] font-medium text-ink">{m.format}</p>
          <div className="flex gap-2">
            {formats.map((f, i) => (
              <label key={f} className="cursor-pointer">
                <input type="radio" name="format" value={f} defaultChecked={i === 0} className="peer sr-only" />
                <span className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink-soft transition peer-checked:border-lilac peer-checked:bg-lilac-soft peer-checked:text-ink">
                  {labels.formats[f as keyof typeof labels.formats] ?? f}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {formats.length === 1 && <input type="hidden" name="format" value={formats[0]} />}
      {firstTime && (
        <div className="space-y-4">
          <p className="rounded-2xl bg-mist/60 px-4 py-3 text-sm leading-relaxed text-sky-deep">{m.firstTime}</p>
          <div>
            <p className="text-[15px] font-medium text-ink">{care.invite.chooseShare}</p>
            <p className="mt-0.5 text-sm text-ink-faint">{care.invite.shareHint}</p>
            <div className="mt-3 space-y-2">
              {SCOPES.map((s) => (
                <label key={s} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line/70 bg-paper px-4 py-3 transition has-[:checked]:border-sage has-[:checked]:bg-sage-soft/50">
                  <input type="checkbox" name="scopes" value={s} className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-ink" />
                  <span>
                    <span className="block text-[15px] text-ink">{care.scopes[s].title}</span>
                    <span className="block text-sm leading-relaxed text-ink-soft">{care.scopes[s].text}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand/60 p-4 text-[13px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="understand" required className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-ink" />
            {care.invite.understand}
          </label>
        </div>
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {slots.length > 0 && (
        <SubmitButton className="w-full" pendingText={m.confirming}>
          {slot ? `${m.confirm} · ${new Date(slot).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : m.confirm}
        </SubmitButton>
      )}
    </form>
  );
}

export function RescheduleForm({ session, slots }: { session: string; slots: Slot[] }) {
  const [state, action] = useActionState(rescheduleSession, undefined);
  const [slot, setSlot] = useState("");
  const m = useMsg(scheduleMessages);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="slot" value={slot} />
      <Picker slots={slots} value={slot} onChange={setSlot} />
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {slots.length > 0 && (
        <SubmitButton className="w-full" pendingText={m.book.confirming}>
          {m.care.reschedule}
        </SubmitButton>
      )}
    </form>
  );
}
