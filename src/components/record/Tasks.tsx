"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { assignTask, cancelTask, replyTask, setTaskDone } from "@/lib/record-actions";
import type { Task } from "@/lib/records";
import { INTL } from "@/i18n/config";
import { useLocale, useMsg } from "@/i18n/client";
import { recordMessages } from "@/i18n/record";
import { Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { ConfirmForm } from "../ConfirmForm";
import { CheckIcon } from "../icons";

// Задания клиента и ветка обратной связи под каждым. Одни и те же карточки для психолога (role="pro") и клиента.

const input =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";
const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";

type Role = "pro" | "client";

function useDates(tz: string) {
  const intl = INTL[useLocale()];
  return {
    // Срок — просто дата без времени: показываем её одинаково в любом поясе.
    day: (d: string) => new Intl.DateTimeFormat(intl, { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${d}T00:00:00Z`)),
    stamp: (iso: string) => new Intl.DateTimeFormat(intl, { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)),
  };
}

function ReplyForm({ task }: { task: string }) {
  const m = useMsg(recordMessages).tasks;
  const [state, action] = useActionState(replyTask, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-2" data-task-reply>
      <input type="hidden" name="task" value={task} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="body" maxLength={2000} required placeholder={m.replyPlaceholder} aria-label={m.replyPlaceholder} className={input} />
        <SubmitButton variant="soft" className="h-11 shrink-0 px-4 text-sm">
          {m.send}
        </SubmitButton>
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

function DoneForm({ task }: { task: string }) {
  const m = useMsg(recordMessages).tasks;
  const [state, action] = useActionState(setTaskDone, undefined);
  return (
    <form action={action} className="space-y-2" data-task-done>
      <input type="hidden" name="task" value={task} />
      <input type="hidden" name="done" value="1" />
      <textarea name="feedback" rows={2} maxLength={2000} placeholder={m.feedbackPlaceholder} aria-label={m.feedbackPlaceholder} className={area} />
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="h-11 px-5 text-sm">
        <CheckIcon className="h-4 w-4" /> {m.markDone}
      </SubmitButton>
    </form>
  );
}

function ReopenForm({ task }: { task: string }) {
  const m = useMsg(recordMessages).tasks;
  const [, action] = useActionState(setTaskDone, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="task" value={task} />
      <input type="hidden" name="done" value="0" />
      <button className="text-xs text-ink-faint underline-offset-2 hover:text-ink hover:underline">{m.reopen}</button>
    </form>
  );
}

export function TaskItem({ task, role, me, tz }: { task: Task; role: Role; me: string; tz: string }) {
  const m = useMsg(recordMessages).tasks;
  const { day, stamp } = useDates(tz);
  const done = task.status === "done";
  return (
    <li className="rounded-2xl border border-line/70 bg-paper p-4" data-task={task.id} data-task-status={task.status}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-sage text-paper" : "border-2 border-line"}`}
          aria-hidden
        >
          {done && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug ${done ? "text-ink-soft" : "text-ink"}`}>{task.title}</p>
          {task.details && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{task.details}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
            <span className={`rounded-full px-2 py-0.5 ${done ? "bg-sage-soft text-sage-deep" : "bg-mist text-sky-deep"}`}>{done ? m.done : m.open}</span>
            {task.due_on && !done && <span>{m.dueOn(day(task.due_on))}</span>}
            {done && task.done_at && <span>{stamp(task.done_at)}</span>}
            {role === "client" && done && <ReopenForm task={task.id} />}
          </div>
        </div>
        {role === "pro" && (
          <ConfirmForm action={cancelTask} question={m.removeConfirm} hidden={{ task: task.id }}>
            <button className="h-8 rounded-full px-3 text-xs text-ink-faint transition hover:bg-[#ffeeec] hover:text-[#c2453d]">{m.remove}</button>
          </ConfirmForm>
        )}
      </div>
      {task.replies.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-line/70 pl-3 sm:ml-9" data-task-thread>
          {task.replies.map((r) => {
            const mine = r.author_id === me;
            const who = mine ? m.you : r.author_id === task.client_id ? m.client : m.psychologist;
            return (
              <li key={r.id} className="text-sm leading-relaxed">
                <span className={`text-xs ${mine ? "text-ink-faint" : "text-lilac-deep"}`}>
                  {who} · {stamp(r.created_at)}
                </span>
                <span className="block whitespace-pre-line text-ink">{r.body}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 sm:ml-9">{role === "client" && !done ? <DoneForm task={task.id} /> : <ReplyForm task={task.id} />}</div>
    </li>
  );
}

export function TaskList({ tasks, role, me, tz, empty }: { tasks: Task[]; role: Role; me: string; tz: string; empty?: string }) {
  const m = useMsg(recordMessages).tasks;
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  if (!tasks.length) return empty === "" ? null : <p className="text-sm text-ink-faint">{empty ?? m.empty}</p>;
  // Психологу важнее всего свежие ответы, поэтому выполненные у него раскрыты; у клиента они свёрнуты.
  return (
    <div className="space-y-3">
      {open.length > 0 && (
        <ul className="space-y-3">
          {open.map((t) => (
            <TaskItem key={t.id} task={t} role={role} me={me} tz={tz} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details open={role === "pro" || open.length === 0} className="group">
          <summary className="cursor-pointer list-none py-1 text-sm text-ink-soft hover:text-ink">{m.doneList(done.length)}</summary>
          <ul className="mt-2 space-y-3">
            {done.map((t) => (
              <TaskItem key={t.id} task={t} role={role} me={me} tz={tz} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Назначить задание. suggestions — строки из приватного черновика ИИ: одно касание подставляет текст в поле.
export function AssignForm({ client, session, suggestions = [] }: { client: string; session?: string; suggestions?: string[] }) {
  const m = useMsg(recordMessages).tasks;
  const [state, action] = useActionState(assignTask, undefined);
  const [title, setTitle] = useState("");
  const [more, setMore] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      setTitle("");
      setMore(false);
    }
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3" data-assign-form>
      <input type="hidden" name="client" value={client} />
      {session && <input type="hidden" name="session" value={session} />}
      {suggestions.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          {m.suggested}
          {suggestions.slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => setTitle(s.slice(0, 200))} className="rounded-full bg-lilac-soft px-3 py-1 text-left text-xs text-ink transition hover:bg-lilac-soft/70">
              {s.length > 60 ? `${s.slice(0, 60)}…` : s}
            </button>
          ))}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setMore(true)}
          maxLength={200}
          required
          placeholder={m.namePlaceholder}
          aria-label={m.name}
          className={input}
        />
        <SubmitButton variant="soft" className="h-11 shrink-0 px-5 text-sm">
          {m.add}
        </SubmitButton>
      </div>
      {(more || title) && (
        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <textarea name="details" rows={2} maxLength={4000} placeholder={m.details} aria-label={m.details} className={area} />
          <label className="block">
            <span className="mb-1 block text-xs text-ink-faint">{m.due}</span>
            <input type="date" name="due" className={input} />
          </label>
        </div>
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
    </form>
  );
}
