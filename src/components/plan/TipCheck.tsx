"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleTip } from "@/lib/plan-actions";
import { streak, type PlanTip } from "@/lib/plan";
import { chime } from "@/lib/chime";
import { useMsg } from "@/i18n/client";
import { planMessages } from "@/i18n/plan";

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TipCheck({ planId, index, tip, days, compact = false }: { planId: string; index: number; tip: PlanTip; days: string[]; compact?: boolean }) {
  const [today, setToday] = useState<string | null>(null);
  const [list, setList] = useState(days);
  const [, start] = useTransition();
  const m = useMsg(planMessages).tip;

  useEffect(() => setToday(localDay()), []);
  useEffect(() => setList(days), [days]);

  const done = today ? list.includes(today) : false;
  const count = today ? streak(list, today) : 0;

  const toggle = () => {
    if (!today) return;
    const next = !done;
    if (next) chime(79, 0.05);
    setList((l) => (next ? [...l, today] : l.filter((d) => d !== today)));
    start(() => toggleTip(planId, index, today, next));
  };

  return (
    <div className={`flex gap-4 ${compact ? "" : "rounded-[24px] border border-line/70 bg-paper/80 p-5 shadow-soft"}`}>
      <button
        onClick={toggle}
        aria-pressed={done}
        aria-label={done ? m.unmark : m.mark}
        className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
          done ? "scale-105 border-sage-deep bg-sage-deep text-paper shadow-soft" : "border-line bg-paper text-transparent hover:border-sage-deep"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 24, strokeDashoffset: done ? 0 : 24, transition: "stroke-dashoffset .5s ease" }} />
        </svg>
        {done && <span className="absolute inset-0 rounded-full border border-sage-deep" style={{ animation: "ripple 0.9s ease-out" }} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-medium text-ink">{tip.title}</p>
        {!compact && tip.why && <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">{tip.why}</p>}
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
          <span className="text-ink-faint">{m.today}</span>
          {tip.action}
        </p>
        {count > 0 && (
          <p className="mt-2 text-xs text-sage-deep">
            {done ? m.doneToday : ""}
            {m.streak(count)}
          </p>
        )}
      </div>
    </div>
  );
}
