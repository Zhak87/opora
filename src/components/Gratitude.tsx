"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useMsg } from "@/i18n/client";
import { hopeGratitude } from "@/i18n/hope";
import { addJournalEntry } from "@/lib/actions";
import { ArrowIcon, CheckIcon, JournalIcon } from "./icons";
import styles from "./Gratitude.module.css";

export function Gratitude({ describedBy }: { describedBy: string }) {
  const m = useMsg(hopeGratitude);
  const [result, action, pending] = useActionState(addJournalEntry, undefined);
  const [dismissed, setDismissed] = useState<typeof result>();
  const [items, setItems] = useState(["", "", ""]);
  const confirmation = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const saved = !!result && "ok" in result && result !== dismissed;

  useEffect(() => {
    if (saved) confirmation.current?.focus();
    else if (dismissed) firstField.current?.focus();
  }, [saved, dismissed]);

  if (saved) {
    return (
      <div ref={confirmation} tabIndex={-1} className={styles.confirmation}>
        <div role="status" className={styles.saved}>
          <span aria-hidden="true"><CheckIcon /></span>
          <div>
            <p>{m.savedInJournal}</p>
            <p>{m.thanks}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Link href="/journal" className={styles.openJournal}>{m.openJournal} <ArrowIcon /></Link>
          <button type="button" className={styles.again} onClick={() => {
            setItems(["", "", ""]);
            setDismissed(result);
          }}>
            {m.again}
          </button>
        </div>
      </div>
    );
  }

  const content = items
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => `${index + 1}. ${text}`)
    .join("\n");

  return (
    <form action={action} aria-describedby={describedBy} className={styles.form}>
      <input type="hidden" name="kind" value="gratitude" />
      <input type="hidden" name="content" value={content ? `${m.header}\n${content}` : ""} />
      {items.map((value, index) => (
        <label key={index} className={styles.field}>
          <span className={styles.number} aria-hidden="true">{index + 1}</span>
          <input
            ref={index === 0 ? firstField : undefined}
            aria-label={m.placeholders[index]}
            value={value}
            onChange={(event) => setItems((previous) => previous.map((item, i) => i === index ? event.target.value : item))}
            placeholder={m.placeholders[index]}
            maxLength={300}
            readOnly={pending}
          />
        </label>
      ))}
      <button type="submit" disabled={pending || !content} className={styles.submit}>
        <JournalIcon /> {pending ? m.saving : m.save}
      </button>
      {result && "error" in result && <p className={styles.error} role="alert">{result.error}</p>}
    </form>
  );
}
