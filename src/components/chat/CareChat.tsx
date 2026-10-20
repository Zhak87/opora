"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendCareMessage, markCareRead } from "@/lib/chat-actions";
import type { CareMessage } from "@/lib/care-chat";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { SendIcon, CheckIcon } from "../icons";

const POLL_MS = 8000;

// Переписка клиента и психолога. Новые сообщения подтягиваются, пока вкладка открыта.
export function CareChat({
  me,
  peer,
  initial,
  tz,
  canWrite,
  empty,
}: {
  me: string;
  peer: string;
  initial: CareMessage[];
  tz: string;
  canWrite: boolean;
  empty: string;
}) {
  const m = useMsg(chatMessages);
  const locale = useLocale();
  const router = useRouter();
  const [local, setLocal] = useState<CareMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Сервер присылает свежий список; свои только что отправленные держим, пока они не придут оттуда.
  const messages = useMemo(() => {
    const ids = new Set(initial.map((x) => x.id));
    return [...initial, ...local.filter((x) => !ids.has(x.id))];
  }, [initial, local]);

  const unreadFromPeer = initial.some((x) => x.sender_id === peer && !x.read_at);
  useEffect(() => {
    if (unreadFromPeer) markCareRead(peer);
  }, [unreadFromPeer, peer, initial.length]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [messages.length]);

  const send = () => {
    const body = text.trim();
    if (!body || pending) return;
    setError("");
    start(async () => {
      const res = await sendCareMessage(peer, body);
      if (res.message) {
        setLocal((l) => [...l, res.message!]);
        setText("");
        area.current?.focus();
      } else setError(res.error ?? m.failed);
    });
  };

  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const today = day(new Date().toISOString());
  const yesterday = day(new Date(Date.now() - 86_400_000).toISOString());
  const dayTitle = (iso: string) => {
    const d = day(iso);
    if (d === today) return m.today;
    if (d === yesterday) return m.yesterday;
    return new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric", month: "long" }).format(new Date(iso));
  };
  const time = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  const lastMine = [...messages].reverse().find((x) => x.sender_id === me)?.id;

  return (
    <div className="flex flex-col overflow-hidden rounded-[28px] border border-line/70 bg-paper/80 shadow-soft">
      <div ref={box} className="h-[min(60dvh,560px)] space-y-1.5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 && <p className="mx-auto mt-10 max-w-sm text-center text-sm leading-relaxed text-ink-soft">{empty}</p>}
        {messages.map((x, i) => {
          const mine = x.sender_id === me;
          const newDay = i === 0 || day(messages[i - 1].created_at) !== day(x.created_at);
          return (
            <div key={x.id}>
              {newDay && <p className="py-3 text-center text-xs text-ink-faint">{dayTitle(x.created_at)}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-[20px] px-4 py-2.5 sm:max-w-[70%] ${
                    mine ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md border border-line/70 bg-milk text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{x.body}</p>
                  <p className={`mt-1 text-right text-[11px] ${mine ? "text-paper/60" : "text-ink-faint"}`}>{time(x.created_at)}</p>
                </div>
              </div>
              {mine && x.id === lastMine && (
                <p className="mt-1 flex items-center justify-end gap-1 pr-1 text-[11px] text-ink-faint">
                  {x.read_at && <CheckIcon className="h-3 w-3 text-sage-deep" />}
                  {x.read_at ? m.read : m.sent}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {canWrite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-line/60 bg-paper p-3 sm:p-4"
        >
          {error && <p className="mb-2 px-2 text-sm text-[#a0614f]">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              ref={area}
              name="body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={m.placeholder}
              aria-label={m.placeholder}
              className="max-h-40 min-h-[48px] flex-1 resize-none rounded-[22px] border border-line bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition [field-sizing:content] placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
            />
            <button
              type="submit"
              disabled={!text.trim() || pending}
              aria-label={m.send}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink/90 disabled:opacity-40"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line/60 bg-sand/40 px-5 py-4 text-center text-sm text-ink-soft">{m.closed}</p>
      )}
    </div>
  );
}
