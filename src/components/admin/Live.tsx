"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { panelMessages } from "@/i18n/admin";
import { funnelMessages } from "@/i18n/funnel";
import type { Overview } from "@/lib/admin";

const EVERY = 10_000;
const TODAY = ["visitors", "landing", "trials", "signups", "chats", "replies", "practices"] as const;
const TOTALS = ["users", "users_7d", "active_7d", "guests", "psychologists", "psy_pending", "conversations", "messages", "journal", "rooms", "sessions", "staff", "blocked"] as const;

// Обзор «прямо сейчас»: сам перечитывает цифры каждые 10 секунд, пока вкладка открыта и видна.
export function Live({ initial }: { initial: Overview }) {
  const locale = useLocale();
  const m = panelMessages[locale];
  const names = funnelMessages[locale].names;
  const [o, setO] = useState(initial);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Overview;
        if (!stop) {
          setO(data);
          setLost(false);
        }
      } catch {
        if (!stop) setLost(true);
      }
    };
    const timer = window.setInterval(load, EVERY);
    document.addEventListener("visibilitychange", load);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const time = (iso: string) => new Date(iso).toLocaleTimeString(INTL[locale], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const peak = Math.max(1, ...o.signups_daily.map((d) => d.n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5 rounded-[30px] bg-ink p-6 text-paper shadow-soft sm:p-8">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className={`absolute inline-flex h-full w-full rounded-full ${lost ? "bg-peach" : "animate-ping bg-[#7be0a8]"} opacity-70`} />
          <span className={`relative inline-flex h-3 w-3 rounded-full ${lost ? "bg-peach" : "bg-[#7be0a8]"}`} />
        </span>
        <p className="font-serif text-[52px] leading-none tabular-nums" data-live="online">{o.online}</p>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{m.online}</p>
          <p className="mt-1 text-sm text-paper/65">{m.onlineHint(o.online_hour)}</p>
        </div>
        <p className="text-xs text-paper/55" aria-live="polite">
          {lost ? m.paused : `${m.updated(time(o.at))} · ${m.live}`}
        </p>
      </div>

      <section className="rounded-[30px] bg-paper p-6 shadow-soft sm:p-8">
        <h2 className="mb-4 text-[15px] font-medium text-ink">{m.today}</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
          {TODAY.map((k) => (
            <Stat key={k} value={o.today[k]} label={m.todayItems[k]} id={`today-${k}`} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[30px] bg-paper p-6 shadow-soft sm:p-8">
          <h2 className="mb-4 text-[15px] font-medium text-ink">{m.totals}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            {TOTALS.map((k) => (
              <Stat key={k} value={o.totals[k]} label={m.totalItems[k]} id={`total-${k}`} />
            ))}
          </div>
          <h3 className="mb-3 mt-8 text-sm text-ink-soft">{m.signups}</h3>
          <div className="flex h-24 items-end gap-1.5">
            {o.signups_daily.map((d) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.n}`}>
                <span className="text-[10px] tabular-nums text-ink-faint">{d.n || ""}</span>
                <div className="w-full rounded-t-md bg-lilac-deep" style={{ height: `${Math.max(3, (d.n / peak) * 80)}%`, opacity: d.n ? 1 : 0.2 }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
            <span>{o.signups_daily[0]?.day}</span>
            <span>{o.signups_daily[o.signups_daily.length - 1]?.day}</span>
          </div>
        </section>

        <section className="rounded-[30px] bg-paper p-6 shadow-soft sm:p-8">
          <h2 className="mb-4 text-[15px] font-medium text-ink">{m.feed}</h2>
          {o.feed.length === 0 ? (
            <p className="text-sm text-ink-soft">{m.feedEmpty}</p>
          ) : (
            <ul className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1 text-sm">
              {o.feed.map((f, i) => (
                <li key={`${f.at}-${i}`} className="flex items-baseline gap-3">
                  <span className="shrink-0 text-xs tabular-nums text-ink-faint">{time(f.at)}</span>
                  <span className="min-w-0 flex-1 text-ink">
                    {names[f.name] ?? f.name}
                    {f.note ? <span className="text-ink-faint"> · {f.note}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{f.user ? m.feedWho.user : m.feedWho.guest}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ value, label, id }: { value: number; label: string; id: string }) {
  return (
    <div>
      <p className="font-serif text-[28px] leading-none tabular-nums text-ink" data-live={id}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-ink-soft">{label}</p>
    </div>
  );
}
