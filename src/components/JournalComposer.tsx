"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addJournalEntry } from "@/lib/actions";
import { journalKinds, type JournalKind } from "@/lib/content";
import { useLocale } from "@/i18n/client";
import { journal } from "@/i18n/journal";
import { SubmitButton } from "./SubmitButton";
import { toneBg } from "./ui";

export function JournalComposer({ question }: { question?: string }) {
  const locale = useLocale();
  const m = journal[locale];
  const kinds = journalKinds(locale);
  const [state, action] = useActionState(addJournalEntry, undefined);
  const [kind, setKind] = useState<JournalKind>("thought");
  const [text, setText] = useState(question ? `${question}\n\n` : "");
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state && "ok" in state) {
      setText("");
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    if (question && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [question]);

  return (
    <form action={action} className="rounded-[28px] border border-line/70 bg-paper/85 p-4 shadow-soft sm:p-6">
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {(Object.keys(kinds) as JournalKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition-all duration-300 ${
              kind === k ? `${toneBg[kinds[k].tone]} text-ink` : "text-ink-soft hover:bg-sand/50"
            }`}
          >
            {kinds[k].label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor="journal-text" className="sr-only">{m.entry}</label>
      <textarea
        id="journal-text"
        ref={ref}
        name="content"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={m.placeholders[kind]}
        rows={5}
        className="w-full resize-none rounded-2xl bg-transparent px-2 py-2 font-serif text-[17px] leading-[1.7] text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="px-2 text-sm text-sage-deep" aria-live="polite">
          {saved ? m.saved : state && "error" in state ? <span className="text-[#94594a]">{state.error}</span> : ""}
        </p>
        <SubmitButton pendingText={m.saving} className="h-11">
          {m.save}
        </SubmitButton>
      </div>
    </form>
  );
}
