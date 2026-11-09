"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, SendIcon, LeafIcon, TrashIcon } from "./icons";
import { Orb } from "./Orb";
import { Breathe } from "./Breathe";
import { MusicToggle } from "./Music";
import { SpeakButton } from "./SpeakButton";
import { VoiceMode } from "./VoiceMode";
import { CalmCard, CalmOverlay, type CalmTool } from "./CalmTools";
import { deleteConversation, saveVoice, undoLastMessage } from "@/lib/actions";
import { speech } from "@/lib/speech";
import type { VoiceSettings } from "@/lib/voices";
import { looksAnxious, looksLikeCrisis } from "@/lib/prompt";
import { useLocale } from "@/i18n/client";
import { chatMessages } from "@/i18n/chat";

// pending: реплика ещё не точно сохранена на сервере, отменять её пока нельзя.
type Message = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

export function Chat({
  conversationId,
  title,
  label,
  topic,
  initialMessages,
  voice: initialVoice,
}: {
  conversationId: string;
  title: string;
  topic?: string | null;
  label: string;
  initialMessages: Message[];
  voice: VoiceSettings;
}) {
  const locale = useLocale();
  const t = chatMessages[locale];
  const textRef = useRef({ t, locale });
  useEffect(() => {
    textRef.current = { t, locale };
  }, [t, locale]);
  const [voice, setVoice] = useState(initialVoice);
  const [talking, setTalking] = useState(false);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => () => speech.stop(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [showCrisis, setShowCrisis] = useState(() => initialMessages.some((m) => m.role === "user" && looksLikeCrisis(m.content)));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [undoing, setUndoing] = useState(false);
  // Упражнение при тревоге: какое открыто сейчас и для какой реплики карточку уже закрыли.
  const [calmTool, setCalmTool] = useState<CalmTool | null>(null);
  const [calmDismissed, setCalmDismissed] = useState<string | null>(null);
  const [afterCalm, setAfterCalm] = useState(false);

  const scrollDown = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  const send = useCallback(
    async (text?: string, viaVoice = false): Promise<string | null> => {
      const content = text?.trim();
      let reply: string | null = null;
      setBusy(true);
      const replyId = `a-${Date.now()}`;
      const userId = `u-${Date.now()}`;
      setAfterCalm(false);
      setMessages((prev) => [
        ...prev,
        ...(content ? [{ id: userId, role: "user" as const, content, pending: true }] : []),
        { id: replyId, role: "assistant" as const, content: "" },
      ]);
      if (content && looksLikeCrisis(content)) setShowCrisis(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: content, voice: viaVoice }),
          signal: controller.signal,
        });
        // Сервер отвечает только после того, как сохранил реплику: теперь её можно отменить.
        if (res.ok) setMessages((prev) => prev.map((m) => (m.id === userId ? { ...m, pending: false } : m)));
        if (!res.body) throw new Error("no body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: acc } : m)));
        }
        if (!acc.trim()) throw new Error("empty");
        reply = acc;
        if (voiceRef.current.auto && !viaVoice) speech.speak(replyId, acc, voiceRef.current, textRef.current.locale);
      } catch {
        if (controller.signal.aborted) return null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? { ...m, content: textRef.current.t.connectionLost }
              : m,
          ),
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
        if (!viaVoice) inputRef.current?.focus({ preventScroll: true });
      }
      return reply;
    },
    [conversationId],
  );

  // Отмена последней реплики: останавливаем ответ, удаляем реплику и ответ, текст возвращаем в поле ввода.
  const undo = async (id: string) => {
    if (undoing) return;
    setUndoing(true);
    speech.stop();
    if (abortRef.current) {
      abortRef.current.abort();
      // Даём серверу заметить обрыв, чтобы недописанный ответ не сохранился после удаления.
      await new Promise((r) => setTimeout(r, 600));
    }
    const r = await undoLastMessage(conversationId);
    setUndoing(false);
    if ("error" in r) {
      alert(r.error);
      return;
    }
    setMessages((prev) => {
      const i = prev.findIndex((m) => m.id === id);
      return i >= 0 ? prev.slice(0, i) : prev;
    });
    setInput(r.content);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const askVoice = useCallback((t: string) => send(t, true), [send]);
  const closeVoice = useCallback(() => setTalking(false), []);

  // Если последним было сообщение человека (например, из дневника), собеседник отвечает сам.
  useEffect(() => {
    scrollDown(false);
    if (autoStarted.current) return;
    autoStarted.current = true;
    const last = initialMessages[initialMessages.length - 1];
    if (last?.role === "user") send();
  }, [initialMessages, send, scrollDown]);

  useEffect(() => {
    scrollDown();
  }, [messages.length, scrollDown]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    speech.stop();
    if (voiceRef.current.auto) speech.unlock();
    send(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const empty = messages.length === 0;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastIsUser = messages[messages.length - 1]?.role === "user";
  // Сначала успокоиться, потом разговор: в теме «Тревога» до первой реплики и после тревожных сообщений.
  const calmKey = lastUser
    ? looksAnxious(lastUser.content) && !lastIsUser
      ? lastUser.id
      : null
    : topic === "anxiety"
      ? "topic"
      : null;
  const showCalm = !busy && !!calmKey && calmKey !== calmDismissed;

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-milk/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:px-6">
          <Link href="/talk" aria-label={t.back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-sand hover:text-ink">
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
            <p className="text-xs text-ink-faint">{label}</p>
          </div>
          <button
            onClick={() => {
              const next = { ...voice, auto: !voice.auto };
              setVoice(next);
              if (next.auto) speech.unlock();
              else speech.stop();
              saveVoice(next);
            }}
            aria-pressed={voice.auto}
            title={voice.auto ? t.autoOnTitle : t.autoOn}
            aria-label={voice.auto ? t.autoOff : t.autoOn}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${voice.auto ? "bg-lilac-soft text-lilac-deep" : "text-ink-soft hover:bg-sand hover:text-ink"}`}
          >
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 10v4h3.5L12 18V6L7.5 10z" />
              {voice.auto ? <path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10" /> : <path d="M16 10l4 4M20 10l-4 4" />}
            </svg>
          </button>
          <MusicToggle className="[&>span]:h-9 [&>span]:w-9 [&>span]:shadow-none [&>span]:bg-transparent" />
          <button
            onClick={() => setBreathing(true)}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-soft transition hover:bg-sage-soft hover:text-sage-deep"
          >
            <LeafIcon className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">{t.breathe}</span>
          </button>
          <form
            action={deleteConversation}
            onSubmit={(e) => {
              if (!confirm(t.confirmDelete)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={conversationId} />
            <input type="hidden" name="redirect" value="1" />
            <button type="submit" aria-label={t.delete} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#ffeeec] hover:text-[#c2453d]">
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-8 pt-8 sm:px-8">
          {empty && (
            <div className="flex animate-fade flex-col items-center pt-[8vh] text-center">
              <Orb size={150} face />
              <p className="mt-8 font-serif text-[26px] leading-snug text-ink">{t.emptyTitle}</p>
              <p className="mt-2 max-w-sm text-[15px] text-ink-soft">{t.emptyHint}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {t.starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border-2 border-sand-deep bg-paper/60 px-4 py-2 text-sm text-ink transition hover:-translate-y-0.5 hover:border-lilac hover:bg-paper"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-7">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex animate-rise flex-col items-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-[8px] bg-lilac-deep px-5 py-3.5 text-[15.5px] leading-relaxed text-paper shadow-soft">
                    {m.content}
                  </p>
                  {m.id === lastUser?.id && !m.pending && (
                    <button
                      type="button"
                      onClick={() => undo(m.id)}
                      disabled={undoing}
                      title={t.undoTitle}
                      className="mt-1 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-ink-faint transition hover:bg-sand/60 hover:text-ink disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M9 14L4 9l5-5" />
                        <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
                      </svg>
                      {t.undo}
                    </button>
                  )}
                </div>
              ) : (
                <div key={m.id} className="flex animate-rise gap-3.5">
                  <Orb size={34} still face className="-mt-1 hidden sm:block" />
                  {m.content ? (
                    <div className="min-w-0 max-w-[92%]">
                      <p className="whitespace-pre-wrap rounded-[24px] rounded-bl-[8px] bg-paper px-5 py-3.5 text-[16px] leading-[1.6] text-ink shadow-soft">{m.content}</p>
                      {!(busy && m.id === messages[messages.length - 1]?.id) && (
                        <SpeakButton id={m.id} text={m.content} voice={voice} className="-ml-3 mt-1.5" />
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 pt-1 text-sm text-ink-faint" aria-live="polite">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:200ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:400ms]" />
                      <span className="sr-only">{t.thinking}</span>
                    </p>
                  )}
                </div>
              ),
            )}
          </div>

          {showCalm && (
            <CalmCard
              onPick={(tool) => {
                setCalmTool(tool);
                setCalmDismissed(calmKey);
              }}
              onSkip={() => {
                setCalmDismissed(calmKey);
                inputRef.current?.focus();
              }}
            />
          )}
          {afterCalm && !busy && (
            <div className="mt-6 flex justify-end animate-rise">
              <button
                onClick={() => send(t.calmAfter)}
                className="rounded-full border-2 border-sand-deep bg-paper/60 px-4 py-2 text-sm text-ink transition hover:-translate-y-0.5 hover:border-lilac hover:bg-paper"
              >
                {t.calmAfter}
              </button>
            </div>
          )}

          {showCrisis && (
            <aside className="mt-8 animate-rise rounded-[24px] border border-lilac/50 bg-lilac-soft/70 p-5 text-[14.5px] leading-relaxed text-ink">
              <p className="font-medium">{t.crisisTitle}</p>
              <p className="mt-1 text-ink-soft">
                {t.crisisText}
              </p>
              <ul className="mt-3 space-y-1">
                <li><a href="tel:112" className="underline-offset-4 hover:underline">112</a> — {t.crisisEmergency}</li>
                <li><a href="tel:88002000122" className="underline-offset-4 hover:underline">8-800-2000-122</a> — {t.crisisRu}</li>
                <li><a href="tel:150" className="underline-offset-4 hover:underline">150</a> — {t.crisisKz}</li>
              </ul>
              <button onClick={() => setShowCrisis(false)} className="mt-3 text-xs text-ink-faint hover:text-ink">
                {t.hide}
              </button>
            </aside>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      <div className="bg-gradient-to-t from-milk via-milk/95 to-milk/0 pb-[env(safe-area-inset-bottom)]">
        <form onSubmit={submit} className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3 sm:px-8 sm:py-5">
          <label className="sr-only" htmlFor="chat-input">{t.inputLabel}</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            className="max-h-[200px] min-h-[52px] flex-1 resize-none rounded-[20px] border-2 border-transparent bg-paper px-5 py-[13px] text-[16px] leading-relaxed text-ink shadow-soft outline-none transition placeholder:text-ink-faint focus:border-lilac-deep/50 focus:ring-4 focus:ring-lilac-soft"
          />
          {input.trim() ? (
            <button
              type="submit"
              disabled={busy}
              aria-label={t.send}
              className="flex h-[52px] w-[52px] shrink-0 animate-fade items-center justify-center rounded-[18px] bg-ink text-paper shadow-soft transition-all duration-300 hover:bg-lilac-deep active:scale-90 disabled:bg-sand-deep disabled:text-paper"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                speech.unlock();
                setTalking(true);
              }}
              aria-label={t.voice}
              title={t.voice}
              className="relative flex h-[52px] w-[52px] shrink-0 animate-fade items-center justify-center rounded-[18px] bg-ink text-paper shadow-soft transition-all duration-300 hover:scale-105 hover:bg-lilac-deep active:scale-90 disabled:opacity-50"
            >
              <span className="absolute inset-0 animate-breathe rounded-[18px] bg-lilac-deep/30 [animation-duration:4s]" aria-hidden />
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h1M8 8v8M12 5v14M16 8v8M20 12h-1" />
              </svg>
            </button>
          )}
        </form>
        <p className="hidden pb-3 text-center text-[11px] text-ink-faint sm:block">
          {t.disclaimer}
        </p>
      </div>

      {breathing && <Breathe onClose={() => setBreathing(false)} />}
      {calmTool === "breath" && (
        <Breathe
          onClose={() => {
            setCalmTool(null);
            setAfterCalm(true);
          }}
        />
      )}
      {calmTool && calmTool !== "breath" && (
        <CalmOverlay
          tool={calmTool}
          onClose={() => {
            setCalmTool(null);
            setAfterCalm(true);
          }}
        />
      )}
      {talking && <VoiceMode voice={voice} ask={askVoice} onClose={closeVoice} />}
    </div>
  );
}
