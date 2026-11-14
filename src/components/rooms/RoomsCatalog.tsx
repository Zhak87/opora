"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { fill, roomsMessages } from "@/i18n/rooms";
import type { RoomCard } from "@/lib/rooms/types";
import { ArrowIcon, CalendarIcon, PlusIcon, ShieldIcon, TalkIcon, UsersIcon } from "../icons";
import { HeadphonesIcon, MicIcon, OnlineDot } from "./bits";
import s from "./Rooms.module.css";

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
  const params = useSearchParams();
  const tab: Tab = params ? (params.get("tab") === "upcoming" ? "upcoming" : "now") : initialTab;
  const [counts, setCounts] = useState(initialCounts);
  const [paused, setPaused] = useState(false);
  const [refreshing, refresh] = useTransition();

  useEffect(() => setCounts(initialCounts), [initialCounts]);

  useEffect(() => {
    const es = new EventSource("/api/rooms/events");
    const reconnect = () => {
      setPaused(false);
      router.refresh();
    };
    es.addEventListener("counts", (e) => setCounts(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("changed", () => router.refresh());
    es.onerror = () => setPaused(true);
    let connected = false;
    es.onopen = () => {
      if (connected) reconnect();
      connected = true;
      setPaused(false);
    };
    return () => es.close();
  }, [router]);

  useEffect(() => {
    const next = upcoming.map((r) => new Date(r.starts_at).getTime()).find((t) => t > Date.now());
    if (!next) return;
    const timer = setTimeout(() => router.refresh(), Math.min(next - Date.now() + 500, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [upcoming, router]);

  const sortedLive = useMemo(
    () => [...live].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || b.starts_at.localeCompare(a.starts_at)),
    [live, counts],
  );

  const dates = new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, weekday: "short", day: "numeric", month: "long" });
  const times = new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const list = tab === "now" ? sortedLive : upcoming;

  function select(next: Tab) {
    window.history.replaceState(null, "", next === "upcoming" ? "/rooms?tab=upcoming" : "/rooms");
  }

  return (
    <div className={`${s.scope} ${s.catalogPage}`}>
      <header className={s.hero}>
        <div className={s.heroContent}>
          <h1>{m.title}</h1>
          <p>{m.lead}</p>
          <Link href="/rooms/new" className={s.primary}><PlusIcon /> {m.create}</Link>
        </div>
        <div className={s.heroArt} aria-hidden="true">
          <Image src="/brand/opi-hero-34.webp" width={146} height={151} alt="" priority />
          <span className={s.artTalk}><TalkIcon /></span>
          <span className={s.artAudio}><HeadphonesIcon /></span>
        </div>
      </header>
      <div className={s.twoColumns}>
        <section aria-label={m.title} className={s.list}>
          <div className={s.filters} role="group" aria-label={m.fWhen}>
            {(["now", "upcoming"] as const).map((option) => (
              <button key={option} type="button" aria-pressed={tab === option} onClick={() => select(option)}>
                {option === "now" ? <UsersIcon /> : <CalendarIcon />}
                {m.tabs[option]}
                {!failed && <span>{option === "now" ? live.length : upcoming.length}</span>}
              </button>
            ))}
          </div>

          {paused && !failed && <p role="status" className={s.status}>{m.paused}</p>}

          {failed || !list.length ? (
            <div className={s.empty} role={failed ? "alert" : undefined}>
              <div className={s.tile}>{tab === "now" ? <TalkIcon /> : <CalendarIcon />}</div>
              <h2>{failed ? m.loadTitle : m.emptyTitle[tab]}</h2>
              <p>{failed ? m.loadError : tab === "now" ? m.emptyNow : m.emptyUpcoming}</p>
              {failed ? (
                <button type="button" className={s.secondary} disabled={refreshing} onClick={() => refresh(() => router.refresh())}>{m.retry}</button>
              ) : tab === "now" && upcoming.length > 0 ? (
                <button type="button" className={s.secondary} onClick={() => select("upcoming")}>{m.viewUpcoming} <ArrowIcon /></button>
              ) : (
                <Link href="/rooms/new" className={s.secondary}><PlusIcon /> {m.create}</Link>
              )}
            </div>
          ) : (
            <ul className={s.list}>
              {list.map((room) => {
                const n = counts[room.id] ?? 0;
                const mine = room.creator_id === me;
                const date = new Date(room.starts_at);
                const needsDetail = tab === "upcoming" || room.access === "request" && !mine && room.request !== "approved";
                return (
                  <li key={room.id}>
                    <Link href={`/rooms/${room.id}`} className={s.roomCard}>
                      <div className={s.tile}>{room.format === "voice" ? <MicIcon /> : <TalkIcon />}</div>
                      <div className={s.cardBody}>
                        <div className={s.meta}>
                          {tab === "upcoming" ? (
                            <time dateTime={room.starts_at}><CalendarIcon /> {dates.format(date)} · {times.format(date)}</time>
                          ) : (
                            <span><OnlineDot active={n > 0} /> {fill(m.online, { n })}</span>
                          )}
                          <span>{m.format[room.format]}</span>
                        </div>
                        <h2>{room.title}</h2>
                        {room.description && <p className={s.description}>{room.description}</p>}
                        {(mine || room.scheduled || room.access === "request") && (
                          <div className={s.cardTags}>
                            {mine && <span>{m.yours}</span>}
                            {room.scheduled && <span>{m.access[room.access]}</span>}
                            {room.access === "request" && !mine && <span data-status={room.request}>{m.request[room.request ?? "none"]}</span>}
                          </div>
                        )}
                      </div>
                      <span className={s.cardAction}>{needsDetail ? m.details : m.enter} <ArrowIcon /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className={s.guide}>
          <ShieldIcon className={s.guideIcon} />
          <h2>{m.moderator}</h2>
          <p>{m.fModerator}</p>
        </aside>
      </div>
    </div>
  );
}
