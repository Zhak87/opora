"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Room } from "livekit-client";
import { consultState, setSpeechConsent, startConsultNow, type ConsultState, type JoinResult } from "@/lib/consult/actions";
import { OPEN_BEFORE_MIN, type ConsultRole } from "@/lib/consult/config";
import { useMsg } from "@/i18n/client";
import { consultMessages } from "@/i18n/consult";
import { INTL, type Locale } from "@/i18n/config";
import { SpeechChunker } from "./speech-chunker";
import { AssistantPanel, type PrepData } from "./AssistantPanel";

// Экран консультации: проверка камеры и микрофона перед входом, затем звонок.
// Видео собеседника — главное, своё превью — маленькое, кнопки камеры, микрофона и выхода всегда на виду.
// У психолога справа (на телефоне — снизу) сворачиваемая панель помощника.

type Phase = "lobby" | "joining" | "call" | "left" | "lost" | "closed";
type Devices = { cams: MediaDeviceInfo[]; mics: MediaDeviceInfo[]; outs: MediaDeviceInfo[] };

const POLL_MS = 5_000;

export function ConsultCall({
  session,
  role,
  peerName,
  startsAt: startsAtProp,
  endsAt: endsAtProp,
  tz,
  locale,
  initial,
  prep,
}: {
  session: string;
  role: ConsultRole;
  peerName: string;
  startsAt: string;
  endsAt: string;
  tz: string;
  locale: Locale;
  initial: ConsultState;
  prep?: PrepData;
}) {
  const m = useMsg(consultMessages);
  const router = useRouter();
  const back = role === "psychologist" ? `/pro/sessions/${session}` : `/care/sessions/${session}`;
  const peerRole: ConsultRole = role === "psychologist" ? "client" : "psychologist";
  const time = (iso: string | number) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const [phase, setPhase] = useState<Phase>("lobby");
  const [state, setState] = useState<ConsultState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);
  const [devices, setDevices] = useState<Devices>({ cams: [], mics: [], outs: [] });
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");
  const [outId, setOutId] = useState("");
  const [level, setLevel] = useState(0);
  const [mediaProblem, setMediaProblem] = useState<"denied" | "none" | null>(null);
  const [conn, setConn] = useState<"ok" | "reconnecting">("ok");
  const [weak, setWeak] = useState(false);
  const [tick, setTick] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const previewStream = useRef<MediaStream | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const audioBox = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const epochRef = useRef<number>(initial.epoch);
  const leavingRef = useRef(false);
  const chunker = useRef<SpeechChunker | null>(null);
  const uploads = useRef(new Set<AbortController>());
  const micBeforePrivate = useRef<boolean | null>(null);

  // Время берём из последнего состояния: психолог мог перенести встречу на «сейчас».
  const startsAt = state.startsAt ?? startsAtProp;
  const endsAt = state.endsAt ?? endsAtProp;
  const opensAt = Date.parse(startsAt) - OPEN_BEFORE_MIN * 60_000;
  const [startingNow, setStartingNow] = useState(false);
  const startNow = async () => {
    setStartingNow(true);
    setError(null);
    const res = await startConsultNow(session).catch(() => null);
    setStartingNow(false);
    if (res?.ok) {
      setState(res.state);
      setNow(Date.now());
    } else setError(res?.error === "overlap" ? m.now.overlap : m.now.failed);
  };
  const early = state.state === "early" && now < opensAt;

  /* ---------- Предпросмотр перед входом ---------- */

  const stopPreview = useCallback(() => {
    previewStream.current?.getTracks().forEach((t) => t.stop());
    previewStream.current = null;
  }, []);

  useEffect(() => {
    if (phase !== "lobby") return;
    let cancelled = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      stopPreview();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micId ? { deviceId: { exact: micId } } : true,
          video: audioOnly ? false : camId ? { deviceId: { exact: camId } } : { width: 640, height: 360 },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        previewStream.current = stream;
        setMediaProblem(null);
        if (previewRef.current) previewRef.current.srcObject = audioOnly ? null : stream;
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          cams: list.filter((d) => d.kind === "videoinput"),
          mics: list.filter((d) => d.kind === "audioinput"),
          outs: "setSinkId" in HTMLMediaElement.prototype ? list.filter((d) => d.kind === "audiooutput") : [],
        });
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const loop = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        const name = (e as Error)?.name;
        setMediaProblem(name === "NotFoundError" || name === "OverconstrainedError" ? "none" : "denied");
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ctx?.close().catch(() => {});
    };
  }, [phase, camId, micId, audioOnly, stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  /* ---------- Звонок ---------- */

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const stopSpeech = useCallback(() => {
    chunker.current?.cancel();
    chunker.current = null;
    // Отзыв согласия: фрагменты, которые ещё отправляются, отменяем.
    for (const c of uploads.current) c.abort();
    uploads.current.clear();
  }, []);

  const teardown = useCallback(() => {
    stopSpeech();
    const r = roomRef.current;
    roomRef.current = null;
    r?.removeAllListeners();
    r?.disconnect().catch(() => {});
    if (audioBox.current) audioBox.current.innerHTML = "";
  }, [stopSpeech]);

  const join = useCallback(async () => {
    setError(null);
    setPhase("joining");
    const res: JoinResult = await fetch(`/api/consult/${session}/join`, { method: "POST" })
      .then((r) => r.json())
      .catch(() => ({ ok: false, error: "failed" }));
    if (!res.ok) {
      setError(res.error === "early" ? m.errors.early(time(opensAt)) : m.errors[res.error as keyof typeof m.errors] as string ?? m.errors.failed);
      setPhase(["cancelled", "completed", "ended", "forbidden"].includes(res.error) ? "closed" : "lobby");
      return;
    }
    stopPreview();
    epochRef.current = res.epoch;
    leavingRef.current = false;
    const { Room, RoomEvent, Track, ConnectionQuality, ConnectionState, DisconnectReason } = await import("livekit-client");
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { deviceId: camId || undefined, resolution: { width: 960, height: 540, frameRate: 24 } },
      audioCaptureDefaults: { deviceId: micId || undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      audioOutput: outId ? { deviceId: outId } : undefined,
    });
    roomRef.current = room;
    const attachRemote = () => {
      for (const p of room.remoteParticipants.values()) {
        const cam = p.getTrackPublication(Track.Source.Camera);
        if (cam?.track && remoteVideo.current) cam.track.attach(remoteVideo.current);
      }
      bump();
    };
    room
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          audioBox.current?.appendChild(el);
        } else if (remoteVideo.current) track.attach(remoteVideo.current);
        bump();
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => {
          if (el !== remoteVideo.current) el.remove();
        });
        bump();
      })
      .on(RoomEvent.TrackMuted, bump)
      .on(RoomEvent.TrackUnmuted, bump)
      .on(RoomEvent.TrackPublished, bump)
      .on(RoomEvent.TrackUnpublished, bump)
      .on(RoomEvent.ParticipantConnected, attachRemote)
      .on(RoomEvent.ParticipantDisconnected, bump)
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Camera && pub.track && localVideo.current) pub.track.attach(localVideo.current);
        bump();
      })
      .on(RoomEvent.LocalTrackUnpublished, bump)
      .on(RoomEvent.ConnectionStateChanged, (s) => setConn(s === ConnectionState.Reconnecting || s === ConnectionState.SignalReconnecting ? "reconnecting" : "ok"))
      .on(RoomEvent.ConnectionQualityChanged, (q, p) => {
        if (p.identity === room.localParticipant.identity) setWeak(q === ConnectionQuality.Poor || q === ConnectionQuality.Lost);
      })
      .on(RoomEvent.Disconnected, async (reason) => {
        const intended = leavingRef.current || reason === DisconnectReason.CLIENT_INITIATED;
        teardown();
        if (intended) return;
        // Комнату закрыл сервер: встречу перенесли, отменили или завершили. Иначе — обрыв связи.
        const st = await consultState(session).catch(() => null);
        if (st) setState(st);
        // Нет ответа сервера (сеть пропала) — это обрыв: человек сможет вернуться, когда связь появится.
        if (st && (st.state !== "open" || st.epoch !== epochRef.current)) setPhase("closed");
        else setPhase("lost");
      });
    try {
      await room.connect(res.url, res.token, { autoSubscribe: true });
      await room.startAudio().catch(() => {});
      setPhase("call");
      try {
        await room.localParticipant.setMicrophoneEnabled(micOn);
      } catch {
        setMicOn(false);
      }
      try {
        await room.localParticipant.setCameraEnabled(camOn && !audioOnly);
      } catch (e) {
        console.warn("consult: camera", (e as Error)?.name);
        setCamOn(false);
      }
      attachRemote();
    } catch {
      teardown();
      setError(m.errors.failed);
      setPhase("lost");
    }
  }, [session, camId, micId, outId, micOn, camOn, audioOnly, m, opensAt, stopPreview, teardown, bump]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = useCallback(
    (finish = false) => {
      leavingRef.current = true;
      teardown();
      if (finish) router.push(`/pro/sessions/${session}?after=1#draft`);
      else setPhase("left");
    },
    [teardown, router, session],
  );

  useEffect(() => () => teardown(), [teardown]);

  // Локальное превью и видео собеседника после каждой перерисовки (элементы могли смениться).
  useEffect(() => {
    const r = roomRef.current;
    if (!r || phase !== "call") return;
    import("livekit-client").then(({ Track }) => {
      const cam = r.localParticipant.getTrackPublication(Track.Source.Camera);
      if (cam?.track && localVideo.current && !cam.track.attachedElements.includes(localVideo.current)) cam.track.attach(localVideo.current);
      for (const p of r.remoteParticipants.values()) {
        const rc = p.getTrackPublication(Track.Source.Camera);
        if (rc?.track && remoteVideo.current && !rc.track.attachedElements.includes(remoteVideo.current)) rc.track.attach(remoteVideo.current);
      }
    });
  }, [tick, phase, panelOpen]);

  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    if (privateMode) {
      micBeforePrivate.current = next;
      return;
    }
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next).catch(() => setMicOn(false));
  };
  const toggleCam = async () => {
    const next = !camOn;
    setCamOn(next);
    if (!audioOnly) await roomRef.current?.localParticipant.setCameraEnabled(next).catch(() => setCamOn(false));
  };
  const setAudioMode = async (on: boolean) => {
    setAudioOnly(on);
    setWeak(false);
    const r = roomRef.current;
    if (!r) return;
    const { Track } = await import("livekit-client");
    await r.localParticipant.setCameraEnabled(!on && camOn).catch(() => {});
    for (const p of r.remoteParticipants.values()) p.getTrackPublication(Track.Source.Camera)?.setSubscribed(!on);
    bump();
  };

  // Приватный режим психолога: диктовка вопроса и озвучка ответа не попадают в звонок и в расшифровку.
  const onPrivate = useCallback(
    async (on: boolean) => {
      const r = roomRef.current;
      setPrivateMode(on);
      chunker.current?.setPaused(on);
      if (!r) return;
      if (on) {
        micBeforePrivate.current = r.localParticipant.isMicrophoneEnabled;
        await r.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      } else {
        const restore = micBeforePrivate.current ?? false;
        micBeforePrivate.current = null;
        if (restore) await r.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        setMicOn(restore);
      }
      bump();
    },
    [bump],
  );

  /* ---------- Состояние встречи и обработка речи ---------- */

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const st = await consultState(session).catch(() => null);
      if (!alive || !st) return;
      setState(st);
      setNow(Date.now());
      // Встречу перенесли, отменили или завершили: старое подключение закрываем.
      if (roomRef.current && (st.state !== "open" || st.epoch !== epochRef.current)) {
        leavingRef.current = true;
        teardown();
        setPhase("closed");
      }
    };
    const t = setInterval(run, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [session, teardown]);

  const speechActive = state.speech.active && phase === "call";
  const speechVer = state.speech.ver;
  useEffect(() => {
    const r = roomRef.current;
    if (!speechActive || !r || !micOn) {
      stopSpeech();
      return;
    }
    let stopped = false;
    (async () => {
      const { Track } = await import("livekit-client");
      const track = r.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      if (!track || stopped) return;
      const c = new SpeechChunker(async (wav, saidAt) => {
        const ctl = new AbortController();
        uploads.current.add(ctl);
        try {
          const res = await fetch(`/api/consult/${session}/speech`, {
            method: "POST",
            body: wav,
            signal: ctl.signal,
            headers: { "Content-Type": "audio/wav", "x-said-at": String(saidAt), "x-speech-ver": String(speechVer ?? "") },
          });
          if (res.status === 409) setState((s) => ({ ...s, speech: { ...s.speech, active: false } }));
        } catch {
          // отменено или сеть: фрагмент просто не попадёт в расшифровку
        } finally {
          uploads.current.delete(ctl);
        }
      });
      chunker.current = c;
      await c.start(track);
      if (privateMode) c.setPaused(true);
    })();
    return () => {
      stopped = true;
      stopSpeech();
    };
  }, [speechActive, speechVer, micOn, tick > 0, session, stopSpeech]); // eslint-disable-line react-hooks/exhaustive-deps

  const consent = async (on: boolean) => {
    if (!on) stopSpeech();
    setState(await setSpeechConsent(session, on));
  };

  /* ---------- Вид ---------- */

  const r = roomRef.current;
  const remote = r ? [...r.remoteParticipants.values()][0] : undefined;
  const remoteCam = remote ? [...remote.trackPublications.values()].find((p) => p.source === "camera") : undefined;
  const remoteMic = remote ? [...remote.trackPublications.values()].find((p) => p.source === "microphone") : undefined;
  const remoteVideoOn = Boolean(remoteCam?.track && !remoteCam.isMuted && !audioOnly);
  const localCamOn = camOn && !audioOnly;

  const consentBar = (
    <ConsentBar role={role} state={state} onChange={consent} compact={phase === "call"} />
  );

  if (phase === "closed" || phase === "left" || phase === "lost") {
    const canReturn = phase !== "closed" && state.state === "open";
    return (
      <Shell>
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center" data-call-phase={phase}>
          <span className="mb-5 h-16 w-16 rounded-full bg-gradient-to-br from-lilac-soft to-mist shadow-soft" />
          <h1 className="font-serif text-[28px] leading-tight text-ink">
            {phase === "closed" ? (error ?? m.call.changed) : phase === "lost" ? m.call.lost : m.call.left}
          </h1>
          {phase !== "closed" && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{phase === "lost" ? m.call.lostHint : m.call.leftHint}</p>}
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            {canReturn && (
              <button onClick={join} className="h-12 rounded-full bg-ink px-7 text-[15px] text-paper transition hover:opacity-90">
                {m.call.rejoin}
              </button>
            )}
            <Link href={back} className="flex h-12 items-center justify-center rounded-full px-6 text-[15px] text-ink-soft hover:bg-sand/60 hover:text-ink">
              {m.call.back}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "lobby" || phase === "joining") {
    const waiting = state.peerInRoom ? m.lobby.peerHere : m.lobby.waiting(peerRole);
    return (
      <Shell>
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:py-10" data-call-phase="lobby">
          <div className="relative aspect-video overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2b2d3a] to-[#3d3f52] shadow-soft">
            {!audioOnly && (
              <video
                ref={(el) => {
                  previewRef.current = el;
                  if (el && previewStream.current && el.srcObject !== previewStream.current) el.srcObject = previewStream.current;
                }}
                autoPlay
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-cover"
              />
            )}
            {(audioOnly || mediaProblem) && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-paper/80">{audioOnly ? m.lobby.audioOnly : m.lobby.cameraOff}</div>
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <span className="text-xs text-paper/80">{m.lobby.microphone}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/20">
                <span className="block h-full rounded-full bg-sage transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-ink-soft">{peerName}</p>
              <h1 className="font-serif text-[28px] leading-tight text-ink">{m.lobby.title}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{m.lobby.intro}</p>
            </div>
            <p className="flex items-center gap-2 text-sm text-ink" data-peer-in-room={state.peerInRoom ? "1" : "0"}>
              <span className={`h-2.5 w-2.5 rounded-full ${state.peerInRoom ? "bg-sage-deep" : "animate-pulse bg-line"}`} /> {waiting}
            </p>
            {mediaProblem && <p className="rounded-2xl bg-[#fff4ec] px-4 py-3 text-sm text-ink">{mediaProblem === "denied" ? m.lobby.denied : m.lobby.noDevices}</p>}
            <div className="grid gap-3">
              {!audioOnly && devices.cams.length > 0 && <DeviceSelect label={m.lobby.camera} list={devices.cams} value={camId} onChange={setCamId} def={m.lobby.default} />}
              {devices.mics.length > 0 && <DeviceSelect label={m.lobby.microphone} list={devices.mics} value={micId} onChange={setMicId} def={m.lobby.default} />}
              {devices.outs.length > 0 && <DeviceSelect label={m.lobby.speaker} list={devices.outs} value={outId} onChange={setOutId} def={m.lobby.default} />}
            </div>
            <p className="text-xs text-ink-faint">{m.lobby.micHint}</p>
            <div className="flex flex-wrap gap-2">
              <Toggle on={micOn} onClick={() => setMicOn(!micOn)} label={micOn ? m.call.micOn : m.call.micOff} icon={<MicIcon off={!micOn} />} />
              {!audioOnly && <Toggle on={camOn} onClick={() => setCamOn(!camOn)} label={camOn ? m.call.camOn : m.call.camOff} icon={<CamIcon off={!camOn} />} />}
            </div>
            <label className="flex items-start gap-3 rounded-2xl bg-paper/80 px-4 py-3 shadow-soft">
              <input type="checkbox" checked={audioOnly} onChange={(e) => setAudioOnly(e.target.checked)} className="mt-1 h-4 w-4 accent-lilac-deep" />
              <span>
                <span className="block text-[15px] text-ink">{m.lobby.audioOnly}</span>
                <span className="block text-xs text-ink-faint">{m.lobby.audioOnlyHint}</span>
              </span>
            </label>
            {consentBar}
            {error && <p className="rounded-2xl bg-[#ffeeec] px-4 py-3 text-sm text-[#a2392f]">{error}</p>}
            <button
              onClick={join}
              disabled={phase === "joining" || early}
              className="h-13 min-h-12 rounded-full bg-ink px-7 text-[16px] text-paper shadow-soft transition hover:opacity-90 disabled:opacity-50"
              data-join
            >
              {phase === "joining" ? m.lobby.entering : early ? m.join.opensAt(time(opensAt)) : m.lobby.enter}
            </button>
            {early && role === "psychologist" && (
              <div className="space-y-1 text-center">
                <button
                  onClick={startNow}
                  disabled={startingNow}
                  className="h-11 w-full rounded-full bg-lilac-soft px-6 text-[15px] text-ink transition hover:bg-lilac-soft/70 disabled:opacity-50"
                  data-start-now
                >
                  {startingNow ? m.now.starting : m.now.start}
                </button>
                <p className="text-xs text-ink-faint">{m.now.startHint}</p>
              </div>
            )}
            <p className="text-center text-xs text-ink-faint">{m.call.until(time(endsAt))}</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell dark>
      <div
        className="flex h-[100dvh] flex-col lg:flex-row"
        data-call-phase="call"
        data-peer-mic={remoteMic && !remoteMic.isMuted ? "on" : "off"}
        data-remote-video={remoteVideoOn ? "on" : "off"}
        data-speech={speechActive ? "on" : "off"}
        data-conn={conn}
      >
        <div className="relative min-h-0 flex-1">
          {/* Видео не скрываем через visibility: адаптивный поток LiveKit перестал бы его присылать. Заглушка ложится сверху. */}
          <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover sm:object-contain" />
          {!remoteVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1f2029] text-paper/90">
              <span className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-lilac/60 to-sky/50 font-serif text-4xl ${remoteMic && !remoteMic.isMuted ? "ring-4 ring-sage/40" : ""}`}>
                {(peerName || "?").slice(0, 1).toUpperCase()}
              </span>
              <p className="text-[15px]">{remote ? peerName : m.call.waiting(peerRole)}</p>
              {remote && <p className="text-xs text-paper/60">{audioOnly ? m.call.audioOnly : m.call.noVideo}</p>}
            </div>
          )}
          <div ref={audioBox} className="hidden" />
          <div className="absolute left-3 right-28 top-3 flex flex-wrap items-start gap-2 sm:left-5 sm:right-52 sm:top-5">
            {remote && <span className="rounded-full bg-black/35 px-3 py-1.5 text-sm text-paper backdrop-blur">{peerName}</span>}
            {conn === "reconnecting" && <span className="rounded-full bg-[#fff4ec] px-3 py-1.5 text-sm text-ink">{m.call.reconnecting}</span>}
            {speechActive && (
              <span className="flex items-center gap-2 rounded-full bg-lilac-soft/90 px-3 py-1.5 text-sm text-ink" data-speech-badge>
                <span className="h-2 w-2 animate-pulse rounded-full bg-lilac-deep" /> {m.ai.on}
              </span>
            )}
          </div>
          {weak && !audioOnly && (
            <div className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-paper/95 px-4 py-2.5 text-sm text-ink shadow-soft">
              {m.call.weak}
              <button onClick={() => setAudioMode(true)} className="rounded-full bg-ink px-3 py-1 text-paper">
                {m.call.weakYes}
              </button>
            </div>
          )}
          <div className={`absolute right-3 top-14 w-24 overflow-hidden rounded-2xl bg-[#2b2d3a] shadow-soft ring-1 ring-white/10 sm:right-5 sm:top-5 sm:w-44 ${localCamOn ? "" : "hidden"}`}>
            <video ref={localVideo} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/50 to-transparent px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-8">
            <div className="w-full max-w-xl">{consentBar}</div>
            <div className="flex items-center gap-2 sm:gap-3">
              <RoundButton onClick={toggleMic} active={micOn && !privateMode} label={micOn ? m.call.micOn : m.call.micOff}>
                <MicIcon off={!micOn || privateMode} />
              </RoundButton>
              <RoundButton onClick={toggleCam} active={localCamOn} label={camOn ? m.call.camOn : m.call.camOff} disabled={audioOnly}>
                <CamIcon off={!localCamOn} />
              </RoundButton>
              <button
                onClick={() => setAudioMode(!audioOnly)}
                className={`h-12 whitespace-nowrap rounded-full px-3 text-xs transition sm:px-4 sm:text-sm ${audioOnly ? "bg-paper text-ink" : "bg-white/15 text-paper hover:bg-white/25"}`}
              >
                {audioOnly ? m.call.video : m.call.audioOnly}
              </button>
              {role === "psychologist" && (
                <button onClick={() => setPanelOpen(!panelOpen)} className="h-12 whitespace-nowrap rounded-full bg-white/15 px-3 text-xs text-paper transition hover:bg-white/25 sm:px-4 sm:text-sm" aria-expanded={panelOpen}>
                  {m.call.panel}
                </button>
              )}
              <RoundButton onClick={() => leave(false)} danger label={m.call.leave}>
                <PhoneDownIcon />
              </RoundButton>
            </div>
            {role === "psychologist" && (
              <button onClick={() => leave(true)} className="text-xs text-paper/80 underline-offset-4 hover:text-paper hover:underline">
                {m.call.finish}
              </button>
            )}
          </div>
        </div>
        {role === "psychologist" && panelOpen && prep && (
          <aside className="h-[46dvh] shrink-0 overflow-hidden rounded-t-[24px] bg-paper shadow-soft lg:h-auto lg:w-[380px] lg:rounded-none">
            <AssistantPanel session={session} prep={prep} live={speechActive} onPrivate={onPrivate} onClose={() => setPanelOpen(false)} />
          </aside>
        )}
      </div>
    </Shell>
  );
}

/* ---------- Мелочи ---------- */

// Экран звонка выносится прямо в body: так его не обрезают анимации и отступы страницы, а навигация не перекрывает.
function Shell({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const box = <div className={`fixed inset-0 z-[70] overflow-y-auto ${dark ? "bg-[#1f2029]" : "bg-gradient-to-br from-[#f7f3ec] via-paper to-mist/60"}`}>{children}</div>;
  return mounted ? createPortal(box, document.body) : null;
}

function ConsentBar({ role, state, onChange, compact }: { role: ConsultRole; state: ConsultState; onChange: (on: boolean) => void; compact: boolean }) {
  const m = useMsg(consultMessages).ai;
  const s = state.speech;
  if (!s.available) {
    if (compact || role === "client") return null;
    return <p className="rounded-2xl bg-sand/60 px-4 py-3 text-xs text-ink-soft">{m.unavailable}</p>;
  }
  const status = s.active ? m.on : s.me && !s.peer ? m.waitingPeer : !s.me && s.peer ? m.peerAsks : m.off;
  return (
    <div
      className={`flex gap-2 rounded-2xl ${compact ? "flex-row items-center bg-paper/90 px-3 py-2 text-ink backdrop-blur" : "flex-col bg-lilac-soft/50 px-4 py-3"}`}
      data-consent={s.me ? "on" : "off"}
    >
      <div className="min-w-0 flex-1">
        <p className={`${compact ? "text-xs sm:text-sm" : "text-sm"} font-medium text-ink`}>
          {compact ? <span className="hidden sm:inline">{m.title}: </span> : `${m.title}: `}
          <span className="font-normal">{status}</span>
        </p>
        {!compact && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{role === "client" ? m.explainClient(s.keepDays) : m.explainPro(s.keepDays)}</p>}
      </div>
      {s.me ? (
        <button onClick={() => onChange(false)} className={`shrink-0 self-start rounded-full bg-ink px-4 text-sm text-paper ${compact ? "h-8 self-center" : "h-9"}`} data-consent-stop>
          {m.stop}
        </button>
      ) : (
        <button onClick={() => onChange(true)} className={`shrink-0 self-start rounded-full border border-ink/20 bg-paper px-4 text-sm text-ink ${compact ? "h-8 self-center" : "h-9"}`} data-consent-allow>
          {m.allow}
        </button>
      )}
    </div>
  );
}

function DeviceSelect({ label, list, value, onChange, def }: { label: string; list: MediaDeviceInfo[]; value: string; onChange: (v: string) => void; def: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-faint">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-lilac-deep/60">
        <option value="">{def}</option>
        {list.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm transition ${on ? "bg-paper text-ink shadow-soft" : "bg-[#ffeeec] text-[#a2392f]"}`}>
      {icon} {label}
    </button>
  );
}

function RoundButton({ children, onClick, active = true, danger = false, disabled = false, label }: { children: ReactNode; onClick: () => void; active?: boolean; danger?: boolean; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition disabled:opacity-40 sm:h-14 sm:w-14 ${
        danger ? "bg-[#d9534a] text-paper hover:bg-[#c2453d]" : active ? "bg-white/15 text-paper hover:bg-white/25" : "bg-paper text-[#a2392f]"
      }`}
    >
      {children}
    </button>
  );
}

const MicIcon = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
const CamIcon = ({ off }: { off?: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="13" height="12" rx="3" />
    <path d="M16 10l5-3v10l-5-3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
const PhoneDownIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14.5c5-4.7 13-4.7 18 0l-2.2 2.6-3.3-1.4v-2.3a10 10 0 0 0-7 0v2.3l-3.3 1.4z" />
  </svg>
);
