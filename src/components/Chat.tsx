"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, SendIcon, LeafIcon, TrashIcon } from "./icons";
import { Orb } from "./Orb";
import { Breathe } from "./Breathe";
import { deleteConversation } from "@/lib/actions";
import { looksLikeCrisis } from "@/lib/prompt";

type Message = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = ["Мне сейчас тревожно", "Я очень устал(а)", "Хочу просто выговориться", "Не знаю, с чего начать"];

export function Chat({
  conversationId,
  title,
  label,
  initialMessages,
}: {
  conversationId: string;
  title: string;
  label: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [showCrisis, setShowCrisis] = useState(() => initialMessages.some((m) => m.role === "user" && looksLikeCrisis(m.content)));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoStarted = useRef(false);

  const scrollDown = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  const send = useCallback(
    async (text?: string) => {
      const content = text?.trim();
      setBusy(true);
      const replyId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        ...(content ? [{ id: `u-${Date.now()}`, role: "user" as const, content }] : []),
        { id: replyId, role: "assistant" as const, content: "" },
      ]);
      if (content && looksLikeCrisis(content)) setShowCrisis(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: content }),
        });
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
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? { ...m, content: "Связь ненадолго прервалась. Ваши слова сохранены, попробуйте отправить ещё раз чуть позже." }
              : m,
          ),
        );
      } finally {
        setBusy(false);
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [conversationId],
  );

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

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line/50 bg-milk/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:px-6">
          <Link href="/talk" aria-label="К разговорам" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-sand hover:text-ink">
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-ink">{title}</p>
            <p className="text-xs text-ink-faint">{label}</p>
          </div>
          <button
            onClick={() => setBreathing(true)}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-soft transition hover:bg-sage-soft hover:text-sage-deep"
          >
            <LeafIcon className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Подышать</span>
          </button>
          <form
            action={deleteConversation}
            onSubmit={(e) => {
              if (!confirm("Удалить этот разговор? Его нельзя будет восстановить.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={conversationId} />
            <input type="hidden" name="redirect" value="1" />
            <button type="submit" aria-label="Удалить разговор" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-8 pt-8 sm:px-8">
          {empty && (
            <div className="flex animate-fade flex-col items-center pt-[8vh] text-center">
              <Orb size={140} />
              <p className="mt-8 font-serif text-[26px] leading-snug text-ink">Я здесь и слушаю.</p>
              <p className="mt-2 max-w-sm text-[15px] text-ink-soft">Расскажите, что у вас на душе. Можно начать с чего угодно.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line bg-paper/80 px-4 py-2 text-sm text-ink-soft transition hover:border-sand-deep hover:text-ink"
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
                <div key={m.id} className="flex animate-rise justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-lg bg-sand px-5 py-3.5 text-[15.5px] leading-relaxed text-ink">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex animate-rise gap-3.5">
                  <span
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: "radial-gradient(circle at 35% 30%, #fffdf9, #c9d8e6 55%, #b4cbaa)" }}
                    aria-hidden
                  />
                  {m.content ? (
                    <p className="whitespace-pre-wrap font-serif text-[17px] leading-[1.7] text-ink">{m.content}</p>
                  ) : (
                    <p className="flex items-center gap-1.5 pt-1 text-sm text-ink-faint" aria-live="polite">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:200ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:400ms]" />
                      <span className="sr-only">Собеседник думает</span>
                    </p>
                  )}
                </div>
              ),
            )}
          </div>

          {showCrisis && (
            <aside className="mt-8 animate-rise rounded-[24px] border border-lilac/50 bg-lilac-soft/70 p-5 text-[14.5px] leading-relaxed text-ink">
              <p className="font-medium">Вы не обязаны справляться с этим в одиночку.</p>
              <p className="mt-1 text-ink-soft">
                Если сейчас очень тяжело, пожалуйста, поговорите с живым человеком. Это бесплатно и анонимно:
              </p>
              <ul className="mt-3 space-y-1">
                <li><a href="tel:112" className="underline-offset-4 hover:underline">112</a> — экстренная помощь</li>
                <li><a href="tel:88002000122" className="underline-offset-4 hover:underline">8-800-2000-122</a> — телефон доверия (Россия)</li>
                <li><a href="tel:150" className="underline-offset-4 hover:underline">150</a> — телефон доверия (Казахстан)</li>
              </ul>
              <button onClick={() => setShowCrisis(false)} className="mt-3 text-xs text-ink-faint hover:text-ink">
                Скрыть
              </button>
            </aside>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      <div className="border-t border-line/40 bg-gradient-to-t from-milk via-milk to-milk/70 pb-[env(safe-area-inset-bottom)]">
        <form onSubmit={submit} className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3 sm:px-8 sm:py-5">
          <label className="sr-only" htmlFor="chat-input">Ваше сообщение</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Напишите, что на душе…"
            className="max-h-[200px] min-h-[52px] flex-1 resize-none rounded-[26px] border border-line bg-paper px-5 py-[14px] text-[16px] leading-relaxed text-ink shadow-soft outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Отправить"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-paper shadow-soft transition-all duration-300 hover:bg-ink/90 disabled:bg-sand-deep disabled:text-paper"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
        <p className="hidden pb-3 text-center text-[11px] text-ink-faint sm:block">
          Собеседник — это ИИ. Он поддерживает, но не заменяет специалиста.
        </p>
      </div>

      {breathing && <Breathe onClose={() => setBreathing(false)} />}
    </div>
  );
}
