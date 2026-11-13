"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { finishSession, saveSessionNote, shareSummary } from "@/lib/record-actions";
import { TEMPLATE_FIELDS, NOTE_TEMPLATES, type NoteField, type NoteTemplate, type SessionNote, type Task } from "@/lib/records";
import type { Draft } from "@/lib/consult/assistant";
import { MicRecorder } from "@/lib/recorder";
import { INTL } from "@/i18n/config";
import { useLocale, useMsg } from "@/i18n/client";
import { recordMessages } from "@/i18n/record";
import { scheduleMessages } from "@/i18n/schedule";
import { Notice, buttonStyles } from "../ui";
import { ShieldIcon } from "../icons";
import { AiDraft, type DraftTransfer } from "../consult/ConsultSummary";
import { AssignForm, TaskList } from "./Tasks";

// Запись после встречи на одном экране, три блока с разным доступом:
// 1) личная заметка — только психолог; 2) итог — клиент видит после «Поделиться»; 3) задания — видят оба.
// Заметка и черновик итога сохраняются сами. Между блоками ничего не копируется автоматически.

const input =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";
const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";

type Values = {
  template: NoteTemplate;
  topic: string;
  state: number | null;
  fields: Partial<Record<NoteField, string>>;
  hypotheses: string;
  nextQuestions: string;
  summaryDraft: string;
};

export type AiProps = { draft: Draft | null; ai: boolean; hasTranscript: boolean; autoGenerate: boolean; keepNote: string | null };

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Есть ли в итоге заметный кусок личной заметки (психолог мог скопировать его вручную).
function overlapsPrivate(summary: string, v: Values) {
  const text = squash(summary);
  const parts = [v.hypotheses, v.nextQuestions, ...Object.values(v.fields)]
    .flatMap((p) => (p ?? "").split(/\n|(?<=[.!?…])\s+/))
    .map(squash)
    .filter((p) => p.length >= 25);
  return parts.some((p) => text.includes(p));
}

