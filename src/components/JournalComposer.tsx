"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addJournalEntry } from "@/lib/actions";
import { journalKinds, type JournalKind } from "@/lib/content";
import { useLocale } from "@/i18n/client";
import { journal } from "@/i18n/journal";
import styles from "./Journal.module.css";

export function JournalComposer({ question }: { question?: string }) {
  const locale = useLocale();
  const m = journal[locale];
  const kinds = journalKinds(locale);
  const [state, action, pending] = useActionState(addJournalEntry, undefined);
  const [kind, setKind] = useState<JournalKind>("thought");
  const [text, setText] = useState(question ? `${question}\n\n` : "");
  const ref = useRef<HTMLTextAreaElement>(null);
  const saved = !!state && "ok" in state && !text;

  useEffect(() => {
    if (state && "ok" in state) setText("");
  }, [state]);

  useEffect(() => {
    const field = ref.current;
    if (!question || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [question]);

  return (
    <section className={styles.editor} aria-labelledby="journal-new">
      <h2 id="journal-new"><label htmlFor="journal-text">{m.newEntry}</label></h2>
      <form action={action} className={styles.composer}>
        <label className={styles.category}>
          {m.category}
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as JournalKind)}>
            {Object.entries(kinds).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
        </label>
        <textarea
          id="journal-text"
          ref={ref}
          name="content"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={m.placeholders[kind]}
          rows={7}
          maxLength={10000}
          readOnly={pending}
        />
        <div className={styles.saveRow}>
          <p aria-live="polite">
            {saved ? m.saved : !pending && state && "error" in state ? <span className={styles.error}>{state.error}</span> : ""}
          </p>
          <button type="submit" className={styles.save} disabled={pending || !text.trim()}>
            {pending ? m.saving : m.save}
          </button>
        </div>
      </form>
    </section>
  );
}
