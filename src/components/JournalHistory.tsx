"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { journal } from "@/i18n/journal";
import { dayKey } from "@/lib/time";
import { journalKinds, JOURNAL_KINDS, type JournalKind } from "@/lib/content";
import { deleteJournalEntry, reflectOnJournal } from "@/lib/actions";
import { ConfirmForm } from "./ConfirmForm";
import { JournalIcon, SparkIcon, TrashIcon } from "./icons";
import styles from "./Journal.module.css";

type Entry = { id: string; kind: string; content: string; created_at: string };

function entryKind(kind: string): JournalKind {
  return Object.hasOwn(JOURNAL_KINDS, kind) ? kind as JournalKind : "thought";
}

export function JournalHistory({ entries, timeZone, canReflectOnWeek }: { entries: Entry[]; timeZone: string; canReflectOnWeek: boolean }) {
  const locale = useLocale();
  const m = journal[locale];
  const kinds = journalKinds(locale);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const search = query.trim().toLocaleLowerCase(INTL[locale]);
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone });
  const time = new Intl.DateTimeFormat(INTL[locale], { hour: "2-digit", minute: "2-digit", timeZone });
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (kind && entryKind(entry.kind) !== kind) continue;
    if (search && !entry.content.toLocaleLowerCase(INTL[locale]).includes(search)) continue;
    const day = dayKey(entry.created_at, timeZone);
    const items = groups.get(day);
    if (items) items.push(entry);
    else groups.set(day, [entry]);
  }

  return (
    <section className={styles.history} aria-labelledby="journal-history">
      <h2 id="journal-history">{m.history}</h2>
      {entries.length > 0 && (
        <div className={styles.filters}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.search} aria-label={m.search} />
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={m.category}>
            <option value="">{m.allKinds}</option>
            {Object.entries(kinds).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
        </div>
      )}

      {groups.size === 0 ? (
        <p className={styles.empty} role="status">
          {entries.length === 0 && <JournalIcon className="size-6" />}
          {entries.length === 0 ? m.empty : m.noResults}
        </p>
      ) : (
        <div className={styles.groups}>
          {[...groups].map(([day, items]) => (
            <section key={day}>
              <h3>{date.format(new Date(items[0].created_at))}</h3>
              <ul className={styles.entries}>
                {items.map((entry) => (
                  <li key={entry.id}>
                    <details className={styles.note}>
                      <summary>
                        <span className={styles.noteMeta}>
                          <span>{kinds[entryKind(entry.kind)].label}</span>
                          <time dateTime={entry.created_at}>{time.format(new Date(entry.created_at))}</time>
                        </span>
                        <span className={styles.preview}>{entry.content}</span>
                      </summary>
                      <p className={styles.noteText}>{entry.content}</p>
                      <div className={styles.noteActions}>
                        <form action={reflectOnJournal}>
                          <input type="hidden" name="id" value={entry.id} />
                          <button type="submit" className={styles.quiet}><SparkIcon className="size-4" /> {m.reflect}</button>
                        </form>
                        <ConfirmForm action={deleteJournalEntry} hidden={{ id: entry.id }} question={m.confirmDelete}>
                          <button type="submit" className={styles.delete} aria-label={m.deleteEntry} title={m.deleteEntry}><TrashIcon className="size-[18px]" /></button>
                        </ConfirmForm>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {canReflectOnWeek && (
        <form action={reflectOnJournal} className={styles.week}>
          <button type="submit" className={styles.quiet}><SparkIcon className="size-4" /> {m.reflectWeek}</button>
        </form>
      )}
    </section>
  );
}
