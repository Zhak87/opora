"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideRequest, requestRoom } from "@/lib/rooms/actions";
import type { AccessState, RoomInfo, RoomRequest } from "@/lib/rooms/types";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { fill, roomsMessages } from "@/i18n/rooms";
import { BackIcon, CalendarIcon } from "../icons";
import { Avatar } from "../pro/bits";
import { Orb } from "../Orb";
import { FormatChip } from "./bits";

// Карточка встречи, когда войти пока нельзя: до начала, без одобренной заявки, после завершения.
export function RoomGate({ room, state, tz, requests }: { room: RoomInfo; state: AccessState; tz: string; requests: RoomRequest[] }) {
  const m = useMsg(roomsMessages);
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  // Встреча откроется сама: обновляем страницу в момент начала и когда меняется решение по заявке.
  useEffect(() => {
    if (state === "ended" || state === "banned") return;
    const left = new Date(room.starts_at).getTime() - Date.now();
    const t = left > 0 ? setTimeout(() => router.refresh(), Math.min(left + 800, 2_147_000_000)) : undefined;
    const es = new EventSource("/api/rooms/events");
    es.addEventListener("changed", () => router.refresh());
    return () => {
      clearTimeout(t);
      es.close();
    };
  }, [room.starts_at, state, router]);

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
  const canRequest = room.access === "request" && !room.is_creator && state !== "ended" && state !== "banned";

  const ask = () =>
    start(async () => {
      setError("");
      const res = await requestRoom(room.id);
      if (res.error) setError(m.errors[res.error as keyof typeof m.errors] ?? m.errors.failed);
      router.refresh();
    });

  const decide = (user: string, approve: boolean) =>
    start(async () => {
      await decideRequest(room.id, user, approve);
      router.refresh();
    });

  let text = "";
  if (state === "ended") text = m.endedText;
  else if (state === "banned") text = m.banned;
  else if (room.is_creator) text = m.creatorWait;
  else if (canRequest)
    text = status === "approved" ? m.requestApproved : status === "pending" ? m.requestPending : status === "declined" ? m.requestDeclined : m.needRequest;
  else text = m.opensAuto;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <Link href="/rooms" className="mb-8 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.back}
      </Link>
      <div className="animate-rise rounded-[30px] bg-paper p-6 shadow-soft sm:p-9">
        <Orb size={72} face still={state === "ended"} mood={state === "ended" || state === "banned" ? 3 : 4} className="mb-5" />
        <p className="mb-2 text-sm font-medium text-lilac-deep">{state === "ended" ? m.endedTitle : state === "banned" ? m.title : m.notStartedTitle}</p>
        <h1 className="font-serif text-[26px] leading-tight text-ink sm:text-[32px]">{room.title}</h1>
        {room.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{room.description}</p>}
        <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
          {state !== "ended" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 font-medium text-sky-deep">
              <CalendarIcon className="h-3.5 w-3.5" /> {fill(m.startsAt, { when })}
            </span>
          )}
          <FormatChip format={room.format} label={m.format[room.format]} />
          <span className="rounded-full bg-sand/80 px-3 py-1 text-ink-soft">{m.access[room.access]}</span>
          {room.creator_name && (
            <span className="rounded-full bg-sand/80 px-3 py-1 text-ink-soft">
              {m.creator}: {room.is_creator ? m.you : room.creator_name}
            </span>
          )}
        </div>

        <p role="status" className="mt-6 rounded-2xl bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink">
          {text}
          {state === "not_started" && !room.is_creator && canRequest && status === "approved" && <> {m.opensAuto}</>}
        </p>
        {error && <p className="mt-3 text-sm text-[#b23b33]">{error}</p>}

        {canRequest && !status && (
          <button
            type="button"
            onClick={ask}
            disabled={pending}
            className="mt-5 inline-flex h-12 items-center rounded-[18px] bg-ink px-6 text-[15px] font-medium text-paper shadow-soft transition hover:bg-lilac-deep disabled:opacity-50"
          >
            {m.sendRequest}
          </button>
        )}
        {(state === "ended" || state === "banned") && (
          <Link href="/rooms" className="mt-5 inline-flex h-12 items-center rounded-[18px] bg-ink px-6 text-[15px] font-medium text-paper">
            {m.back}
          </Link>
        )}
      </div>

      {room.is_creator && room.access === "request" && state === "not_started" && (
        <section className="mt-6 animate-rise rounded-[30px] bg-paper p-6 shadow-soft sm:p-8">
          <h2 className="mb-4 font-display text-[18px] font-semibold text-ink">{m.requestsTitle}</h2>
          <RequestList requests={requests} pending={pending} onDecide={decide} />
        </section>
      )}
    </div>
  );
}

export function RequestList({
  requests,
  pending,
  onDecide,
}: {
  requests: RoomRequest[];
  pending: boolean;
  onDecide: (user: string, approve: boolean) => void;
}) {
  const m = useMsg(roomsMessages);
  if (!requests.length) return <p className="text-sm text-ink-soft">{m.noRequests}</p>;
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.user_id} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-milk px-4 py-3">
          <Avatar name={r.name ?? m.someone} size={36} />
          <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{r.name ?? m.someone}</span>
          {r.status === "pending" ? (
            <span className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onDecide(r.user_id, true)}
                className="h-9 rounded-[14px] bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50"
              >
                {m.approve}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onDecide(r.user_id, false)}
                className="h-9 rounded-[14px] bg-paper px-4 text-sm text-ink-soft shadow-soft disabled:opacity-50"
              >
                {m.decline}
              </button>
            </span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-xs ${r.status === "approved" ? "bg-sage-soft text-sage-deep" : "bg-[#ffeeec] text-[#b23b33]"}`}>
              {m.request[r.status]}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
