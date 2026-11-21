"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { fill, roomsMessages } from "@/i18n/rooms";
import type { RoomCard, TopicCard } from "@/lib/rooms/types";
import { pick, type PersonaText, type TopicText } from "@/lib/rooms/topics";
import { sendEvent } from "../Track";
import { ArrowIcon, CalendarIcon, PlusIcon, ShieldIcon, TalkIcon, UsersIcon } from "../icons";
import { MicIcon, OnlineDot, PersonaAvatar, TopicGlyph } from "./bits";
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
  topics,
  aiVoice,
}: {
  me: string;
  tz: string;
  initialTab: Tab;
  live: RoomCard[];
  upcoming: RoomCard[];
  counts: Record<string, number>;
  failed: boolean;
  topics: TopicCard[];
  aiVoice: boolean;
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
          <p className={s.eyebrow}>{m.topicsEyebrow}</p>
          <h1>{m.topicsTitle}</h1>
          <p>{m.topicsLead}</p>
        </div>
        <div className={s.heroArt} aria-hidden="true">
          <Image src="/brand/opi-hero-34.webp" width={146} height={151} alt="" priority />
          <span className={s.artTalk}><TalkIcon /></span>
          <span className={s.artAudio}><UsersIcon /></span>
        </div>
      </header>

      {topics.length > 0 ? (
        <ul className={s.topicGrid} aria-label={m.topicsTitle}>
          {topics.map((topic, i) => (
            <TopicTile key={topic.id} topic={topic} people={counts[topic.id] ?? 0} aiVoice={aiVoice} index={i} />
          ))}
        </ul>
      ) : (
        !failed && <p role="status" className={s.status}>{m.topicsLoadError}</p>
      )}

      <div className={s.sectionHead}>
        <div>
          <h2>{m.userRoomsTitle}</h2>
          <p>{m.userRoomsLead}</p>
        </div>
        <Link href="/rooms/new" className={s.secondary}><PlusIcon /> {m.create}</Link>
      </div>
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

function TopicTile({ topic, people, aiVoice, index }: { topic: TopicCard; people: number; aiVoice: boolean; index: number }) {
  const m = useMsg(roomsMessages);
  const locale = useLocale();
  const text = pick<TopicText>(topic.content, locale);
  const ref = useRef<HTMLLIElement>(null);

  // Аналитика: карточку действительно увидели (раз за вкладку).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const key = `opora-room-card-${topic.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
      sendEvent("room_card_view", { room: topic.id });
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [topic.id]);

  if (!text) return null;
  return (
    <li ref={ref} className={s.topicItem} style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}>
      <Link href={`/rooms/${topic.id}`} className={s.topicCard} data-topic={topic.slug}>
        <div className={s.topicTop}>
          <span className={s.topicGlyph}><TopicGlyph slug={topic.slug} /></span>
          <span className={s.topicFormat}>{aiVoice ? m.formatTextVoice : m.formatText}</span>
        </div>
        <h2>{text.title}</h2>
        <p className={s.description}>{text.description}</p>
        <figure className={s.topicExample}>
          <figcaption>{m.exampleLabel}</figcaption>
          <blockquote>{text.example}</blockquote>
        </figure>
        <div className={s.topicCounts}>
          <span><OnlineDot active={people > 0} /> {people > 0 ? fill(m.peopleNow, { n: people }) : m.nobodyYet}</span>
          <span className={s.topicAi}>
            <span className={s.personaStack} aria-hidden="true">
              {topic.personas.map((p) => <PersonaAvatar key={p.id} name={pick<PersonaText>(p.content, locale)?.name ?? "И"} size={22} />)}
            </span>
            {fill(m.aiCount, { n: topic.personas.length })} <span className={s.aiTag}>{m.moderatorTag}</span>
          </span>
        </div>
        <span className={s.topicCta}>{m.topicEnter} <ArrowIcon /></span>
      </Link>
    </li>
  );
}
