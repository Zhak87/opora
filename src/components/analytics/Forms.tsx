"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createNote, deleteNote, generateReport, updateNote } from "@/lib/analytics-actions";
import { Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { ConfirmForm } from "../ConfirmForm";
import { useMsg } from "@/i18n/client";
import { NOTE_KINDS, REPORT_PERIODS, analyticsMessages } from "@/i18n/analytics";
import type { Note } from "@/lib/analytics";

const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";
const select = "h-11 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";

export function GenerateForm({ client, period }: { client: string; period: number }) {
  const [state, action] = useActionState(generateReport, undefined);
  const m = useMsg(analyticsMessages).generate;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="client" value={client} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block">
          <span className="mb-2 block text-sm text-ink-soft">{m.period}</span>
          <select name="period" defaultValue={period} className={`${select} w-full sm:w-44`}>
            {REPORT_PERIODS.map((p) => (
              <option key={p} value={p}>
                {m.periods[p]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton pendingText={m.pending} className="h-11">
          {m.submit}
        </SubmitButton>
      </div>
      <p className="text-xs leading-relaxed text-ink-faint">{m.hint}</p>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

function KindSelect({ value }: { value: string }) {
  const m = useMsg(analyticsMessages).notes;
  return (
    <select name="kind" defaultValue={value} aria-label={m.kind} className={select}>
      {NOTE_KINDS.map((k) => (
        <option key={k} value={k}>
          {m.kinds[k]}
        </option>
      ))}
    </select>
  );
}

export function NoteForm({ client, session, kind = "note" }: { client: string; session?: string; kind?: Note["kind"] }) {
  const [state, action] = useActionState(createNote, undefined);
  const m = useMsg(analyticsMessages);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="client" value={client} />
      {session && <input type="hidden" name="session" value={session} />}
      <textarea name="body" rows={3} maxLength={8000} required placeholder={m.notes.placeholder} aria-label={m.notes.title} className={area} />
      <div className="flex flex-wrap items-center gap-2">
        <KindSelect value={kind} />
        <SubmitButton variant="soft" className="h-11">
          {m.notes.add}
        </SubmitButton>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

const TONE: Record<Note["kind"], string> = {
  note: "bg-sand text-ink-soft",
  hypothesis: "bg-lilac-soft text-lilac-deep",
  session: "bg-mist text-sky-deep",
  plan: "bg-sage-soft text-sage-deep",
};

// Одна заметка: просмотр, правка на месте, удаление с подтверждением.
export function NoteItem({ note, date, sessionLabel }: { note: Note; date: string; sessionLabel?: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(updateNote, undefined);
  const m = useMsg(analyticsMessages).notes;
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);
  return (
    <li className="rounded-2xl border border-line/70 bg-paper/80 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-0.5 ${TONE[note.kind]}`}>{m.kinds[note.kind]}</span>
        <span className="text-ink-faint">
          {date}
          {note.updated_at !== note.created_at && ` · ${m.edited}`}
          {sessionLabel && ` · ${sessionLabel}`}
        </span>
      </div>
      {editing ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="note" value={note.id} />
          <textarea name="body" rows={4} maxLength={8000} required defaultValue={note.body} aria-label={m.edit} className={area} />
          <div className="flex flex-wrap items-center gap-2">
            <KindSelect value={note.kind} />
            <SubmitButton variant="soft" className="h-11">
              {m.save}
            </SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full px-4 text-sm text-ink-soft hover:bg-sand/60 hover:text-ink">
              {m.cancel}
            </button>
          </div>
          {state?.error && <Notice tone="error">{state.error}</Notice>}
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{note.body}</p>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-9 rounded-full px-3 text-sm text-ink-soft transition hover:bg-sand/60 hover:text-ink"
            >
              {m.edit}
            </button>
            <ConfirmForm action={deleteNote} question={m.removeConfirm} hidden={{ note: note.id }}>
              <button className="h-9 rounded-full px-3 text-sm text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.remove}</button>
            </ConfirmForm>
          </div>
        </>
      )}
    </li>
  );
}
