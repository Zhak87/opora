"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/course-actions";
import { COURSE_LENGTHS, type CourseLength } from "@/lib/course";
import { useMsg } from "@/i18n/client";
import { courseMessages } from "@/i18n/course";
import { buttonStyles } from "../ui";
import { CrisisHelp } from "./CrisisHelp";

export function CourseIntake({ topics, email, initialTopic }: { topics: { slug: string; title: string }[]; email: string; initialTopic?: string }) {
  const m = useMsg(courseMessages).intake;
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [goal, setGoal] = useState("");
  const [length, setLength] = useState<CourseLength>(30);
  const [mail, setMail] = useState(false);
  const [error, setError] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [stage, setStage] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!pending) return;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, m.stages.length - 1)), 5000);
    return () => clearInterval(id);
  }, [pending, m.stages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError("");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = await createCourse({ topic, goal, length, email: mail, tz });
      if ("crisis" in r) setCrisis(true);
      else if ("error" in r) setError(r.error);
      else {
        router.push("/course");
        router.refresh();
      }
    });
  };

  if (pending)
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center" role="status">
        <span className="relative mb-10 flex h-36 w-36 items-center justify-center" aria-hidden>
          <span className="absolute h-36 w-36 animate-breathe rounded-full bg-gradient-to-br from-mist via-lilac-soft to-sage-soft [animation-duration:4s]" />
          <span className="absolute h-20 w-20 animate-breathe rounded-full bg-paper/90 [animation-delay:-2s] [animation-duration:4s]" />
        </span>
        <p key={stage} className="animate-fade font-serif text-[22px] text-ink">
          {m.stages[stage]}
        </p>
        <div className="mt-6 flex gap-1.5">
          {m.stages.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i <= stage ? "w-6 bg-lilac" : "w-1.5 bg-line"}`} />
          ))}
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-10">
      {crisis && <CrisisHelp lead={m.crisisLead} onClose={() => setCrisis(false)} />}

      <ul className="stagger grid gap-3 sm:grid-cols-3">
        {m.how.map((h, i) => (
          <li key={h.title} className="rounded-[24px] border border-line/60 bg-paper/70 p-5">
            <span className={`mb-3 block h-2 w-8 rounded-full ${["bg-sky", "bg-lilac", "bg-sage"][i]}`} />
            <p className="text-[15px] font-medium text-ink">{h.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{h.text}</p>
          </li>
        ))}
      </ul>

      <fieldset>
        <legend className="mb-4 font-serif text-[22px] text-ink">{m.topicLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {[...topics, { slug: "", title: m.ownWords }].map((t) => (
            <button
              type="button"
              key={t.slug || "own"}
              onClick={() => setTopic(t.slug)}
              aria-pressed={topic === t.slug}
              className={`rounded-full px-4 py-2.5 text-[14.5px] transition-all duration-300 ${
                topic === t.slug ? "bg-ink text-paper shadow-soft" : "border border-line bg-paper/80 text-ink-soft hover:border-sand-deep hover:text-ink"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-serif text-[22px] text-ink">{m.goalLabel}</span>
        <span className="mb-4 block text-sm leading-relaxed text-ink-soft">{m.goalHint}</span>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={m.goalPlaceholder}
          className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
        />
      </label>

      <fieldset>
        <legend className="mb-4 font-serif text-[22px] text-ink">{m.lengthLabel}</legend>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {COURSE_LENGTHS.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setLength(l)}
              aria-pressed={length === l}
              className={`relative rounded-[22px] p-4 text-left transition-all duration-300 sm:p-5 ${
                length === l ? "bg-gradient-to-br from-lilac-soft to-mist shadow-soft ring-2 ring-lilac/60" : "border border-line bg-paper/80 hover:border-sand-deep"
              }`}
            >
              {l === 30 && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-sage px-2 py-0.5 text-[11px] text-paper">{m.recommended}</span>
              )}
              <span className="block text-[17px] font-medium text-ink">{m.lengths[l].title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{m.lengths[l].hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {email && (
        <label className="flex cursor-pointer items-start gap-4 rounded-[24px] border border-line/70 bg-gradient-to-br from-paper to-sand/60 p-5">
          <input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden
            className="mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full bg-line p-1 transition peer-checked:bg-sage peer-focus-visible:ring-4 peer-focus-visible:ring-mist [&>span]:transition peer-checked:[&>span]:translate-x-5"
          >
            <span className="h-5 w-5 rounded-full bg-paper shadow-soft" />
          </span>
          <span>
            <span className="block text-[15px] font-medium text-ink">{m.emailLabel}</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{m.emailHint(email)}</span>
          </span>
        </label>
      )}

      <div>
        <button className={`${buttonStyles.primary} h-14 w-full text-[16px] sm:w-auto sm:px-10`}>{m.submit}</button>
        {error && <p className="mt-3 text-sm text-[#94594a]">{error}</p>}
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">{m.disclaimer}</p>
      </div>
    </form>
  );
}
