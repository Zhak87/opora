"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, SendIcon, LeafIcon } from "./icons";
import { Orb } from "./Orb";
import { Breathe } from "./Breathe";
import { MusicToggle } from "./Music";
import { ButtonLink } from "./ui";
import { looksLikeCrisis } from "@/lib/prompt";
import { DEMO_INVITE_AFTER, DEMO_LIMIT, DEMO_MAX_INPUT, readDemo, writeDemo, type DemoMessage } from "@/lib/demo";
import { useMsg } from "@/i18n/client";
import { demoMessages } from "@/i18n/demo";
import { legalMessages } from "@/i18n/legal";

type Message = DemoMessage & { id: string; failed?: boolean };

export function DemoChat() {
  const t = useMsg(demoMessages);
  const legal = useMsg(legalMessages);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [inviteHidden, setInviteHidden] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Разговор хранится в браузере, чтобы после регистрации перенести его в аккаунт.
  useEffect(() => {
    const saved = readDemo().map((m, i) => ({ ...m, id: `s-${i}` }));
    setMessages(saved);
    setShowCrisis(saved.some((m) => m.role === "user" && looksLikeCrisis(m.content)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && !busy) writeDemo(messages.filter((m) => m.content.trim() && !m.failed).map(({ role, content }) => ({ role, content })));
  }, [messages, busy, loaded]);

  const userCount = messages.filter((m) => m.role === "user").length;
  const reachedLimit = userCount >= DEMO_LIMIT;
  const showInvite = !busy && (reachedLimit || (userCount >= DEMO_INVITE_AFTER && !inviteHidden));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, showInvite]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy || reachedLimit) return;
      const history = [...messages.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })), { role: "user" as const, content }];
      const replyId = `a-${Date.now()}`;
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content },
        { id: replyId, role: "assistant", content: "" },
      ]);
      if (looksLikeCrisis(content)) setShowCrisis(true);

      try {
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
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
        // Ответ сервера об ошибке показываем, но не сохраняем как реплику собеседника.
        if (!res.ok) setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, failed: true } : m)));
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId ? { ...m, failed: true, content: t.connectionLost } : m,
          ),
        );
      } finally {
        setBusy(false);
        inputRef.current?.focus({ preventScroll: true });
      }
    },
    [busy, messages, reachedLimit, t.connectionLost],
  );

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

  const empty = loaded && messages.length === 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line/50 bg-milk/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:px-6">
          <Link href="/welcome" aria-label={t.toHome} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-sand hover:text-ink">
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] text-ink">{t.title}</p>
            <p className="text-xs text-ink-faint">{t.subtitle}</p>
          </div>
          <MusicToggle className="[&>span]:h-9 [&>span]:w-9 [&>span]:shadow-none [&>span]:bg-transparent" />
          <button
            onClick={() => setBreathing(true)}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-soft transition hover:bg-sage-soft hover:text-sage-deep"
          >
            <LeafIcon className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">{t.breathe}</span>
          </button>
          <Link href="/login" className="flex h-10 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
            {t.signIn}
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-8 pt-8 sm:px-8">
          {empty && (
            <div className="flex animate-fade flex-col items-center pt-[8vh] text-center">
              <Orb size={140} />
              <p className="mt-8 font-serif text-[26px] leading-snug text-ink">{t.emptyTitle}</p>
              <p className="mt-2 max-w-sm text-[15px] text-ink-soft">{t.emptyText}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {t.starters.map((s) => (
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
                    <p className="min-w-0 whitespace-pre-wrap font-serif text-[17px] leading-[1.7] text-ink">{m.content}</p>
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

          {showCrisis && (
            <aside className="mt-8 animate-rise rounded-[24px] border border-lilac/50 bg-lilac-soft/70 p-5 text-[14.5px] leading-relaxed text-ink">
              <p className="font-medium">{t.crisisTitle}</p>
              <p className="mt-1 text-ink-soft">{t.crisisText}</p>
              <ul className="mt-3 space-y-1">
                <li><a href="tel:112" className="underline-offset-4 hover:underline">112</a> — {t.crisisEmergency}</li>
                <li><a href="tel:88002000122" className="underline-offset-4 hover:underline">8-800-2000-122</a> — {t.crisisRussia}</li>
                <li><a href="tel:150" className="underline-offset-4 hover:underline">150</a> — {t.crisisKazakhstan}</li>
              </ul>
              <button onClick={() => setShowCrisis(false)} className="mt-3 text-xs text-ink-faint hover:text-ink">
                {t.hide}
              </button>
            </aside>
          )}

          {showInvite && (
            <aside className="mt-10 animate-rise rounded-[28px] border border-line/70 bg-gradient-to-br from-paper via-paper to-mist/70 p-6 text-center shadow-soft sm:p-7">
              <Orb size={56} className="mx-auto" />
              <p className="mt-4 font-serif text-[22px] leading-snug text-ink">
                {reachedLimit ? t.inviteLimitTitle : t.inviteTitle}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                {reachedLimit ? t.inviteLimitText : t.inviteText}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <ButtonLink href="/signup?from=demo">{t.createAccount}</ButtonLink>
                {reachedLimit ? (
                  <ButtonLink href="/login?from=demo" variant="soft">{t.haveAccount}</ButtonLink>
                ) : (
                  <button
                    onClick={() => {
                      setInviteHidden(true);
                      inputRef.current?.focus();
                    }}
                    className="h-12 rounded-full px-6 text-[15px] text-ink-soft transition hover:bg-sand/60 hover:text-ink"
                  >
                    {t.continueWithout}
                  </button>
                )}
              </div>
            </aside>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {!reachedLimit && (
        <div className="border-t border-line/40 bg-gradient-to-t from-milk via-milk to-milk/70 pb-[env(safe-area-inset-bottom)]">
          <form onSubmit={submit} className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3 sm:px-8 sm:py-5">
            <label className="sr-only" htmlFor="demo-input">{t.inputLabel}</label>
            <textarea
              id="demo-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={DEMO_MAX_INPUT}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              className="max-h-[200px] min-h-[52px] flex-1 resize-none rounded-[26px] border border-line bg-paper px-5 py-[14px] text-[16px] leading-relaxed text-ink shadow-soft outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={t.send}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-paper shadow-soft transition-all duration-300 hover:bg-ink/90 disabled:bg-sand-deep disabled:text-paper"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </form>
          <p className="hidden text-center text-[11px] text-ink-faint sm:block">
            {t.footnote}
          </p>
          <p className="mx-auto max-w-2xl px-5 pb-3 text-center text-[11px] leading-snug text-ink-faint sm:px-8">
            {legal.demoNote[0]}
            <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-ink">
              {legal.demoNote[1]}
            </Link>
            {legal.demoNote[2]}
          </p>
        </div>
      )}

      {breathing && <Breathe onClose={() => setBreathing(false)} />}
    </div>
  );
}
