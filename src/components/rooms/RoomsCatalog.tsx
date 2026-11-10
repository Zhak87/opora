"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { fill, roomsMessages } from "@/i18n/rooms";
import type { RoomCard } from "@/lib/rooms/types";
import { CalendarIcon, ArrowIcon, ShieldIcon } from "../icons";
import { FormatChip, OnlineDot } from "./bits";

type Tab = "now" | "upcoming";

export function RoomsCatalog({
  me,
  tz,
  initialTab,
  live,
  upcoming,
  counts: initialCounts,
  failed,
}: {
  me: string;
  tz: string;
  initialTab: Tab;
  live: RoomCard[];
  upcoming: RoomCard[];
  counts: Record<string, number>;
  failed: boolean;
}) {
  const m = useMsg(roomsMessages);
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [counts, setCounts] = useState(initialCounts);
  const [paused, setPaused] = useState(false);

  useEffect(() => setCounts(initialCounts), [initialCounts]);

  // Живые обновления: число людей онлайн и сигнал, что список изменился.
  useEffect(() => {
    const es = new EventSource("/api/rooms/events");
    es.addEventListener("counts", (e) => {
      setPaused(false);
      setCounts(JSON.parse((e as MessageEvent).data));
    });
    es.addEventListener("changed", () => router.refresh());
    es.onerror = () => setPaused(true);
    es.onopen = () => setPaused(false);
    return () => es.close();
  }, [router]);

  // Запланированная встреча сама переходит во вкладку «Сейчас» в момент начала.
  useEffect(() => {
    const next = upcoming.map((r) => new Date(r.starts_at).getTime()).find((t) => t > Date.now());
    if (!next) return;
    const t = setTimeout(() => router.refresh(), Math.min(next - Date.now() + 500, 2_147_000_000));
    return () => clearTimeout(t);
  }, [upcoming, router]);

  const sortedLive = useMemo(
    () => [...live].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || b.starts_at.localeCompare(a.starts_at)),
    [live, counts],
  );

  const when = (iso: string) =>
    new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
      new Date(iso),
    );

  const select = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "upcoming" ? "/rooms?tab=upcoming" : "/rooms");
  };

  const list = tab === "now" ? sortedLive : upcoming;

  return (
    <section>
      <div role="tablist" aria-label={m.title} className="mb-5 grid grid-cols-2 gap-1 rounded-[20px] bg-sand/70 p-1">
        {(["now", "upcoming"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => select(t)}
            className={`h-11 rounded-[16px] text-[15px] font-medium transition-all duration-300 ${tab === t ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink"}`}
          >
            {m.tabs[t]}
            <span className="ml-1.5 text-ink-faint">{t === "now" ? live.length : upcoming.length}</span>
          </button>
        ))}
      </div>

      {paused && !failed && (
        <p role="status" className="mb-4 rounded-2xl bg-mist px-4 py-2.5 text-sm text-sky-deep">
          {m.paused}
        </p>
      )}

      {failed ? (
        <div role="alert" className="rounded-[26px] bg-paper p-6 text-center shadow-soft">
          <p className="text-[15px] leading-relaxed text-ink-soft">{m.loadError}</p>
          <button type="button" onClick={() => router.refresh()} className="mt-4 rounded-[16px] bg-ink px-5 py-2.5 text-sm font-medium text-paper">
            {m.retry}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-sand-deep bg-paper/60 px-6 py-10 text-center">
          <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-ink-soft">{tab === "now" ? m.emptyNow : m.emptyUpcoming}</p>
          <Link href="/rooms/new" className="mt-4 inline-flex text-sm font-medium text-lilac-deep hover:underline">
            {m.create}
          </Link>
        </div>
      ) : (
        <ul className="stagger space-y-3">
          {list.map((r) => {
            const n = counts[r.id] ?? 0;
            const mine = r.creator_id === me;
            return (
              <li key={r.id}>
                <Link
                  href={`/rooms/${r.id}`}
                  className="group block rounded-[26px] bg-paper p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[18px] font-semibold leading-snug text-ink sm:text-[19px]">{r.title}</h2>
                      {r.description && <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-ink-soft">{r.description}</p>}
                    </div>
                    {tab === "now" ? (
                      <span
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${n ? "bg-sage-soft text-sage-deep" : "bg-sand text-ink-faint"}`}
                        aria-label={fill(m.online, { n })}
                      >
                        <OnlineDot active={n > 0} />
                        {fill(m.online, { n })}
                      </span>
                    ) : (
                      <ArrowIcon className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                    {tab === "upcoming" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 font-medium text-sky-deep">
                        <CalendarIcon className="h-3.5 w-3.5" /> {when(r.starts_at)}
                      </span>
                    )}
                    <FormatChip format={r.format} label={m.format[r.format]} />
                    {r.scheduled && (
                      <span className="rounded-full bg-sand/80 px-3 py-1 text-ink-soft">{m.access[r.access]}</span>
                    )}
                    {r.access === "request" && !mine && (
                      <span
                        className={`rounded-full px-3 py-1 ${
                          r.request === "approved"
                            ? "bg-sage-soft text-sage-deep"
                            : r.request === "declined"
                              ? "bg-[#ffeeec] text-[#b23b33]"
                              : r.request === "pending"
                                ? "bg-peach-soft text-peach-deep"
                                : "bg-lilac-soft text-lilac-deep"
                        }`}
                      >
                        {m.request[r.request ?? "none"]}
                      </span>
                    )}
                    {mine && <span className="rounded-full bg-ink px-3 py-1 text-paper">{m.yours}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 flex items-center gap-2 px-2 text-xs leading-relaxed text-ink-faint">
        <ShieldIcon className="h-4 w-4 shrink-0" /> {m.fModerator}
      </p>
    </section>
  );
}
