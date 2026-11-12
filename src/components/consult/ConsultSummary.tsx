"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { completeSession } from "@/lib/session-actions";
import { generateDraft, saveDraft } from "@/lib/consult/draft-actions";
import type { Draft } from "@/lib/consult/assistant";
import { useMsg } from "@/i18n/client";
import { consultMessages } from "@/i18n/consult";
import { scheduleMessages } from "@/i18n/schedule";
import { Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";

// Итоги встречи в два шага. Сверху — приватный черновик психолога (ИИ или вручную), снизу — то, что увидит клиент.
// Клиент получает итоги и задания только после нажатия «Завершить встречу» / «Сохранить итоги».

const KEYS = ["topics", "agreements", "tasks", "next", "gaps"] as const;
const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";

const toText = (items: Draft[keyof Draft]) => items.map((i) => (i.assumption ? `~ ${i.text}` : i.text)).join("\n");

export function ConsultSummary({
  session,
  draft: initialDraft,
  summary,
  tasks,
  completed,
  ai,
  hasTranscript,
  autoGenerate,
  keepNote,
}: {
  session: string;
  draft: Draft | null;
  summary: string;
  tasks: string;
  completed: boolean;
  ai: boolean;
  hasTranscript: boolean;
  autoGenerate: boolean;
  keepNote: string | null;
}) {
  const m = useMsg(consultMessages).draft;
  const sm = useMsg(scheduleMessages);
  const [genState, genAction, generating] = useActionState(generateDraft, undefined);
  const [saveState, saveAction] = useActionState(saveDraft, undefined);
  const [publishState, publishAction] = useActionState(completeSession, undefined);
  const [fields, setFields] = useState(() => Object.fromEntries(KEYS.map((k) => [k, initialDraft ? toText(initialDraft[k]) : ""])) as Record<(typeof KEYS)[number], string>);
  const [clientSummary, setClientSummary] = useState(summary);
  const [clientTasks, setClientTasks] = useState(tasks);
  const [autoTried, setAutoTried] = useState(false);

  // Новый черновик от ИИ заменяет поля (психолог видит и правит его до публикации).
  useEffect(() => {
    if (genState?.draft) setFields(Object.fromEntries(KEYS.map((k) => [k, toText(genState.draft![k])])) as typeof fields);
  }, [genState]);

  // После завершения звонка черновик готовится сам, если включён ИИ и черновика ещё нет.
  useEffect(() => {
    if (!autoGenerate || autoTried || !ai || initialDraft || completed) return;
    setAutoTried(true);
    const fd = new FormData();
    fd.set("session", session);
    startTransition(() => genAction(fd));
  }, [autoGenerate, autoTried, ai, initialDraft, completed, session, genAction]);

  const transfer = () => {
    const plain = (k: (typeof KEYS)[number]) =>
      fields[k]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("~"));
    const sum = [...plain("topics"), ...plain("agreements")].map((l) => `• ${l}`).join("\n");
    const tsk = plain("tasks").map((l) => `• ${l}`).join("\n");
    if (sum) setClientSummary(sum);
    if (tsk) setClientTasks(tsk);
  };

  return (
    <div className="space-y-8" id="draft">
      <section className="space-y-4">
        <div>
          <h2 className="text-[17px] font-medium text-ink">{m.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{m.hint}</p>
          <p className="mt-1 text-xs text-ink-faint">{m.disclaimer}</p>
        </div>
        {ai ? (
          <form action={genAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="session" value={session} />
            <button disabled={generating} className="h-10 rounded-full bg-lilac-soft px-4 text-sm text-ink transition hover:bg-lilac-soft/70 disabled:opacity-50" data-generate>
              {generating ? m.generating : initialDraft || genState?.draft ? m.regenerate : m.generate}
            </button>
            {!hasTranscript && <span className="text-xs text-ink-faint">{m.noTranscript}</span>}
          </form>
        ) : (
          <p className="rounded-xl bg-sand/60 px-3 py-2 text-xs text-ink-soft">{m.aiOff}</p>
        )}
        {genState?.error && <Notice tone="error">{genState.error}</Notice>}
        <form action={saveAction} className="space-y-3" data-draft-form>
          <input type="hidden" name="session" value={session} />
          {KEYS.map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-sm text-ink-soft">{m[k]}</span>
              <textarea
                name={k}
                value={fields[k]}
                onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
                rows={k === "gaps" ? 2 : 3}
                placeholder={`${m.onePerLine}. ~ — ${m.assumption}`}
                className={area}
                data-draft-field={k}
              />
            </label>
          ))}
          {saveState?.error && <Notice tone="error">{saveState.error}</Notice>}
          {saveState?.ok && <Notice>{saveState.ok}</Notice>}
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="soft">{m.save}</SubmitButton>
            <button type="button" onClick={transfer} className="h-12 rounded-full px-5 text-sm text-sky-deep transition hover:bg-mist/60" data-transfer>
              {m.toPublish} ↓
            </button>
          </div>
          {keepNote && <p className="text-xs text-ink-faint">{keepNote}</p>}
        </form>
      </section>

      <form action={publishAction} className="space-y-4 border-t border-line/60 pt-6" id="summary" data-publish-form>
        <input type="hidden" name="session" value={session} />
        <p className="text-sm text-ink-soft">{sm.pro.summaryHint}</p>
        <label className="block">
          <span className="mb-2 block text-sm text-ink-soft">{sm.care.summary}</span>
          <textarea name="summary" value={clientSummary} onChange={(e) => setClientSummary(e.target.value)} rows={4} maxLength={4000} placeholder={sm.pro.summaryPlaceholder} className={area} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-ink-soft">{sm.care.tasks}</span>
          <textarea name="tasks" value={clientTasks} onChange={(e) => setClientTasks(e.target.value)} rows={3} maxLength={4000} placeholder={sm.pro.tasksPlaceholder} className={area} />
        </label>
        {publishState?.error && <Notice tone="error">{publishState.error}</Notice>}
        {publishState?.ok && <Notice>{publishState.ok}</Notice>}
        <SubmitButton>{completed ? sm.pro.saveNotes : sm.pro.complete}</SubmitButton>
      </form>
    </div>
  );
}
