"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/plan-actions";
import { buttonStyles } from "../ui";
import { useMsg } from "@/i18n/client";
import { planMessages } from "@/i18n/plan";

export function CreatePlanButton({ label, goTo, variant = "primary" }: { label?: string; goTo?: string; variant?: "primary" | "soft" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [stage, setStage] = useState(0);
  const router = useRouter();
  const m = useMsg(planMessages).create;
  const STAGES = m.stages;

  useEffect(() => {
    if (!pending) return;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(id);
  }, [pending, STAGES.length]);

  const run = () =>
    start(async () => {
      setError("");
      const r = await createPlan();
      if ("error" in r) setError(r.error);
      else if (goTo) router.push(goTo);
      else router.refresh();
    });

  if (pending)
    return (
      <div className="flex items-center gap-4" role="status">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute h-10 w-10 animate-breathe rounded-full bg-lilac-soft [animation-duration:3s]" />
          <span className="absolute h-5 w-5 animate-breathe rounded-full bg-paper [animation-duration:3s] [animation-delay:-1.5s]" />
        </span>
        <span key={stage} className="animate-fade text-[15px] text-ink-soft">
          {STAGES[stage]}
        </span>
      </div>
    );

  return (
    <div>
      <button onClick={run} className={`${buttonStyles[variant]} w-full sm:w-auto`}>
        {label ?? m.label}
      </button>
      {error && <p className="mt-3 text-sm text-[#94594a]">{error}</p>}
    </div>
  );
}
