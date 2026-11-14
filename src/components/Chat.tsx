"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowIcon, BackIcon, SendIcon, LeafIcon, TrashIcon, TalkIcon, MoreIcon } from "./icons";
import { Orb } from "./Orb";
import { Breathe } from "./Breathe";
import { MusicToggle } from "./Music";
import { SpeakButton } from "./SpeakButton";
import { VoiceMode } from "./VoiceMode";
import { CalmCard, CalmOverlay, type CalmTool } from "./CalmTools";
import { deleteConversation, rateConversation, saveVoice, undoLastMessage } from "@/lib/actions";
import { speech } from "@/lib/speech";
import type { VoiceSettings } from "@/lib/voices";
import { looksAnxious, looksLikeCrisis } from "@/lib/prompt";
import { useLocale } from "@/i18n/client";
import { chatMessages } from "@/i18n/chat";
import { gamesMessages } from "@/i18n/games";
import { PLACE_STEPS, isStep, splitStep, stepHref, visibleText, type StepCode } from "@/lib/steps";
import { sendEvent } from "./Track";
import styles from "./Chat.module.css";

// pending: реплика ещё не точно сохранена на сервере, отменять её пока нельзя.
// step: «следующий шаг», который собеседник предложил в этой реплике (кнопка под ответом).
type Message = { id: string; role: "user" | "assistant"; content: string; pending?: boolean; error?: string; step?: string | null };
type ReplyListener = (text: string, complete: boolean) => void;

// Оценку разговора спрашиваем, когда собеседник ответил хотя бы столько раз.
const RATE_AFTER = 3;

