"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { panelMessages } from "@/i18n/admin";
import type { Insights } from "@/lib/admin";

// Разбор цифр через ИИ по кнопке: запрос платный, поэтому сам не запускается.
export function InsightsCard() {
  const m = panelMessages[useLocale()];
  const [state, setState] = useState<"idle" | "wait" | "done">("idle");
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setState("wait");
    setError(null);
    try {
      const res = await fetch("/api/admin/insights", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "failed");
      setData(body as Insights);
      setState("done");
    } catch (e) {
      setError(m.aiErrors[e instanceof Error ? e.message : "failed"] ?? m.aiErrors.failed);
      setState(data ? "done" : "idle");
    }
  };

  const block = (title: string, items: string[], tone: string) =>
    items.length > 0 && (
      <div className={`rounded-[22px] p-5 ${tone}`}>
        <p className="mb-2 text-sm font-medium text-ink">{title}</p>
        <ul className="space-y-2 text-[14.5px] leading-relaxed text-ink">
          {items.map((x) => (
            <li key={x} className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="rounded-[30px] bg-gradient-to-br from-paper to-lilac-soft/60 p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium text-ink">{m.ai}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">{m.aiHint}</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={state === "wait"}
          className="h-11 shrink-0 rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-lilac-deep disabled:opacity-60"
        >
          {state === "wait" ? m.aiWait : data ? m.aiAgain : m.aiRun}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-[#c2453d]" role="alert">{error}</p>}
      {data && (
        <div className="mt-5 space-y-4" aria-live="polite">
          {data.summary && <p className="text-[16px] leading-relaxed text-ink">{data.summary}</p>}
          <div className="grid gap-4 lg:grid-cols-3">
            {block(m.aiGood, data.good, "bg-sage-soft")}
            {block(m.aiProblems, data.problems, "bg-peach-soft")}
            {block(m.aiActions, data.actions, "bg-paper")}
          </div>
        </div>
      )}
    </section>
  );
}
