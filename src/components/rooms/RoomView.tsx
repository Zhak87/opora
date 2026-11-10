"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decideRequest,
  endRoom,
  hideRoomMessage,
  kickRoomMember,
  loadMessages,
  loadPanel,
  muteRoomMember,
  raiseHand,
  reportMember,
  resolveReport,
  sendRoomMessage,
  setRoomMaxSpeakers,
  setRoomSpeaker,
} from "@/lib/rooms/actions";
import type { RoomInfo, RoomMessage, RoomPerson, RoomReport, RoomRequest } from "@/lib/rooms/types";
import { useLocale, useMsg } from "@/i18n/client";
import { INTL } from "@/i18n/config";
import { fill, roomsMessages } from "@/i18n/rooms";
import { BackIcon, SendIcon, ShieldIcon, UsersIcon } from "../icons";
import { Avatar } from "../pro/bits";
import { Orb } from "../Orb";
import { CrisisHelp } from "../course/CrisisHelp";
import { DotsIcon, FormatChip, HandIcon, HeadphonesIcon, LeaveIcon, MicIcon, MicOffIcon, ModeratorBadge, OnlineDot } from "./bits";
import { RequestList } from "./RoomGate";
import { useVoice } from "./useVoice";

type Online = { userId: string; name: string };
type Final = "ended" | "kicked" | null;