export function Chat({
  conversationId,
  title,
  label,
  topic,
  initialMessages,
  rating: initialRating,
  voice: initialVoice,
}: {
  conversationId: string;
  title: string;
  topic?: string | null;
  label: string;
  initialMessages: Message[];
  rating?: number | null;
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
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speech.stop();
    };
  }, []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [showCrisis, setShowCrisis] = useState(() => initialMessages.some((m) => m.role === "user" && looksLikeCrisis(m.content)));
  const scrollRef = useRef<HTMLDivElement>(null);
  const followReply = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const undoInFlight = useRef(false);
  const [undoing, setUndoing] = useState(false);
  // Упражнение при тревоге: какое открыто сейчас и для какой реплики карточку уже закрыли.
  const [calmTool, setCalmTool] = useState<CalmTool | null>(null);
  const [calmDismissed, setCalmDismissed] = useState<string | null>(null);
  const [afterCalm, setAfterCalm] = useState(false);
  // Оценка разговора: сохранённая раньше, поставленная сейчас или отложенная («не сейчас»).
  const [rating, setRating] = useState<number | null>(initialRating ?? null);
  const [justRated, setJustRated] = useState(false);
  const [rateHidden, setRateHidden] = useState(false);

  const send = useCallback(
    async (text?: string, onVoiceReply?: ReplyListener): Promise<string | null> => {
      if (abortRef.current || undoInFlight.current) return null;
      const controller = new AbortController();
      abortRef.current = controller;
      const content = text?.trim();
      const mayAutoPlay = !onVoiceReply && voiceRef.current.auto;
      if (content && !onVoiceReply) {
        speech.stop();
        if (mayAutoPlay) speech.unlock();
        inputRef.current?.focus({ preventScroll: true });
      }
      followReply.current = true;
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
      let playReply: ReturnType<typeof speech.stream> | undefined;
      const showError = (message: string, unsent = false) => {
        setMessages((prev) => prev.flatMap((m) => {
          if (unsent && m.id === userId) return [];
          return [m.id === replyId ? { ...m, error: message } : m];
        }));
        if (unsent && content && !onVoiceReply) setInput((draft) => draft || content);
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: content, voice: Boolean(onVoiceReply) }),
          signal: controller.signal,
        });
        const saved = res.headers.has("X-Opora-Message-Id");
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === userId ? { ...m, pending: false } : m)));
        }
        if (!res.ok) {
          const current = textRef.current.t;
          if (res.headers.get("Content-Type")?.startsWith("text/plain")) {
            const errorText = (await res.text()).trim() || current.connectionLost;
            showError(errorText);
          } else {
            await res.body?.cancel();
            if (!saved && [400, 401, 403, 404, 429, 500].includes(res.status)) {
              showError(res.status === 429 ? current.sendBusy : current.sendFailed, true);
            } else {
              showError(current.connectionLost);
            }
          }
          return null;
        }
        if (!res.body) throw new Error("no body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        const updateVoice = (shown: string, complete: boolean) => {
          if (!shown || !mounted.current || controller.signal.aborted) return;
          if (onVoiceReply) {
            onVoiceReply(shown, complete);
          } else if (mayAutoPlay && voiceRef.current.auto) {
            playReply ??= speech.stream(replyId, voiceRef.current, textRef.current.locale);
            playReply(shown, complete);
          }
        };
        let previous = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += decoder.decode(value, { stream: true });
            // Метку «следующий шаг» человек не видит и не слышит.
            const shown = visibleText(acc);
            if (shown === previous) continue;
            previous = shown;
            setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: shown } : m)));
            updateVoice(shown, false);
          }
          acc += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        const { text: clean, step } = splitStep(acc);
        if (!clean) throw new Error("empty");
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: clean, step } : m)));
        updateVoice(clean, true);
        return clean;
      } catch {
        if (speech.get().id === replyId) speech.stop();
        if (controller.signal.aborted) return null;
        showError(textRef.current.t.connectionLost);
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [conversationId],
  );

  // Отмена последней реплики: останавливаем ответ, удаляем реплику и ответ, текст возвращаем в поле ввода.
  const undo = async (id: string) => {
    if (undoInFlight.current) return;
    undoInFlight.current = true;
    setUndoing(true);
    speech.stop();
    if (abortRef.current) {
      abortRef.current.abort();
      // Даём серверу заметить обрыв, чтобы недописанный ответ не сохранился после удаления.
      await new Promise((r) => setTimeout(r, 600));
    }
    const r = await undoLastMessage(conversationId).catch(() => ({ error: t.undoFailed }));
    undoInFlight.current = false;
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

  const closeVoice = useCallback(() => setTalking(false), []);

  // Если последним было сообщение человека (например, из дневника), собеседник отвечает сам.
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    const last = initialMessages[initialMessages.length - 1];
    if (last?.role === "user") send();
  }, [initialMessages, send]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller && followReply.current) scroller.scrollTop = scroller.scrollHeight;
  }, [messages, busy, showCrisis]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || abortRef.current || undoInFlight.current) return;
    const text = input;
    setInput("");
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
  const replies = messages.filter((m) => m.role === "assistant" && m.content && !m.error).length;
  const showRate = !busy && !showCalm && !rateHidden && replies >= RATE_AFTER && (rating === null || justRated);
  const stepLabel = (step: StepCode) =>
    (PLACE_STEPS as readonly string[]).includes(step)
      ? t.stepPlaces[step as (typeof PLACE_STEPS)[number]]
      : gamesMessages[locale].catalog[step as keyof (typeof gamesMessages)[typeof locale]["catalog"]];
  const rate = (value: number) => {
    setRating(value);
    setJustRated(true);
    rateConversation(conversationId, value);
  };

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <div className={styles.toolbar}>
          <Link href="/talk" aria-label={t.back} title={t.back} className={styles.tool}>
            <BackIcon className="h-5 w-5" />
          </Link>
          <Orb size={40} still face className="hidden sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-ink" title={title}>{title}</h1>
            <p className="truncate text-xs text-ink-soft">{label === t.defaultLabel || label === title ? t.companion : label}</p>
          </div>
          <button
            onClick={() => {
              const next = { ...voice, auto: !voice.auto };
              voiceRef.current = next;
              setVoice(next);
              if (next.auto) speech.unlock();
              else speech.stop();
              saveVoice(next);
            }}
            aria-pressed={voice.auto}
            title={voice.auto ? t.autoOnTitle : t.autoOn}
            aria-label={voice.auto ? t.autoOff : t.autoOn}
            className={styles.tool}
          >
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 10v4h3.5L12 18V6L7.5 10z" />
              {voice.auto ? <path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10" /> : <path d="M16 10l4 4M20 10l-4 4" />}
            </svg>
          </button>
          <details
            className={styles.options}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }}
          >
            <summary className={styles.tool} title={t.options} aria-label={t.options}><MoreIcon className="size-5" /></summary>
            <div className={styles.optionsPanel}>
              <MusicToggle withLabel className={styles.menuItem} />
              <button type="button" onClick={(event) => {
                const options = event.currentTarget.closest("details");
                if (options) options.open = false;
                setBreathing(true);
              }} className={styles.menuItem}>
                <LeafIcon className="size-[18px]" /> {t.breathe}
              </button>
              <form action={deleteConversation} onSubmit={(event) => {
                if (!confirm(t.confirmDelete)) event.preventDefault();
              }}>
                <input type="hidden" name="id" value={conversationId} />
                <input type="hidden" name="redirect" value="1" />
                <button type="submit" className={`${styles.menuItem} ${styles.danger}`}>
                  <TrashIcon className="size-[18px]" /> {t.delete}
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
          followReply.current = scrollHeight - scrollTop - clientHeight < 80;
        }}
        className={styles.transcript}
      >
        <div className={styles.content}>
          {empty && (
            <section className={styles.welcome} aria-labelledby="chat-welcome">
              <div className={styles.welcomeHero}>
                <Orb size={88} face />
                <div>
                  <h2 id="chat-welcome">{t.emptyTitle}</h2>
                  <p>{t.emptyHint}</p>
                </div>
              </div>
              <div className={styles.starters}>
                {t.starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    type="button"
                    className={styles.starter}
                  >
                    <TalkIcon className="size-4 shrink-0 text-[#5148c5]" />
                    {s}
                    <ArrowIcon className="ml-auto size-4 shrink-0 text-ink-soft" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-5 sm:space-y-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex flex-col items-end">
                  <p className={`${styles.bubble} ${styles.own}`}>
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
                <div key={m.id} className="flex items-start gap-2 sm:gap-3">
                  <Orb size={32} still face />
                  {m.content || m.error ? (
                    <div className="min-w-0 max-w-full">
                      <p className={styles.bubble}>
                        {m.content || m.error}
                      </p>
                      {m.content && m.error && <p className="mt-1.5 px-2 text-sm text-ink-soft" role="status">{m.error}</p>}
                      {!m.error && !(busy && m.id === messages[messages.length - 1]?.id) && (
                        <SpeakButton id={m.id} text={m.content} voice={voice} className="-ml-3 mt-1.5" />
                      )}
                      {isStep(m.step) && !(busy && m.id === messages[messages.length - 1]?.id) && (
                        <Link
                          href={stepHref(m.step)}
                          onClick={() => sendEvent("step_taken", { step: m.step ?? undefined })}
                          className="group mt-2 flex animate-rise items-center gap-3 rounded-[20px] border-2 border-lilac/40 bg-lilac-soft/60 px-4 py-3 transition hover:-translate-y-0.5 hover:border-lilac-deep/60 hover:bg-lilac-soft"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium uppercase tracking-wide text-lilac-deep">{t.stepLead}</span>
                            <span className="block text-[15px] font-medium text-ink">{stepLabel(m.step).title}</span>
                            <span className="block text-[13px] leading-snug text-ink-soft">{stepLabel(m.step).hint}</span>
                          </span>
                          <BackIcon className="h-5 w-5 shrink-0 rotate-180 text-lilac-deep transition group-hover:translate-x-0.5" />
                        </Link>
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

          {showRate && (
            <div className="mt-8 animate-rise rounded-[22px] bg-paper/70 px-5 py-4 text-center shadow-soft" aria-live="polite">
              {justRated ? (
                <>
                  <p className="text-[14.5px] text-ink">{rating === 1 ? t.rateSorry : t.rateThanks}</p>
                  {rating === 1 && (
                    <Link
                      href="/specialists"
                      className="mt-2 inline-block text-sm font-medium text-lilac-deep underline-offset-4 hover:underline"
                    >
                      {t.rateSpecialists}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[14.5px] text-ink">{t.rateQuestion}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {([3, 2, 1] as const).map((value, i) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => rate(value)}
                        className="rounded-full border-2 border-sand-deep bg-paper px-4 py-1.5 text-sm text-ink transition hover:-translate-y-0.5 hover:border-lilac"
                      >
                        {t.rateOptions[i]}
                      </button>
                    ))}
                    <button type="button" onClick={() => setRateHidden(true)} className="px-2 py-1.5 text-xs text-ink-faint hover:text-ink">
                      {t.rateLater}
                    </button>
                  </div>
                </>
              )}
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
        </div>
      </div>

      <div className={styles.footer}>
        <form onSubmit={submit} className={styles.composer}>
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
            className={styles.input}
          />
          <button
            type="button"
            disabled={busy || undoing}
            onClick={() => {
              speech.unlock();
              setTalking(true);
            }}
            aria-label={t.voice}
            title={t.voice}
            className={`${styles.tool} ${styles.voice}`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12h1M8 8v8M12 5v14M16 8v8M20 12h-1" />
            </svg>
          </button>
          <button type="submit" disabled={!input.trim() || busy || undoing} aria-label={t.send} title={t.send} className={`${styles.tool} ${styles.send}`}>
            <SendIcon className="size-5" />
          </button>
        </form>
        <p className={styles.disclaimer}>
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
      {talking && <VoiceMode voice={voice} ask={send} onClose={closeVoice} />}
    </div>
  );
}
