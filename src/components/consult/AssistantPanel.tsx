"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createNote } from "@/lib/analytics-actions";
import { MicRecorder } from "@/lib/recorder";
import { useMsg } from "@/i18n/client";
import { consultMessages } from "@/i18n/consult";
import type { AssistantMessage } from "@/lib/consult/assistant";

// Панель помощника психолога во время звонка. Клиент её не видит: данные приходят только психологу этой встречи.
// Диктовка вопроса и озвучка ответа включают «приватный режим»: микрофон звонка выключается, расшифровка
// на это время останавливается.

export type PrepData = {
  client: string;
  ai: boolean;
  agreements: { date: string; summary: string | null; tasks: string | null }[];
  notes: { date: string; body: string }[];
  questions: string[];
  materials: string[];
};

type Tab = "prep" | "live" | "ask" | "note";

export function AssistantPanel({
  session,
  prep,
  live,
  onPrivate,
  onClose,
}: {
  session: string;
  prep: PrepData;
  live: boolean;
  onPrivate: (on: boolean) => void;
  onClose: () => void;
}) {
  const m = useMsg(consultMessages).panel;
  const [tab, setTab] = useState<Tab>("prep");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [heard, setHeard] = useState(0);
  const [ai, setAi] = useState(prep.ai);
  const [busy, setBusy] = useState<"ask" | "prep" | "dictate" | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [playing, setPlaying] = useState<number | null>(null);
  const lastId = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<MicRecorder | null>(null);

  const add = useCallback((list: AssistantMessage[]) => {
    if (!list.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      const next = [...prev, ...list.filter((x) => !seen.has(x.id))].sort((a, b) => a.id - b.id);
      lastId.current = next.at(-1)?.id ?? lastId.current;
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/consult/${session}/assistant?after=${lastId.current}${live ? "&live=1" : ""}`, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { ai: boolean; messages: AssistantMessage[]; heard: number; hintFailed?: boolean };
        setAi(data.ai);
        setHeard(data.heard);
        add(data.messages);
        if (data.hintFailed) setFailed(true);
      } catch {}
    };
    run();
    const t = setInterval(run, 8_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session, live, add]);

  const post = async (body: object, kind: "ask" | "prep") => {
    setBusy(kind);
    setFailed(false);
    try {
      const res = await fetch(`/api/consult/${session}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      add(((await res.json()) as { messages: AssistantMessage[] }).messages);
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const ask = async () => {
    const q = text.trim();
    if (!q) return;
    if (await post({ kind: "ask", text: q }, "ask")) setText("");
  };

  const dictate = async () => {
    if (rec.current) {
      const blob = rec.current.stop();
      rec.current = null;
      await finishDictation(blob);
      return;
    }
    onPrivate(true);
    setBusy("dictate");
    const r = new MicRecorder();
    rec.current = r;
    try {
      await r.start({
        onSilence: async () => {
          if (rec.current !== r) return;
          rec.current = null;
          await finishDictation(r.stop());
        },
      });
    } catch {
      rec.current = null;
      setBusy(null);
      onPrivate(false);
    }
  };

  const finishDictation = async (blob: Blob | null) => {
    try {
      if (blob) {
        const res = await fetch("/api/transcribe", { method: "POST", body: blob, headers: { "Content-Type": "audio/wav" } });
        const said = res.ok ? String(((await res.json()) as { text?: string }).text ?? "") : "";
        if (said) setText((t) => (t ? `${t} ${said}` : said));
        else if (!res.ok) setFailed(true);
      }
    } finally {
      setBusy(null);
      onPrivate(false);
    }
  };

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
    onPrivate(false);
  }, [onPrivate]);

  const listen = async (msg: AssistantMessage) => {
    if (playing === msg.id) return stopAudio();
    stopAudio();
    setPlaying(msg.id);
    onPrivate(true);
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: msg.body.slice(0, 900) }) });
      if (!res.ok) throw new Error();
      const el = new Audio(URL.createObjectURL(await res.blob()));
      audio.current = el;
      el.onended = stopAudio;
      await el.play();
    } catch {
      setFailed(true);
      stopAudio();
    }
  };

  useEffect(
    () => () => {
      rec.current?.cancel();
      audio.current?.pause();
    },
    [],
  );

  const prepMsgs = messages.filter((x) => x.kind === "prep");
  const hints = messages.filter((x) => x.kind === "hint");
  const dialog = messages.filter((x) => x.kind === "question" || x.kind === "answer");
  const tabs: [Tab, string][] = [
    ["prep", m.prep],
    ["live", m.live],
    ["ask", m.ask],
    ["note", m.note],
  ];

  return (
    <div className="flex h-full flex-col" data-assistant-panel>
      <div className="flex items-center gap-1 border-b border-line/70 px-3 py-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`h-9 rounded-full px-3 text-sm transition ${tab === k ? "bg-lilac-soft text-ink" : "text-ink-soft hover:bg-sand/60"}`}
            aria-pressed={tab === k}
          >
            {label}
            {k === "live" && hints.length > 0 && <span className="ml-1 text-xs text-lilac-deep">{hints.length}</span>}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto h-9 rounded-full px-3 text-sm text-ink-faint hover:bg-sand/60" aria-label={m.hide}>
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[14px] leading-relaxed text-ink">
        {!ai && <p className="rounded-xl bg-sand/60 px-3 py-2 text-xs text-ink-soft">{m.aiOff}</p>}
        {failed && <p className="rounded-xl bg-[#fff4ec] px-3 py-2 text-xs text-ink">{m.failed}</p>}

        {tab === "prep" && (
          <>
            <Section title={m.agreements}>
              {prep.agreements.length ? (
                prep.agreements.map((a, i) => (
                  <div key={i} className="rounded-xl bg-sage-soft/40 px-3 py-2">
                    <p className="text-xs text-ink-faint">{a.date}</p>
                    {a.summary && <p className="whitespace-pre-line">{a.summary}</p>}
                    {a.tasks && <p className="mt-1 whitespace-pre-line text-ink-soft">{a.tasks}</p>}
                  </div>
                ))
              ) : (
                <Empty>{m.noAgreements}</Empty>
              )}
            </Section>
            <Section title={m.notes}>
              {prep.notes.length ? (
                prep.notes.map((n, i) => (
                  <p key={i} className="whitespace-pre-line rounded-xl bg-sand/40 px-3 py-2">
                    <span className="block text-xs text-ink-faint">{n.date}</span>
                    {n.body}
                  </p>
                ))
              ) : (
                <Empty>{m.noNotes}</Empty>
              )}
            </Section>
            <Section title={m.questions}>
              {prep.questions.length > 0 && (
                <ol className="list-decimal space-y-1 pl-5">
                  {prep.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              )}
              {prepMsgs.map((x) => (
                <p key={x.id} className="whitespace-pre-line rounded-xl bg-lilac-soft/40 px-3 py-2">
                  {x.body}
                </p>
              ))}
              <p className="text-xs text-ink-faint">{prep.materials.length ? m.material(prep.materials.join(", ")) : m.noMaterial}</p>
              {ai && (
                <button onClick={() => post({ kind: "prep" }, "prep")} disabled={busy !== null} className="h-9 rounded-full bg-lilac-soft px-4 text-sm text-ink disabled:opacity-50">
                  {busy === "prep" ? m.aiPrepping : m.aiPrep}
                </button>
              )}
            </Section>
          </>
        )}

        {tab === "live" && (
          <>
            <p className="text-xs text-ink-faint">{m.heard(heard)}</p>
            {hints.length ? (
              [...hints].reverse().map((x) => (
                <p key={x.id} className="whitespace-pre-line rounded-xl bg-mist/60 px-3 py-2" data-hint>
                  {x.body}
                </p>
              ))
            ) : (
              <Empty>{m.liveEmpty}</Empty>
            )}
          </>
        )}

        {tab === "ask" && (
          <>
            <p className="text-xs text-ink-faint">{m.private}</p>
            <div className="space-y-2">
              {dialog.map((x) => (
                <div key={x.id} className={x.kind === "question" ? "ml-8 rounded-xl bg-sand/60 px-3 py-2" : "mr-4 rounded-xl bg-lilac-soft/50 px-3 py-2"} data-dialog={x.kind}>
                  <p className="whitespace-pre-line">{x.body}</p>
                  {x.kind === "answer" && (
                    <button onClick={() => listen(x)} className="mt-1 text-xs text-sky-deep hover:text-ink" data-listen>
                      {playing === x.id ? m.stopListen : m.listen}
                    </button>
                  )}
                </div>
              ))}
              {busy === "ask" && <p className="text-xs text-ink-faint">{m.thinking}</p>}
            </div>
            {dialog.some((x) => x.kind === "answer") && <p className="text-xs text-ink-faint">{m.headphones}</p>}
            {busy === "dictate" && <p className="rounded-xl bg-lilac-soft/60 px-3 py-2 text-xs text-ink" data-dictating>{m.listening}</p>}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={m.askPlaceholder}
              disabled={!ai}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-lilac-deep/60"
              data-ask-input
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={ask} disabled={!ai || busy !== null || !text.trim()} className="h-10 rounded-full bg-ink px-4 text-sm text-paper disabled:opacity-40" data-ask-send>
                {m.send}
              </button>
              <button onClick={dictate} disabled={!ai || (busy !== null && busy !== "dictate")} className="h-10 rounded-full border border-line px-4 text-sm text-ink disabled:opacity-40" data-ask-voice>
                {busy === "dictate" ? m.done : m.voice}
              </button>
            </div>
          </>
        )}

        {tab === "note" && <QuickNote session={session} client={prep.client} />}
      </div>
    </div>
  );
}

function QuickNote({ session, client }: { session: string; client: string }) {
  const m = useMsg(consultMessages).panel;
  const [state, action, pending] = useActionState(createNote, undefined);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (state?.ok) setKey((k) => k + 1);
  }, [state]);
  return (
    <form action={action} className="space-y-2" key={key}>
      <input type="hidden" name="client" value={client} />
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="kind" value="session" />
      <textarea name="body" rows={6} maxLength={8000} placeholder={m.notePlaceholder} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-lilac-deep/60" />
      {state?.ok && <p className="text-xs text-sage-deep">{m.noteSaved}</p>}
      {state?.error && <p className="text-xs text-[#a2392f]">{state.error}</p>}
      <button disabled={pending} className="h-10 rounded-full bg-ink px-4 text-sm text-paper disabled:opacity-50">
        {m.noteSave}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-[0.12em] text-ink-faint">{title}</h3>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-ink-faint">{children}</p>;
