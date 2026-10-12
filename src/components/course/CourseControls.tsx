"use client";

import { useState, useTransition } from "react";
import { setCourseEmail, stopCourse } from "@/lib/course-actions";
import { useMsg } from "@/i18n/client";
import { courseMessages } from "@/i18n/course";
import { buttonStyles } from "../ui";

export function EmailToggle({ courseId, on, email }: { courseId: string; on: boolean; email: string }) {
  const m = useMsg(courseMessages).overview;
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  const toggle = () => {
    const next = !value;
    setValue(next);
    start(() => setCourseEmail(courseId, next));
  };
  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-line/70 bg-gradient-to-br from-paper to-sand/60 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-ink shadow-soft" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-ink">{value ? m.emailOn : m.emailOff}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">{value ? m.emailOnHint(email) : m.emailOffHint}</span>
        <a href="/api/course/email-preview" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-sky-deep underline-offset-4 hover:underline">
          {m.preview}
        </a>
      </span>
      <button onClick={toggle} disabled={pending} className={`${value ? buttonStyles.soft : buttonStyles.primary} shrink-0`}>
        {value ? m.turnOff : m.turnOn}
      </button>
    </div>
  );
}

export function StopCourse({ courseId }: { courseId: string }) {
  const m = useMsg(courseMessages).overview;
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button onClick={() => setAsk(true)} className="text-sm text-ink-faint underline-offset-4 hover:text-ink hover:underline">
        {m.stop}
      </button>
    );
  return (
    <form action={stopCourse} className="animate-fade rounded-[22px] border border-line/70 bg-paper/80 p-5 text-left">
      <input type="hidden" name="id" value={courseId} />
      <p className="text-sm leading-relaxed text-ink-soft">{m.stopConfirm}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={buttonStyles.danger}>{m.stopYes}</button>
        <button type="button" onClick={() => setAsk(false)} className={buttonStyles.ghost}>
          {m.cancel}
        </button>
      </div>
    </form>
  );
}