export function RoomView({
  me,
  room: initialRoom,
  tz,
  initialMessages,
  initialPeople,
  initialRequests,
  initialReports,
  voiceReady,
}: {
  me: string;
  room: RoomInfo;
  tz: string;
  initialMessages: RoomMessage[];
  initialPeople: RoomPerson[];
  initialRequests: RoomRequest[];
  initialReports: RoomReport[];
  voiceReady: boolean;
}) {
  const m = useMsg(roomsMessages);
  const locale = useLocale();
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState(initialMessages);
  const [peopleList, setPeople] = useState(initialPeople);
  const [requests, setRequests] = useState(initialRequests);
  const [reports, setReports] = useState(initialReports);
  const [online, setOnline] = useState<Online[]>([]);
  const [paused, setPaused] = useState(false);
  const [final, setFinal] = useState<Final>(null);
  const [sheet, setSheet] = useState<"people" | "moderation" | null>(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState<{ user: string; message?: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const creator = room.is_creator;
  const isVoice = room.format === "voice";

  const onRemoved = useCallback(() => router.refresh(), [router]);
  const voice = useVoice(room.id, onRemoved);

  const add = useCallback((msg: RoomMessage) => {
    setMessages((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
  }, []);

  const refreshPanel = useCallback(async () => {
    const p = await loadPanel(room.id);
    setPeople(p.people);
    if (creator) {
      setRequests(p.requests);
      setReports(p.reports);
    }
  }, [room.id, creator]);

  // Живые события комнаты.
  useEffect(() => {
    let wasError = false;
    const es = new EventSource(`/api/rooms/${room.id}/events`);
    const on = (name: string, fn: (data: unknown) => void) => es.addEventListener(name, (e) => fn(JSON.parse((e as MessageEvent).data)));
    es.onopen = () => {
      setPaused(false);
      // После обрыва подтягиваем то, что могли пропустить.
      if (wasError) loadMessages(room.id).then((list) => list.length && setMessages(list));
      wasError = false;
    };
    es.onerror = () => {
      wasError = true;
      // Сервер закрыл вход (комната завершена, человек удалён): страница покажет, что случилось.
      if (es.readyState === EventSource.CLOSED) router.refresh();
      else setPaused(true);
    };
    on("presence", (d) => setOnline(d as Online[]));
    on("message", (d) => add(d as RoomMessage));
    on("flagged", (d) => {
      const { id, flag } = d as { id: string; flag: string };
      setMessages((list) => list.map((x) => (x.id === id ? { ...x, flag } : x)));
    });
    on("hidden", (d) => {
      const { id, hidden, body } = d as { id: string; hidden: boolean; body: string };
      setMessages((list) => list.map((x) => (x.id === id ? { ...x, hidden, body: creator ? x.body : body } : x)));
    });
    on("people", (d) => setPeople(d as RoomPerson[]));
    on("room", (d) => setRoom((r) => ({ ...r, ...(d as Partial<RoomInfo>) })));
    on("reports", () => creator && refreshPanel());
    on("report", () => creator && refreshPanel());
    on("requests", () => creator && refreshPanel());
    on("ended", () => {
      setFinal("ended");
      es.close();
    });
    on("kicked", () => {
      setFinal("kicked");
      es.close();
    });
    return () => es.close();
  }, [room.id, creator, add, refreshPanel, router]);

  const leaveVoice = voice.leave;
  useEffect(() => {
    if (final) leaveVoice();
  }, [final, leaveVoice]);

  // Прокрутка к новым сообщениям, если человек и так внизу.
  const stick = useRef(true);
  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages.length]);

  const byId = useMemo(() => new Map(peopleList.map((p) => [p.user_id, p])), [peopleList]);
  const me_ = byId.get(me);
  const nameOf = (id: string | null, fallback?: string | null) =>
    (id && (byId.get(id)?.name || online.find((o) => o.userId === id)?.name)) || fallback || m.someone;
  const speakers = peopleList.filter((p) => p.role === "speaker" && !p.banned);
  const myRole = me_?.role ?? (creator ? "speaker" : "listener");
  const mutedByHost = Boolean(me_?.muted);
  const handUp = Boolean(me_?.hand);
  const hands = peopleList.filter((p) => p.hand && !p.banned);
  const openCases = reports.length + requests.filter((r) => r.status === "pending").length + hands.length;

  const send = () => {
    const body = text.trim();
    if (!body || pending) return;
    setSendError("");
    start(async () => {
      const res = await sendRoomMessage(room.id, body);
      if (res.message) {
        add(res.message);
        setText("");
        stick.current = true;
        area.current?.focus();
      } else setSendError(m.errors[res.error as keyof typeof m.errors] ?? m.errors.failed);
    });
  };

  const act = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.error) setNotice(m.errors[res.error as keyof typeof m.errors] ?? m.errors.failed);
      else after?.();
    });

  const time = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

  if (final) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <Orb size={96} face mood={3} className="mb-6" />
        <h1 role="status" className="font-serif text-[28px] leading-tight text-ink">
          {final === "ended" ? m.endedTitle : m.kickedTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{final === "ended" ? m.endedText : m.kickedText}</p>
        <Link href="/rooms" className="mt-7 inline-flex h-12 items-center rounded-[18px] bg-ink px-6 text-[15px] font-medium text-paper shadow-soft">
          {m.back}
        </Link>
      </div>
    );
  }

  /* ---------- Части интерфейса ---------- */

  const personRow = (p: { user_id: string; name: string | null; role: "speaker" | "listener"; hand: boolean; muted: boolean }, compact = false) => {
    const isMe = p.user_id === me;
    const talking = voice.speaking.has(p.user_id);
    const isCreator = p.user_id === room.creator_id;
    return (
      <li key={p.user_id} className="flex items-center gap-3 rounded-[18px] px-2 py-1.5">
        <span className={`rounded-full p-0.5 transition ${talking ? "ring-2 ring-sage ring-offset-2 ring-offset-paper" : ""}`}>
          <Avatar name={nameOf(p.user_id, p.name)} size={compact ? 32 : 38} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] text-ink">
            {nameOf(p.user_id, p.name)}
            {isMe && <span className="text-ink-faint"> · {m.you}</span>}
          </span>
          <span className="flex flex-wrap gap-x-2 text-[12px] text-ink-faint">
            {isCreator && <span className="text-lilac-deep">{m.creator}</span>}
            {talking && <span className="text-sage-deep">{m.speakingTag}</span>}
            {voice.inVoice.has(p.user_id) && !talking && <span>{m.inVoice}</span>}
            {p.muted && <span className="text-[#b23b33]">{m.mutedTag}</span>}
            {p.hand && <span className="text-peach-deep">✋ {m.hand}</span>}
          </span>
        </span>
        {!isMe && (
          <PersonMenu
            label={m.more}
            items={[
              ...(creator && isVoice && p.role === "listener" ? [{ label: m.makeSpeaker, run: () => act(() => setRoomSpeaker(room.id, p.user_id, true)) }] : []),
              ...(creator && isVoice && p.role === "speaker" && !isCreator ? [{ label: m.makeListener, run: () => act(() => setRoomSpeaker(room.id, p.user_id, false)) }] : []),
              ...(creator && isVoice ? [{ label: p.muted ? m.unmute : m.mute, run: () => act(() => muteRoomMember(room.id, p.user_id, !p.muted)) }] : []),
              ...(!isCreator ? [{ label: m.report, run: () => setReporting({ user: p.user_id }) }] : []),
              ...(creator
                ? [{ label: m.kick, danger: true, run: () => confirm(m.kickConfirm) && act(() => kickRoomMember(room.id, p.user_id)) }]
                : []),
            ]}
          />
        )}
      </li>
    );
  };

  // Кто сейчас в комнате: онлайн-люди с ролями из базы.
  const here = online.map((o) => {
    const p = byId.get(o.userId);
    return { user_id: o.userId, name: p?.name ?? o.name, role: p?.role ?? "listener", hand: Boolean(p?.hand), muted: Boolean(p?.muted) } as const;
  });
  const hereSpeakers = here.filter((p) => p.role === "speaker");
  const hereListeners = here.filter((p) => p.role !== "speaker");

  const peoplePanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
          <OnlineDot active /> {m.nowHere} · {online.length}
        </p>
        <ul className="space-y-0.5">
          <li className="flex items-center gap-3 rounded-[18px] px-2 py-1.5">
            <Orb size={38} face still />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[14.5px] text-ink">
                {m.moderator} <ModeratorBadge tag={m.moderatorTag} />
              </span>
              <span className="block text-[12px] leading-snug text-ink-faint">{m.moderatorNote}</span>
            </span>
          </li>
        </ul>
      </div>
      {isVoice ? (
        <>
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {m.speakers} · {fill(m.speakersCount, { n: speakers.length, max: room.max_speakers })}
            </p>
            <ul className="space-y-0.5">{hereSpeakers.map((p) => personRow(p))}</ul>
          </div>
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {m.listeners} · {hereListeners.length}
            </p>
            <ul className="space-y-0.5">{hereListeners.map((p) => personRow(p, true))}</ul>
          </div>
        </>
      ) : (
        <ul className="space-y-0.5">{here.map((p) => personRow(p, true))}</ul>
      )}
    </div>
  );

  const moderationPanel = creator && (
    <div className="space-y-6">
      {isVoice && hands.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-ink">✋ {m.hand}</h3>
          <ul className="space-y-2">
            {hands.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3 rounded-[18px] bg-milk px-3 py-2">
                <Avatar name={nameOf(p.user_id, p.name)} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{nameOf(p.user_id, p.name)}</span>
                <button type="button" disabled={pending} onClick={() => act(() => setRoomSpeaker(room.id, p.user_id, true))} className="h-9 rounded-[14px] bg-ink px-3 text-sm text-paper disabled:opacity-50">
                  {m.makeSpeaker}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3 className="mb-2 text-sm font-medium text-ink">{m.panelTitle}</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-ink-soft">{m.reportsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-[20px] border border-line/70 bg-milk p-3.5">
                <p className="text-xs text-ink-faint">{r.source === "ai" ? m.fromAi : fill(m.fromUser, { name: r.reporter_name ?? m.someone })}</p>
                <p className="mt-1 text-sm font-medium text-ink">{nameOf(r.target_id, r.target_name)}</p>
                {r.message_body && <p className="mt-1 line-clamp-3 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">«{r.message_body}»</p>}
                {r.reason && <p className="mt-1 text-xs text-ink-soft">{r.reason}</p>}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.message_id && (
                    <button type="button" disabled={pending} onClick={() => act(() => hideRoomMessage(room.id, r.message_id!, true), refreshPanel)} className="h-8 rounded-[12px] bg-ink px-3 text-[13px] text-paper disabled:opacity-50">
                      {m.hide}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirm(m.kickConfirm) && act(() => kickRoomMember(room.id, r.target_id), refreshPanel)}
                    className="h-8 rounded-[12px] border border-[#f7d2cf] bg-paper px-3 text-[13px] text-[#c2453d] disabled:opacity-50"
                  >
                    {m.kick}
                  </button>
                  <button type="button" disabled={pending} onClick={() => act(() => resolveReport(room.id, r.id), refreshPanel)} className="h-8 rounded-[12px] px-3 text-[13px] text-ink-soft hover:bg-sand disabled:opacity-50">
                    {m.resolve}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {room.access === "request" && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-ink">{m.requestsTitle}</h3>
          <RequestList requests={requests} pending={pending} onDecide={(u, ok) => act(() => decideRequest(room.id, u, ok), refreshPanel)} />
        </section>
      )}
      {isVoice && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-ink">{m.maxSpeakers}</h3>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(new FormData(e.currentTarget).get("max"));
              act(() => setRoomMaxSpeakers(room.id, n));
            }}
          >
            <input name="max" type="number" min={1} max={20} defaultValue={room.max_speakers} className="h-10 w-20 rounded-[14px] bg-milk px-3 text-[15px] text-ink outline-none focus:ring-4 focus:ring-lilac-soft" />
            <button type="submit" disabled={pending} className="h-10 rounded-[14px] bg-paper px-4 text-sm text-ink shadow-soft disabled:opacity-50">
              {m.save}
            </button>
          </form>
          <p className="mt-1.5 text-xs text-ink-faint">{m.fSpeakersHint}</p>
        </section>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(m.endConfirm) && act(() => endRoom(room.id), () => setFinal("ended"))}
        className="h-11 w-full rounded-[16px] border border-[#f7d2cf] bg-paper text-[15px] text-[#c2453d] transition hover:bg-[#ffeeec] disabled:opacity-50"
      >
        {m.end}
      </button>
    </div>
  );

  /* ---------- Голос ---------- */

  const vStatus = voice.status;
  const voiceLine =
    vStatus === "off" || (!voiceReady && vStatus !== "idle")
      ? m.errors.voice_off
      : mutedByHost && vStatus === "connected"
        ? m.mutedByHost
        : voice.micProblem
        ? m.status[voice.micProblem]
        : vStatus === "connecting" || vStatus === "reconnecting" || vStatus === "failed"
          ? m.status[vStatus]
          : vStatus === "connected"
            ? mutedByHost
              ? m.mutedByHost
              : myRole === "speaker"
                ? `${m.status.connected}. ${m.notRecorded}`
                : handUp
                  ? m.handWaiting
                  : `${m.status.connected}. ${m.notRecorded}`
            : m.listenHint;

  const speakingNow = hereSpeakers.filter((p) => voice.speaking.has(p.user_id));

  const voiceStage = isVoice && (
    <section className="rounded-[24px] bg-gradient-to-br from-lilac-soft/70 via-paper to-mist/70 p-3.5 shadow-soft sm:rounded-[26px] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <MicIcon className="h-4 w-4 text-lilac-deep" /> {m.speakers}
          <span className="font-normal text-ink-faint">{fill(m.speakersCount, { n: speakers.length, max: room.max_speakers })}</span>
        </p>
        <p className="text-xs text-ink-faint">
          {m.listeners}: {hereListeners.length}
        </p>
      </div>
      <ul className="mt-2.5 flex gap-3 overflow-x-auto pb-1 sm:mt-3">
        {hereSpeakers.map((p) => {
          const talking = voice.speaking.has(p.user_id);
          return (
            <li key={p.user_id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
              <span className={`relative rounded-full p-0.5 transition-all duration-300 ${talking ? "scale-105 ring-[3px] ring-sage ring-offset-2 ring-offset-paper" : ""}`}>
                <Avatar name={nameOf(p.user_id, p.name)} size={44} />
                {(p.muted || (voice.inVoice.has(p.user_id) && !talking && p.user_id === me && !voice.micOn)) && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-paper text-ink-faint shadow-soft">
                    <MicOffIcon className="h-3 w-3" />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-[11.5px] text-ink-soft">{p.user_id === me ? m.you : nameOf(p.user_id, p.name)}</span>
            </li>
          );
        })}
        {hereSpeakers.length === 0 && <li className="py-3 text-sm text-ink-faint">{m.nobodySpeaks}</li>}
      </ul>
      <p className="sr-only" aria-live="polite">
        {speakingNow.map((p) => `${nameOf(p.user_id, p.name)} ${m.speakingTag}`).join(", ")}
      </p>
      <p role="status" className={`mt-2 text-[13px] leading-snug sm:mt-3 ${voice.micProblem || vStatus === "failed" || vStatus === "off" ? "text-[#b23b33]" : "text-ink-soft"}`}>
        {voiceLine}
      </p>
    </section>
  );

  const voiceControls = isVoice && (
    <div className="flex items-center gap-2">
      {vStatus === "idle" || vStatus === "failed" || vStatus === "off" ? (
        <button
          type="button"
          onClick={voice.join}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] bg-ink px-4 text-[15px] font-medium text-paper shadow-soft transition hover:bg-lilac-deep sm:flex-none"
        >
          <HeadphonesIcon className="h-5 w-5" /> {m.listen}
        </button>
      ) : (
        <>
          {myRole === "speaker" && voice.canPublish && !mutedByHost ? (
            <button
              type="button"
              onClick={voice.toggleMic}
              aria-pressed={voice.micOn}
              aria-label={voice.micOn ? m.micOn : m.micOff}
              className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] px-4 text-[15px] font-medium shadow-soft transition sm:flex-none ${
                voice.micOn ? "bg-sage-deep text-paper" : "bg-paper text-ink"
              }`}
            >
              {voice.micOn ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
              <span>{voice.micOn ? m.micOn : m.micOff}</span>
            </button>
          ) : (
            myRole !== "speaker" && (
              <button
                type="button"
                onClick={() => act(() => raiseHand(room.id, !handUp))}
                aria-pressed={handUp}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] px-4 text-[15px] font-medium shadow-soft transition sm:flex-none ${
                  handUp ? "bg-peach-soft text-peach-deep" : "bg-paper text-ink"
                }`}
              >
                <HandIcon className="h-5 w-5" /> {handUp ? m.lowerHand : m.raiseHand}
              </button>
            )
          )}
          <button
            type="button"
            onClick={voice.leave}
            aria-label={m.leaveVoice}
            title={m.leaveVoice}
            className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-paper px-4 text-[15px] text-[#c2453d] shadow-soft"
          >
            <LeaveIcon className="h-5 w-5" /> <span className="hidden sm:inline">{m.leaveVoice}</span>
          </button>
        </>
      )}
    </div>
  );

  /* ---------- Чат ---------- */

  const renderMessage = (x: RoomMessage, i: number) => {
    if (x.kind === "moderator") {
      return (
        <li key={x.id} className="flex gap-3 py-1.5">
          <Orb size={32} face still className="mt-0.5 shrink-0" />
          <div className="min-w-0 max-w-[88%] rounded-[20px] rounded-tl-md bg-gradient-to-br from-lilac-soft/80 to-mist/70 px-4 py-3">
            <p className="mb-1 flex items-center gap-2 text-[12.5px] font-medium text-lilac-deep">
              {m.moderator} <ModeratorBadge tag={m.moderatorTag} />
              <span className="font-normal text-ink-faint">{time(x.created_at)}</span>
            </p>
            {x.flag === "greeting" ? (
              <div className="text-[14.5px] leading-relaxed text-ink">
                <p>{m.greetingTitle}</p>
                <ul className="mt-1.5 space-y-1">
                  {m.rules.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="text-lilac-deep">·</span> {r}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-ink-soft">{m.greetingFoot}</p>
              </div>
            ) : x.flag === "crisis" ? (
              <CrisisHelp lead={m.crisisLead} />
            ) : (
              <p className="text-[14.5px] leading-relaxed text-ink">
                {m.reminder[x.body as keyof typeof m.reminder] ?? m.reminder.insult} <span className="text-ink-soft">{m.reminderFoot}</span>
              </p>
            )}
          </div>
        </li>
      );
    }
    const mine = x.sender_id === me;
    const prev = messages[i - 1];
    const sameAuthor = prev && prev.kind === "user" && prev.sender_id === x.sender_id;
    const name = nameOf(x.sender_id, x.sender_name);
    const fromCreator = x.sender_id === room.creator_id;
    return (
      <li key={x.id} className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${sameAuthor ? "pt-0.5" : "pt-2.5"}`}>
        <span className="w-8 shrink-0">{!sameAuthor && !mine && <Avatar name={name} size={32} />}</span>
        <div className={`flex min-w-0 max-w-[82%] flex-col sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
          {!sameAuthor && !mine && (
            <p className="mb-0.5 px-1 text-[12.5px] text-ink-soft">
              {name}
              {fromCreator && <span className="ml-1.5 text-lilac-deep">· {m.creator}</span>}
            </p>
          )}
          <div
            className={`relative rounded-[20px] px-4 py-2.5 ${
              x.hidden ? "border border-dashed border-sand-deep bg-transparent" : mine ? "rounded-tr-md bg-ink text-paper" : "rounded-tl-md border border-line/70 bg-paper text-ink"
            }`}
          >
            {x.hidden && !creator ? (
              <p className="text-[14px] italic text-ink-faint">{m.hidden}</p>
            ) : (
              <>
                <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${x.hidden ? "text-ink-faint line-through" : ""}`}>{x.body}</p>
                {x.hidden && <p className="mt-1 text-[11.5px] text-ink-faint">{m.hiddenMine}</p>}
              </>
            )}
            <p className={`mt-0.5 text-right text-[11px] ${mine && !x.hidden ? "text-paper/60" : "text-ink-faint"}`}>{time(x.created_at)}</p>
          </div>
          {x.flag && x.flag !== "crisis" && !x.hidden && (creator || mine) && (
            <p className="mt-1 flex items-center gap-1 px-1 text-[11.5px] text-peach-deep">
              <ShieldIcon className="h-3.5 w-3.5" /> {m.flagged}
            </p>
          )}
        </div>
        {!mine && x.sender_id && (
          <div className="self-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <PersonMenu
              label={m.more}
              items={
                creator
                  ? [
                      { label: x.hidden ? m.show : m.hide, run: () => act(() => hideRoomMessage(room.id, x.id, !x.hidden), () => setMessages((l) => l.map((y) => (y.id === x.id ? { ...y, hidden: !x.hidden } : y)))) },
                      { label: m.kick, danger: true, run: () => confirm(m.kickConfirm) && act(() => kickRoomMember(room.id, x.sender_id!)) },
                    ]
                  : [{ label: m.report, run: () => setReporting({ user: x.sender_id!, message: x.id }) }]
              }
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-dvh flex-col bg-milk">
      {/* Шапка */}
      <header className="z-20 border-b border-line/60 bg-paper/85 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-2 sm:gap-3">
          <Link href="/rooms" aria-label={m.back} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-ink-soft hover:bg-sand hover:text-ink">
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[16.5px] font-semibold leading-tight text-ink sm:text-[19px]">{room.title}</h1>
            <p className="flex items-center gap-2 truncate text-[12.5px] text-ink-soft">
              <OnlineDot active={online.length > 0} /> {fill(m.online, { n: online.length })}
              <span className="hidden sm:inline">
                <FormatChip format={room.format} label={m.format[room.format]} />
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheet(sheet === "people" ? null : "people")}
            aria-label={m.peopleTitle}
            className="flex h-10 items-center gap-1.5 rounded-[14px] px-3 text-sm text-ink-soft hover:bg-sand hover:text-ink lg:hidden"
          >
            <UsersIcon className="h-5 w-5" /> {online.length}
          </button>
          {creator && (
            <button
              type="button"
              onClick={() => setSheet(sheet === "moderation" ? null : "moderation")}
              aria-label={m.panelOpen}
              className="relative flex h-10 items-center gap-1.5 rounded-[14px] px-3 text-sm text-ink-soft hover:bg-sand hover:text-ink"
            >
              <ShieldIcon className="h-5 w-5" />
              <span className="hidden sm:inline">{m.panelOpen}</span>
              {openCases > 0 && (
                <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lilac-deep px-1 text-[10px] font-semibold text-paper">{openCases}</span>
              )}
            </button>
          )}
          <Link href="/rooms" className="hidden h-10 items-center gap-1.5 rounded-[14px] px-3 text-sm text-ink-soft hover:bg-sand hover:text-ink sm:flex">
            <LeaveIcon className="h-5 w-5" /> {m.leave}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-5 sm:px-6 sm:pt-4">
        {/* Чат */}
        <main className="flex min-h-0 flex-1 flex-col">
          {room.description && <p className="hidden px-1 pb-3 text-[14px] leading-relaxed text-ink-soft sm:block">{room.description}</p>}
          {isVoice && <div className="px-3 pt-3 sm:px-0 sm:pt-0 lg:hidden">{voiceStage}</div>}
          {(paused || notice) && (
            <p role="status" className="mx-3 mt-3 rounded-2xl bg-mist px-4 py-2 text-[13px] text-sky-deep sm:mx-0">
              {paused ? m.chatPaused : notice}
              {notice && !paused && (
                <button type="button" onClick={() => setNotice("")} className="ml-2 text-ink-faint">
                  ×
                </button>
              )}
            </p>
          )}
          <div
            ref={box}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-1"
            aria-label={m.chat}
          >
            <ul aria-live="polite" className="pb-2">
              {messages.map(renderMessage)}
            </ul>
            {messages.filter((x) => x.kind === "user").length === 0 && <p className="mt-4 text-center text-sm text-ink-faint">{m.emptyChat}</p>}
          </div>

          {/* Низ экрана: голос и поле сообщения всегда под рукой */}
          <div className="border-t border-line/60 bg-paper/90 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:rounded-t-[24px] sm:border sm:px-4">
            {isVoice && <div className="mb-2.5">{voiceControls}</div>}
            {sendError && <p className="mb-2 px-1 text-sm text-[#b23b33]">{sendError}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={area}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={m.placeholder}
                aria-label={m.placeholder}
                className="max-h-32 min-h-[46px] flex-1 resize-none rounded-[16px] border-2 border-transparent bg-milk px-4 py-2.5 text-[15px] leading-relaxed text-ink outline-none transition [field-sizing:content] placeholder:text-ink-faint focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft"
              />
              <button
                type="submit"
                disabled={!text.trim() || pending}
                aria-label={m.send}
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] bg-ink text-paper transition hover:bg-lilac-deep active:scale-90 disabled:opacity-40"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-2 flex items-center gap-1.5 px-1 text-[11.5px] leading-snug text-ink-faint">
              <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1 sm:line-clamp-none">{m.moderatorNote}</span>
            </p>
          </div>
        </main>

        {/* Компьютер: справа голос и участники */}
        <aside className="hidden w-[320px] shrink-0 flex-col gap-4 overflow-y-auto pb-6 lg:flex">
          {voiceStage}
          <div className="rounded-[26px] bg-paper p-4 shadow-soft">{peoplePanel}</div>
        </aside>
      </div>

      {/* Выезжающие панели: участники (телефон) и модерация */}
      {sheet && (
        <div className="fixed inset-0 z-40 flex justify-end bg-ink/20 backdrop-blur-[2px]" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-label={sheet === "people" ? m.peopleTitle : m.panelTitle}
            onClick={(e) => e.stopPropagation()}
            className="mt-auto max-h-[85dvh] w-full animate-rise overflow-y-auto rounded-t-[30px] bg-paper p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-lift sm:m-3 sm:max-h-[calc(100dvh-24px)] sm:w-[400px] sm:rounded-[30px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[18px] font-semibold text-ink">{sheet === "people" ? m.peopleTitle : m.panelTitle}</h2>
              <button type="button" onClick={() => setSheet(null)} aria-label={m.cancel} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-sand">
                ×
              </button>
            </div>
            {sheet === "people" ? peoplePanel : moderationPanel}
            <Link href="/rooms" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-[16px] bg-milk text-[15px] text-ink-soft sm:hidden">
              <LeaveIcon className="h-5 w-5" /> {m.leave}
            </Link>
          </div>
        </div>
      )}

      {reporting && (
        <ReportDialog
          onClose={() => setReporting(null)}
          onSend={(reason) =>
            act(
              () => reportMember(room.id, reporting.user, reason, reporting.message),
              () => {
                setReporting(null);
                setNotice(m.reportDone);
              },
            )
          }
          pending={pending}
        />
      )}

      {/* Сюда браузер подключает звук спикеров */}
      <div ref={voice.audioBox} className="hidden" aria-hidden />
    </div>
  );
}

function PersonMenu({ label, items }: { label: string; items: { label: string; run: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-sand hover:text-ink"
      >
        <DotsIcon className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-[18px] bg-paper py-1.5 shadow-lift">
            {items.map((it) => (
              <li key={it.label}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    it.run();
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-[14.5px] transition hover:bg-milk ${it.danger ? "text-[#c2453d]" : "text-ink"}`}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ReportDialog({ onClose, onSend, pending }: { onClose: () => void; onSend: (reason: string) => void; pending: boolean }) {
  const m = useMsg(roomsMessages);
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <form
        role="dialog"
        aria-label={m.reportTitle}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSend(reason);
        }}
        className="w-full max-w-md animate-rise rounded-t-[30px] bg-paper p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-lift sm:rounded-[30px]"
      >
        <h2 className="font-display text-[18px] font-semibold text-ink">{m.reportTitle}</h2>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-ink-soft">{m.reportReason}</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder={m.reportPh}
            autoFocus
            className="w-full resize-none rounded-[18px] border-2 border-transparent bg-milk px-4 py-3 text-[15px] text-ink outline-none focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={pending} className="h-11 flex-1 rounded-[16px] bg-ink text-[15px] font-medium text-paper disabled:opacity-50">
            {m.reportSend}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-[16px] px-5 text-[15px] text-ink-soft hover:bg-sand">
            {m.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
