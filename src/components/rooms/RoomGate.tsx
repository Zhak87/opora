"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideRequest, requestRoom } from "@/lib/rooms/actions";
import type { AccessState, RoomInfo, RoomRequest } from "@/lib/rooms/types";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { roomsMessages } from "@/i18n/rooms";
import { BackIcon, CalendarIcon, ProfileIcon, ShieldIcon, TalkIcon } from "../icons";
import { Avatar } from "../pro/bits";
import { MicIcon } from "./bits";
import s from "./Rooms.module.css";

export function RoomGate({ room, state, tz, requests }: { room: RoomInfo; state: AccessState; tz: string; requests: RoomRequest[] }) {
  const m = useMsg(roomsMessages);
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const terminal = state === "ended" || state === "banned";

  useEffect(() => {
    if (terminal) return;
    const left = new Date(room.starts_at).getTime() - Date.now();
    const timer = left > 0 ? setTimeout(() => router.refresh(), Math.min(left + 800, 2_147_000_000)) : undefined;
    const es = new EventSource("/api/rooms/events");
    let connected = false;
    es.onopen = () => {
      if (connected) router.refresh();
      connected = true;
    };
    es.addEventListener("changed", () => router.refresh());
    return () => {
      clearTimeout(timer);
      es.close();
    };
  }, [room.starts_at, terminal, router]);

  const when = new Intl.DateTimeFormat(INTL[locale], {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(room.starts_at));

  const status = room.request_status;
  const canRequest = room.access === "request" && !room.is_creator && !terminal;
  const heading = state === "ended" ? m.endedTitle : state === "banned" ? m.bannedTitle : state === "not_started" ? m.notStartedTitle : m.liveTitle;

  function run(change: () => Promise<{ error?: string }>) {
    start(async () => {
      setError("");
      const result = await change().catch(() => ({ error: "failed" }));
      if (result.error) setError(m.errors[result.error as keyof typeof m.errors] ?? m.errors.failed);
      else router.refresh();
    });
  }

  let text;
  if (state === "ended") text = m.endedText;
  else if (state === "banned") text = m.banned;
  else if (canRequest && status !== "approved") {
    text = status === "pending" ? m.requestPending : status === "declined" ? m.requestDeclined : m.needRequest;
  } else if (room.is_creator && room.access === "request") text = m.creatorWait;
  else text = status === "approved" ? `${m.requestApproved} ${m.opensAuto}` : m.opensAuto;

  return (
    <main className={`${s.scope} ${s.gatePage}`}>
      <Link href="/rooms" className={s.back}><BackIcon /> {m.back}</Link>
      <div className={s.twoColumns}>
        <div>
          <section className={s.gateCard} aria-labelledby="room-title">
            <div className={s.gateTitle}>
              <div className={s.tile}>{room.format === "voice" ? <MicIcon /> : <TalkIcon />}</div>
              <div>
                <p>{heading}</p>
                <h1 id="room-title">{room.title}</h1>
              </div>
            </div>
            {room.description && <p className={s.gateDescription}>{room.description}</p>}
            <dl className={s.facts}>
              {!terminal && (
                <div>
                  <dt><CalendarIcon /> {m.fStartsAt}</dt>
                  <dd><time dateTime={room.starts_at}>{when}</time></dd>
                </div>
              )}
              <div><dt><TalkIcon /> {m.fFormat}</dt><dd>{m.format[room.format]}</dd></div>
              <div><dt><ShieldIcon /> {m.fAccess}</dt><dd>{m.access[room.access]}</dd></div>
              {room.creator_name && <div><dt><ProfileIcon /> {m.creator}</dt><dd>{room.is_creator ? m.you : room.creator_name}</dd></div>}
            </dl>
            <p role="status" className={s.status}>{text}</p>
            {canRequest && !status && (
              <button type="button" onClick={() => run(() => requestRoom(room.id))} disabled={pending} className={s.primary}>{pending ? m.sending : m.sendRequest}</button>
            )}
            {error && <p role="alert" className={s.error}>{error}</p>}
          </section>
          {room.is_creator && room.access === "request" && state === "not_started" && (
            <section className={`${s.gateCard} ${s.requests}`}>
              <h2>{m.requestsTitle}</h2>
              <RequestList requests={requests} pending={pending} onDecide={(user, approve) => run(() => decideRequest(room.id, user, approve))} />
            </section>
          )}
        </div>
        {!terminal && (
          <aside className={s.guide}>
            <ShieldIcon className={s.guideIcon} />
            <h2>{m.moderator}</h2>
            <p>{m.fModerator}</p>
          </aside>
        )}
      </div>
    </main>
  );
}

export function RequestList({ requests, pending, onDecide }: {
  requests: RoomRequest[];
  pending: boolean;
  onDecide: (user: string, approve: boolean) => void;
}) {
  const m = useMsg(roomsMessages);
  if (!requests.length) return <p className="text-sm text-ink-soft">{m.noRequests}</p>;
  return (
    <ul className={s.requestList}>
      {[...requests].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")).map((request) => (
        <li key={request.user_id} className={s.requestRow}>
          <Avatar name={request.name ?? m.someone} size={34} />
          <span>{request.name ?? m.someone}</span>
          {request.status === "pending" ? (
            <div className={s.requestActions}>
              <button type="button" disabled={pending} onClick={() => onDecide(request.user_id, true)} className={s.primary}>{m.approve}</button>
              <button type="button" disabled={pending} onClick={() => onDecide(request.user_id, false)} className={s.secondary}>{m.decline}</button>
            </div>
          ) : (
            <span className={s.badge} data-status={request.status}>{m.request[request.status]}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