// Диктовка заметки голосом: распознаётся речь психолога после встречи, сама встреча не записывается.
function Dictate({ onText }: { onText: (t: string) => void }) {
  const m = useMsg(recordMessages).note;
  const rec = useRef<MicRecorder | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = async (blob: Blob | null) => {
    setOn(false);
    if (!blob) return;
    setBusy(true);
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: blob, headers: { "Content-Type": "audio/wav" } });
      const said = res.ok ? String(((await res.json()) as { text?: string }).text ?? "").trim() : "";
      if (said) onText(said);
      else if (!res.ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setFailed(false);
    if (rec.current) {
      const r = rec.current;
      rec.current = null;
      await finish(r.stop());
      return;
    }
    const r = new MicRecorder();
    rec.current = r;
    setOn(true);
    try {
      await r.start({
        onSilence: async () => {
          if (rec.current !== r) return;
          rec.current = null;
          await finish(r.stop());
        },
      });
    } catch {
      rec.current = null;
      setOn(false);
      setFailed(true);
    }
  };

  useEffect(() => () => rec.current?.cancel(), []);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        title={m.dictateHint}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition disabled:opacity-50 ${on ? "bg-lilac-deep text-paper" : "bg-sand/70 text-ink-soft hover:bg-sand hover:text-ink"}`}
        data-dictate
      >
        <span className={`h-2 w-2 rounded-full ${on ? "animate-pulse bg-paper" : "bg-lilac-deep"}`} />
        {on ? m.listening : busy ? m.saving : m.dictate}
      </button>
      {failed && <span className="text-xs text-[#b23b33]">{m.dictateFailed}</span>}
    </span>
  );
}

export function SessionRecord({
  session,
  client,
  me,
  tz,
  note,
  shared,
  canFinish,
  canAssign,
  tasks,
  aiDraft,
}: {
  session: string;
  client: string;
  me: string;
  tz: string;
  note: SessionNote | null;
  // То, что уже видит клиент.
  shared: { summary: string | null; sharedAt: string | null; editedAt: string | null };
  canFinish: boolean;
  canAssign: boolean;
  tasks: Task[];
  aiDraft: AiProps | null;
}) {
  const m = useMsg(recordMessages);
  const sm = useMsg(scheduleMessages);
  const intl = INTL[useLocale()];
  const router = useRouter();

  const [v, setV] = useState<Values>(() => ({
    template: note?.template ?? "free",
    topic: note?.topic ?? "",
    state: note?.client_state ?? null,
    fields: note?.fields ?? {},
    hypotheses: note?.hypotheses ?? "",
    nextQuestions: note?.next_questions ?? "",
    summaryDraft: note?.summary_draft ?? shared.summary ?? "",
  }));
  const latest = useRef(v);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [savedAt, setSavedAt] = useState("");

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = latest.current;
    setSaveState("saving");
    const res = await saveSessionNote({ session, ...snapshot }).catch(() => ({ ok: false }));
    if (!res.ok) {
      setSaveState("failed");
      return false;
    }
    if (latest.current === snapshot) dirty.current = false;
    setSavedAt(new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    setSaveState("saved");
    return true;
  }, [session, intl]);

  const change = useCallback(
    (patch: Partial<Values>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      dirty.current = true;
      setV(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, 1200);
    },
    [save],
  );
  const setField = (k: NoteField, value: string) => change({ fields: { ...latest.current.fields, [k]: value } });
  const append = (cur: string, add: string) => (cur.trim() ? `${cur.trimEnd()}\n${add}` : add);

  // Несохранённое не теряется при закрытии вкладки: браузер переспросит.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (dirty.current) void saveSessionNote({ session, ...latest.current }).catch(() => {});
    };
  }, [session]);

  /* ---------- Итог ---------- */
  const [sharedText, setSharedText] = useState(shared.summary ?? "");
  const [isShared, setIsShared] = useState(Boolean(shared.sharedAt));
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareState, setShareState] = useState<{ ok?: string; error?: string }>();
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const draft = v.summaryDraft.trim();
  const unsent = isShared && draft !== sharedText.trim();
  const date = (iso: string) => new Intl.DateTimeFormat(intl, { timeZone: tz, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const openPreview = () => {
    setShareState(undefined);
    if (!draft) {
      setShareState({ error: m.errors.emptySummary });
      summaryRef.current?.focus();
      return;
    }
    setPreview(true);
  };
  const confirmShare = async () => {
    setSending(true);
    if (dirty.current) await save();
    const res: { ok?: string; error?: string } | undefined = await shareSummary(session, draft).catch(() => ({ error: m.errors.generic }));
    setSending(false);
    setPreview(false);
    setShareState(res);
    if (res?.ok) {
      setSharedText(draft);
      setIsShared(true);
      router.refresh();
    }
  };

  /* ---------- Черновик ИИ ---------- */
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const transfer = (t: DraftTransfer) => {
    const patch: Partial<Values> = {};
    if (t.summary) patch.summaryDraft = append(latest.current.summaryDraft, t.summary);
    if (t.next && !latest.current.nextQuestions.trim()) patch.nextQuestions = t.next;
    if (Object.keys(patch).length) change(patch);
    setSuggestions(t.tasks);
    document.getElementById("summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [finishState, finishAction, finishing] = useActionState(finishSession, undefined);

  return (
    <div className="space-y-5" id="draft" data-session-record>
      {/* 1. Личная заметка */}
      <section className="rounded-[30px] border border-line bg-sand/40 p-6 sm:p-7" data-block="note">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-medium text-ink">
              <ShieldIcon className="h-[18px] w-[18px] text-ink-soft" /> {m.note.title}
              <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-normal text-ink-soft">{m.note.lock}</span>
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{m.note.lead}</p>
          </div>
          <p className="min-h-5 text-xs text-ink-faint" role="status" data-save-state={saveState}>
            {saveState === "saving" && m.note.saving}
            {saveState === "saved" && m.note.saved(savedAt)}
            {saveState === "failed" && (
              <>
                <span className="text-[#b23b33]">{m.note.saveFailed}</span>{" "}
                <button type="button" onClick={save} className="underline">
                  {m.note.retry}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={m.note.template}>
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={v.template === t}
                onClick={() => change({ template: t })}
                className={`h-9 rounded-full px-4 text-sm transition ${v.template === t ? "bg-ink text-paper" : "bg-paper text-ink-soft hover:text-ink"}`}
                data-template={t}
              >
                {m.note.templates[t]}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-soft">{m.note.topic}</span>
            <input value={v.topic} onChange={(e) => change({ topic: e.target.value })} maxLength={300} placeholder={m.note.topicPlaceholder} className={input} data-note="topic" />
          </label>

          <div>
            <p className="mb-1.5 text-sm text-ink-soft">
              {m.note.state} <span className="text-xs text-ink-faint">· {m.note.stateHint}</span>
            </p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={m.note.state}>
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={v.state === n}
                  onClick={() => change({ state: v.state === n ? null : n })}
                  className={`h-9 w-9 rounded-full text-sm transition ${v.state === n ? "bg-lilac-deep text-paper" : "bg-paper text-ink-soft hover:text-ink"}`}
                  data-state={n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {TEMPLATE_FIELDS[v.template].map((k) => (
            <div key={k}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor={`note-${k}`} className="text-sm text-ink-soft">
                  {m.note.fields[k]}
                </label>
                <Dictate onText={(t) => setField(k, append(latest.current.fields[k] ?? "", t))} />
              </div>
              <textarea
                id={`note-${k}`}
                value={v.fields[k] ?? ""}
                onChange={(e) => setField(k, e.target.value)}
                rows={k === "body" ? 5 : 2}
                maxLength={6000}
                className={area}
                data-note={k}
              />
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{m.note.hypotheses}</span>
              <textarea value={v.hypotheses} onChange={(e) => change({ hypotheses: e.target.value })} rows={3} maxLength={4000} className={area} data-note="hypotheses" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-soft">{m.note.nextQuestions}</span>
              <textarea value={v.nextQuestions} onChange={(e) => change({ nextQuestions: e.target.value })} rows={3} maxLength={4000} className={area} data-note="next" />
            </label>
          </div>
          <p className="text-xs leading-relaxed text-ink-faint">{m.note.legal}</p>
        </div>
      </section>

      {aiDraft && (aiDraft.ai || aiDraft.draft) && (
        <details className="rounded-[30px] border border-line bg-sand/40 p-6 sm:p-7" open={aiDraft.autoGenerate || undefined} data-block="ai-draft">
          <summary className="cursor-pointer text-[15px] font-medium text-ink">
            {m.aiDraft} <span className="ml-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-normal text-ink-soft">{m.note.lock}</span>
          </summary>
          <div className="mt-5">
            <AiDraft session={session} {...aiDraft} onTransfer={transfer} />
          </div>
        </details>
      )}

      {/* 2. Итог для клиента */}
      <section className="rounded-[30px] border-2 border-sage/50 bg-paper p-6 shadow-soft sm:p-7" id="summary" data-block="summary">
        <div className="mb-4">
          <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-medium text-ink">
            {m.summary.title}
            <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-normal text-sage-deep">{m.summary.badge}</span>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{m.summary.lead}</p>
        </div>
        <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          {m.summary.phrasesTitle}:
          {m.summary.phrases.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                change({ summaryDraft: append(latest.current.summaryDraft, p) });
                summaryRef.current?.focus();
              }}
              className="rounded-full bg-sage-soft/70 px-3 py-1 text-xs text-sage-deep transition hover:bg-sage-soft"
            >
              {p.trim()}…
            </button>
          ))}
        </p>
        <textarea
          ref={summaryRef}
          value={v.summaryDraft}
          onChange={(e) => change({ summaryDraft: e.target.value })}
          rows={5}
          maxLength={4000}
          placeholder={m.summary.placeholder}
          aria-label={m.summary.title}
          className={area}
          data-summary
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={openPreview} disabled={isShared && !unsent} className={`${buttonStyles.primary} h-11 px-5 text-sm`} data-share>
            {isShared ? m.summary.shareEdit : m.summary.share}
          </button>
          <p className="text-xs text-ink-faint" data-share-status={isShared ? (unsent ? "unsent" : "shared") : "none"}>
            {!isShared && m.summary.notShared}
            {isShared && !unsent && shared.sharedAt && (
              <span className="text-sage-deep">
                {m.summary.sharedAt(date(shared.sharedAt))}
                {shared.editedAt ? `, ${m.summary.editedAt(date(shared.editedAt))}` : ""}
              </span>
            )}
            {isShared && !unsent && !shared.sharedAt && <span className="text-sage-deep">{m.summary.sharedNow}</span>}
            {unsent && <span className="text-[#b0702a]">{m.summary.unsent}</span>}
          </p>
        </div>
        {shareState?.error && <div className="mt-3"><Notice tone="error">{shareState.error}</Notice></div>}
        {shareState?.ok && <div className="mt-3"><Notice>{shareState.ok}</Notice></div>}
        {canFinish && !isShared && (
          <form action={finishAction} className="mt-5 border-t border-line/60 pt-4">
            <input type="hidden" name="session" value={session} />
            <button disabled={finishing} className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline disabled:opacity-50" data-finish>
              {m.finish.button}
            </button>
            <p className="mt-1 text-xs text-ink-faint">{m.finish.hint}</p>
            {finishState?.error && <p className="mt-2 text-xs text-[#b23b33]">{finishState.error}</p>}
          </form>
        )}
        {finishState?.ok && <div className="mt-3"><Notice>{finishState.ok}</Notice></div>}
      </section>

      {/* 3. Задания */}
      <section className="rounded-[30px] bg-paper p-6 shadow-soft sm:p-7" id="tasks" data-block="tasks">
        <div className="mb-4">
          <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-medium text-ink">
            {m.tasks.title}
            <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-normal text-sage-deep">{m.summary.badge}</span>
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{m.tasks.lead}</p>
        </div>
        <div className="space-y-4">
          {canAssign && <AssignForm client={client} session={session} suggestions={suggestions} />}
          <TaskList tasks={tasks} role="pro" me={me} tz={tz} empty={canAssign ? "" : undefined} />
        </div>
      </section>

      {/* Предпросмотр: итог так, как его увидит клиент, и только потом отправка. */}
      {preview &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={m.summary.previewTitle} data-preview>
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-paper p-6 shadow-lift sm:p-7">
            <h3 className="text-[17px] font-medium text-ink">{m.summary.previewTitle}</h3>
            <div className="mt-4 rounded-xl bg-sage-soft/50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-sage-deep">
                {sm.care.summary}
                {isShared && <span className="ml-2 normal-case tracking-normal text-ink-faint">· {m.summary.edited}</span>}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{draft}</p>
            </div>
            {overlapsPrivate(draft, v) && (
              <p className="mt-3 rounded-2xl bg-[#fff4e0] px-4 py-3 text-sm leading-relaxed text-[#8a5a12]" role="alert" data-overlap>
                {m.summary.overlapWarning}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">{isShared ? m.summary.editNote : m.summary.firstNote}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPreview(false)} disabled={sending} className={`${buttonStyles.ghost} h-11 px-5 text-sm`}>
                {m.summary.back}
              </button>
              <button type="button" onClick={confirmShare} disabled={sending} className={`${buttonStyles.primary} h-11 px-5 text-sm`} data-share-confirm>
                {sending ? m.summary.sending : m.summary.confirm}
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
