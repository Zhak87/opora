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
import { BackIcon, SendIcon, ShieldIcon, TalkIcon, UsersIcon } from "../icons";
import { Avatar } from "../pro/bits";
import { Orb } from "../Orb";
import { CrisisHelp } from "../course/CrisisHelp";
import { DotsIcon, HandIcon, HeadphonesIcon, LeaveIcon, MicIcon, MicOffIcon, ModeratorBadge, OnlineDot } from "./bits";
import { RequestList } from "./RoomGate";
import { useVoice } from "./useVoice";
import { RoomDialog } from "./RoomDialog";
import s from "./Rooms.module.css";

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
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; label: string; run: () => void } | null>(null);
  const [reportError, setReportError] = useState("");
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
      if (wasError) {
        loadMessages(room.id).then((list) => list.length && setMessages(list)).catch(() => {});
        refreshPanel().catch(() => {});
      }
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
    on("reports", () => creator && refreshPanel().catch(() => {}));
    on("report", () => creator && refreshPanel().catch(() => {}));
    on("requests", () => creator && refreshPanel().catch(() => {}));
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
  const myRole = me_?.role ?? room.my_role ?? (creator ? "speaker" : "listener");
  const mutedByHost = Boolean(me_?.muted);
  const handUp = Boolean(me_?.hand);
  const hands = peopleList.filter((p) => p.hand && !p.banned);
  const openCases = reports.length + requests.filter((r) => r.status === "pending").length + hands.length;

  const send = () => {
    const body = text.trim();
    if (!body || pending || paused) return;
    setSendError("");
    start(async () => {
      const res = await sendRoomMessage(room.id, body).catch(() => ({ message: undefined, error: "failed" }));
      if (res.message) {
        add(res.message);
        setText((draft) => draft.trim() === body ? "" : draft);
        stick.current = true;
        const scroller = box.current;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
        area.current?.focus();
      } else setSendError(m.errors[res.error as keyof typeof m.errors] ?? m.errors.failed);
    });
  };

  const act = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setNotice("");
      const res = await fn().catch(() => ({ error: "failed" }));
      if (res.error) setNotice(m.errors[res.error as keyof typeof m.errors] ?? m.errors.failed);
      else after?.();
    });

  const confirmRemoval = (userId: string) => setConfirmation({
    title: m.confirmRemove,
    description: m.kickConfirm,
    label: m.kick,
    run: () => act(() => kickRoomMember(room.id, userId), refreshPanel),
  });

  const openReport = (user: string, message?: string) => {
    setReportError("");
    setReporting({ user, message });
  };

  const time = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

  if (final) {
    return (
      <main className={`${s.scope} ${s.gatePage}`}>
        <div className={s.empty}>
          <div className={s.tile}><LeaveIcon /></div>
          <h1 role="status">{final === "ended" ? m.endedTitle : m.kickedTitle}</h1>
          <p>{final === "ended" ? m.endedText : m.kickedText}</p>
          <Link href="/rooms" className={s.primary}><BackIcon /> {m.back}</Link>
        </div>
      </main>
    );
  }

  const personRow = (p: { user_id: string; name: string | null; role: "speaker" | "listener"; hand: boolean; muted: boolean }, compact = false) => {
    const isMe = p.user_id === me;
    const talking = voice.speaking.has(p.user_id);
    const isCreator = p.user_id === room.creator_id;
    return (
      <li key={p.user_id} className={s.personRow}>
        <span className={`rounded-full p-0.5 transition ${talking ? "ring-2 ring-sage ring-offset-2 ring-offset-paper" : ""}`}>
          <Avatar name={nameOf(p.user_id, p.name)} size={compact ? 32 : 38} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] text-ink">
            {nameOf(p.user_id, p.name)}
            {isMe && <span className="text-ink-soft"> · {m.you}</span>}
          </span>
          <span className="flex flex-wrap gap-x-2 text-[12px] text-ink-soft">
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
              ...(!isCreator ? [{ label: m.report, run: () => openReport(p.user_id) }] : []),
              ...(creator
                ? [{ label: m.kick, danger: true, run: () => confirmRemoval(p.user_id) }]
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
    <div className={s.peoplePanel}>
      <div>
        <p className="mb-2 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
          <OnlineDot active={online.length > 0} /> {m.nowHere} · {online.length}
        </p>
        <ul className="space-y-0.5">
          <li className={s.personRow}>
            <Orb size={38} face still />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[14.5px] text-ink">
                {m.moderator} <ModeratorBadge tag={m.moderatorTag} />
              </span>
              <span className="block text-[12px] leading-snug text-ink-soft">{m.moderatorNote}</span>
            </span>
          </li>
        </ul>
      </div>
      {isVoice ? (
        <>
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {m.speakers} · {hereSpeakers.length}
            </p>
            <ul className="space-y-0.5">{hereSpeakers.map((p) => personRow(p))}</ul>
          </div>
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
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
    <div className={s.moderation}>
      {isVoice && hands.length > 0 && (
        <section>
          <h3><HandIcon /> {m.hand}</h3>
          <ul className="space-y-2">
            {hands.map((p) => (
              <li key={p.user_id} className="flex items-center gap-3 rounded-[18px] bg-milk px-3 py-2">
                <Avatar name={nameOf(p.user_id, p.name)} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{nameOf(p.user_id, p.name)}</span>
                <button type="button" disabled={pending} onClick={() => act(() => setRoomSpeaker(room.id, p.user_id, true))} className={s.primary}>
                  {m.makeSpeaker}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3>{m.reportsTitle}</h3>
        {reports.length === 0 ? (
          <p className="text-sm text-ink-soft">{m.reportsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-[20px] border border-line/70 bg-milk p-3.5">
                <p className="text-xs text-ink-soft">{r.source === "ai" ? m.fromAi : fill(m.fromUser, { name: r.reporter_name ?? m.someone })}</p>
                <p className="mt-1 text-sm font-medium text-ink">{nameOf(r.target_id, r.target_name)}</p>
                {r.message_body && <p className="mt-1 line-clamp-3 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">«{r.message_body}»</p>}
                {r.reason && <p className="mt-1 text-xs text-ink-soft">{r.reason}</p>}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.message_id && (
                    <button type="button" disabled={pending} onClick={() => act(() => hideRoomMessage(room.id, r.message_id!, true), refreshPanel)} className={s.primary}>
                      {m.hide}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirmRemoval(r.target_id)}
                    className={s.danger}
                  >
                    {m.kick}
                  </button>
                  <button type="button" disabled={pending} onClick={() => act(() => resolveReport(room.id, r.id), refreshPanel)} className={s.secondary}>
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
          <h3>{m.requestsTitle}</h3>
          <RequestList requests={requests} pending={pending} onDecide={(u, ok) => act(() => decideRequest(room.id, u, ok), refreshPanel)} />
        </section>
      )}
      {isVoice && (
        <section>
          <h3><label htmlFor="room-speaker-limit">{m.maxSpeakers}</label></h3>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(new FormData(e.currentTarget).get("max"));
              act(() => setRoomMaxSpeakers(room.id, n));
            }}
          >
            <input id="room-speaker-limit" name="max" type="number" min={1} max={20} required defaultValue={room.max_speakers} className={`${s.input} ${s.shortInput}`} />
            <button type="submit" disabled={pending} className={s.secondary}>
              {m.save}
            </button>
          </form>
          <p className="mt-1.5 text-xs text-ink-soft">{m.fSpeakersHint}</p>
        </section>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirmation({
          title: m.end,
          description: m.endConfirm,
          label: m.end,
          run: () => act(() => endRoom(room.id), () => setFinal("ended")),
        })}
        className={s.danger}
      >
        {m.end}
      </button>
    </div>
  );

  /* ---------- Голос ---------- */

  const vStatus = voice.status;
  const voiceLine = !voiceReady || vStatus === "off" ? m.errors.voice_off
    : voice.micProblem ? m.status[voice.micProblem]
    : vStatus !== "idle" && vStatus !== "connected" ? m.status[vStatus]
    : vStatus === "idle" ? creator ? m.notRecorded : m.listenHint
    : mutedByHost ? m.mutedByHost
    : handUp ? m.handWaiting
    : `${m.status.connected}. ${m.notRecorded}`;

  const speakingNow = hereSpeakers.filter((p) => voice.speaking.has(p.user_id));

  const voiceStage = isVoice && (
    <section className={`${s.sideCard} ${s.voiceStage}`}>
      <div className={s.voiceHeader}>
        <h2><HeadphonesIcon /> {m.voiceTitle}</h2>
        <p>{m.speakers} · {fill(m.speakersCount, { n: speakers.length, max: room.max_speakers })}</p>
      </div>
      <ul className={s.speakerList}>
        {hereSpeakers.map((p) => {
          const talking = voice.speaking.has(p.user_id);
          return (
            <li key={p.user_id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
              <span className={`relative rounded-full p-0.5 transition-all duration-300 ${talking ? "scale-105 ring-[3px] ring-sage ring-offset-2 ring-offset-paper" : ""}`}>
                <Avatar name={nameOf(p.user_id, p.name)} size={44} />
                {(p.muted || (voice.inVoice.has(p.user_id) && !talking && p.user_id === me && !voice.micOn)) && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-paper text-ink-soft shadow-soft">
                    <MicOffIcon className="h-3 w-3" />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-[11.5px] text-ink-soft">{p.user_id === me ? m.you : nameOf(p.user_id, p.name)}</span>
            </li>
          );
        })}
        {hereSpeakers.length === 0 && <li className="text-sm text-ink-soft">{m.nobodySpeaks}</li>}
      </ul>
      <p className="sr-only" aria-live="polite">
        {speakingNow.map((p) => `${nameOf(p.user_id, p.name)} ${m.speakingTag}`).join(", ")}
      </p>
      <p role="status" className={s.voiceStatus}>
        {voiceLine}
      </p>
      {voiceReady && vStatus !== "off" && voiceControls()}
    </section>
  );

  function voiceControls() {
    return <div className={s.voiceControls}>
      {vStatus === "idle" || vStatus === "failed" || vStatus === "off" ? (
        <button
          type="button"
          onClick={voice.join}
          className={s.primary}
        >
          <HeadphonesIcon className="h-5 w-5" /> {m.listen}
        </button>
      ) : (
        <>
          {myRole === "speaker" && voice.canPublish && !mutedByHost && vStatus === "connected" ? (
            <button
              type="button"
              onClick={voice.toggleMic}
              aria-pressed={voice.micOn}
              aria-label={voice.micOn ? m.micOn : m.micOff}
              className={s.secondary}
            >
              {voice.micOn ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
              <span>{voice.micOn ? m.micOn : m.micOff}</span>
            </button>
          ) : (
            myRole !== "speaker" && vStatus === "connected" && (
              <button
                type="button"
                onClick={() => act(() => raiseHand(room.id, !handUp))}
                disabled={pending}
                aria-pressed={handUp}
                className={s.secondary}
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
            className={s.secondary}
          >
            <LeaveIcon className="h-5 w-5" /> <span>{m.leaveVoice}</span>
          </button>
        </>
      )}
    </div>;
  }

  /* ---------- Чат ---------- */

  const renderMessage = (x: RoomMessage, i: number) => {
    if (x.kind === "moderator") {
      return (
        <li key={x.id} className="flex gap-3 py-1.5">
          <Orb size={32} face still className="mt-0.5 shrink-0" />
          <div className={s.moderatorMessage}>
            <p className={s.messageMeta}>
              {m.moderator} <ModeratorBadge tag={m.moderatorTag} />
              <time dateTime={x.created_at}>{time(x.created_at)}</time>
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
      <li key={x.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${sameAuthor ? "pt-0.5" : "pt-2.5"}`}>
        <span className="w-8 shrink-0">{!sameAuthor && !mine && <Avatar name={name} size={32} />}</span>
        <div className={`flex min-w-0 max-w-[82%] flex-col sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
          {!sameAuthor && !mine && (
            <p className={s.author}>
              {name}
              {fromCreator && <span className="ml-1.5 text-lilac-deep">· {m.creator}</span>}
            </p>
          )}
          <div
            className={s.bubble} data-mine={mine || undefined} data-hidden={x.hidden || undefined}
          >
            {x.hidden && !creator ? (
              <p className="text-[14px] italic text-ink-soft">{m.hidden}</p>
            ) : (
              <>
                <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${x.hidden ? "text-ink-soft line-through" : ""}`}>{x.body}</p>
                {x.hidden && <p className="mt-1 text-[11.5px] text-ink-soft">{m.hiddenMine}</p>}
              </>
            )}
            <time dateTime={x.created_at}>{time(x.created_at)}</time>
          </div>
          {x.flag && x.flag !== "crisis" && !x.hidden && (creator || mine) && (
            <p className="mt-1 flex items-center gap-1 px-1 text-[11.5px] text-peach-deep">
              <ShieldIcon className="h-3.5 w-3.5" /> {m.flagged}
            </p>
          )}
        </div>
        {!mine && x.sender_id && (
          <div className="self-center">
            <PersonMenu
              label={m.more}
              items={
                creator
                  ? [
                      { label: x.hidden ? m.show : m.hide, run: () => act(() => hideRoomMessage(room.id, x.id, !x.hidden), () => setMessages((l) => l.map((y) => (y.id === x.id ? { ...y, hidden: !x.hidden } : y)))) },
                      { label: m.kick, danger: true, run: () => confirmRemoval(x.sender_id!) },
                    ]
                  : [{ label: m.report, run: () => openReport(x.sender_id!, x.id) }]
              }
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={`${s.scope} ${s.roomPage}`}>
      <header className={s.roomHeader}>
        <Link href="/rooms" className={s.iconButton} aria-label={m.back} title={m.back}><BackIcon /></Link>
        <div className={s.roomHeading}>
          <h1>{room.title}</h1>
          <div className={s.meta}>
            <span><OnlineDot active={online.length > 0} /> {fill(m.online, { n: online.length })}</span>
            <span>{m.format[room.format]}</span>
          </div>
        </div>
        <div className={s.toolbar}>
          <button type="button" className={`${s.iconButton} ${s.peopleButton}`} onClick={() => setSheet("people")} aria-haspopup="dialog" aria-label={m.peopleTitle} title={m.peopleTitle}>
            <UsersIcon /> <span>{online.length}</span>
          </button>
          {creator && (
            <button type="button" className={s.iconButton} onClick={() => setSheet("moderation")} aria-haspopup="dialog" aria-label={m.panelOpen} title={m.panelOpen}>
              <ShieldIcon /> <span className={s.toolbarLabel}>{m.panelOpen}</span>
              {openCases > 0 && <span className={s.badge}>{openCases}</span>}
            </button>
          )}
          <Link href="/rooms" className={`${s.secondary} ${s.leaveButton}`}><LeaveIcon /> {m.leave}</Link>
        </div>
      </header>

      <div className={s.roomBody}>
        <aside className={s.roomSide}>
          {voiceStage}
          <section className={`${s.sideCard} ${s.sidePeople}`}>
            <h2>{m.peopleTitle}</h2>
            {peoplePanel}
          </section>
        </aside>
        <main className={s.chatPanel} aria-labelledby="room-chat-title">
          <header className={s.chatHeader}>
            <h2 id="room-chat-title"><TalkIcon /> {m.chat}</h2>
            {room.description && <details><summary>{m.details}</summary><p>{room.description}</p></details>}
          </header>
          {paused && <p role="status" className={s.chatNotice}>{m.chatPaused}</p>}
          {notice && !sheet && <p role="status" className={s.chatNotice}>{notice}</p>}
          <div
            ref={box}
            role="log"
            aria-label={m.chat}
            className={s.messages}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            <ul>{messages.map(renderMessage)}</ul>
            {!messages.some((message) => message.kind === "user") && <p className={s.emptyChat}>{m.emptyChat}</p>}
          </div>
          <div className={s.composer}>
            {sendError && <p role="alert" className={s.error}>{sendError}</p>}
            <form onSubmit={(e) => { e.preventDefault(); send(); }}>
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
                className={s.input}
              />
              <button type="submit" disabled={!text.trim() || pending || paused} aria-label={m.send} title={m.send} className={s.primary}>
                <SendIcon /> <span>{m.send}</span>
              </button>
            </form>
          </div>
        </main>
      </div>

      {sheet && (
        <RoomDialog
          title={sheet === "people" ? m.peopleTitle : m.panelTitle}
          closeLabel={m.close}
          onClose={() => setSheet(null)}
          drawer
        >
          {notice && <p role="status" className={s.status}>{notice}</p>}
          {sheet === "people" ? peoplePanel : moderationPanel}
        </RoomDialog>
      )}

      {confirmation && (
        <RoomDialog title={confirmation.title} closeLabel={m.close} onClose={() => setConfirmation(null)}>
          <p className={s.dialogDescription}>{confirmation.description}</p>
          <div className={s.dialogActions}>
            <button type="button" className={s.secondary} onClick={() => setConfirmation(null)}>{m.cancel}</button>
            <button type="button" className={s.danger} disabled={pending} onClick={() => {
              setConfirmation(null);
              confirmation.run();
            }}>{confirmation.label}</button>
          </div>
        </RoomDialog>
      )}

      {reporting && (
        <ReportDialog
          onClose={() => { if (!pending) setReporting(null); }}
          onSend={(reason) => start(async () => {
            setReportError("");
            const result = await reportMember(room.id, reporting.user, reason, reporting.message).catch(() => ({ error: "failed" }));
            if (result.error) setReportError(m.errors[result.error as keyof typeof m.errors] ?? m.errors.failed);
            else {
              setReporting(null);
              setNotice(m.reportDone);
            }
          })}
          error={reportError}
          pending={pending}
        />
      )}
      <div ref={voice.audioBox} className="hidden" aria-hidden />
    </div>
  );
}

function PersonMenu({ label, items }: { label: string; items: { label: string; run: () => void; danger?: boolean }[] }) {
  const m = useMsg(roomsMessages);
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <>
      <button type="button" aria-label={label} aria-haspopup="dialog" className={s.menuButton} onClick={() => setOpen(true)}>
        <DotsIcon />
      </button>
      {open && (
        <RoomDialog title={label} closeLabel={m.close} onClose={() => setOpen(false)}>
          <ul className={s.actionList}>
            {items.map((item) => (
              <li key={item.label}>
                <button type="button" className={item.danger ? s.danger : s.secondary} onClick={() => {
                  setOpen(false);
                  item.run();
                }}>{item.label}</button>
              </li>
            ))}
          </ul>
        </RoomDialog>
      )}
    </>
  );
}

function ReportDialog({ onClose, onSend, error, pending }: {
  onClose: () => void;
  onSend: (reason: string) => void;
  error: string;
  pending: boolean;
}) {
  const m = useMsg(roomsMessages);
  const [reason, setReason] = useState("");
  return (
    <RoomDialog title={m.reportTitle} closeLabel={m.close} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!pending) onSend(reason.trim()); }}>
        <label className={s.field}>
          <span>{m.reportReason}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder={m.reportPh} readOnly={pending} className={s.input} />
        </label>
        {error && <p role="alert" className={s.error}>{error}</p>}
        <div className={s.dialogActions}>
          <button type="button" onClick={onClose} disabled={pending} className={s.secondary}>{m.cancel}</button>
          <button type="submit" disabled={pending} className={s.primary}>{pending ? m.sending : m.reportSend}</button>
        </div>
      </form>
    </RoomDialog>
  );
}
