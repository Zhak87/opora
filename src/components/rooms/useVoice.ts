"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionState, DisconnectReason, Participant, RemoteTrack, Room } from "livekit-client";
import { joinVoice } from "@/lib/rooms/actions";

// Голос комнаты в браузере через LiveKit. Подключение — только по кнопке «Слушать»;
// микрофон запрашивается только когда спикер сам его включает.

export type VoiceStatus = "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "off";
export type MicProblem = "denied" | "noMic" | null;

export function useVoice(roomId: string, onRemoved: () => void) {
  const roomRef = useRef<Room | null>(null);
  const attemptRef = useRef<symbol | null>(null);
  const audioBox = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [inVoice, setInVoice] = useState<Set<string>>(new Set());
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [micOn, setMicOn] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [micProblem, setMicProblem] = useState<MicProblem>(null);

  const syncParticipants = useCallback(() => {
    const r = roomRef.current;
    if (!r) return setInVoice(new Set());
    const ids = new Set<string>([r.localParticipant.identity, ...[...r.remoteParticipants.values()].map((p) => p.identity)]);
    setInVoice(ids);
  }, []);

  const cleanup = useCallback(() => {
    const r = roomRef.current;
    attemptRef.current = null;
    roomRef.current = null;
    r?.removeAllListeners();
    r?.disconnect().catch(() => {});
    if (audioBox.current) audioBox.current.innerHTML = "";
    setInVoice(new Set());
    setSpeaking(new Set());
    setMicOn(false);
    setCanPublish(false);
    setMicProblem(null);
  }, []);

  const join = useCallback(async () => {
    if (attemptRef.current) return;
    const attempt = Symbol();
    attemptRef.current = attempt;
    setStatus("connecting");

    try {
      const res = await joinVoice(roomId);
      if (attemptRef.current !== attempt) return;
      if (!res.token || !res.url) {
        cleanup();
        setStatus(res.error === "voice_off" ? "off" : "failed");
        return;
      }

      const { Room, RoomEvent, Track, ConnectionState: CS, DisconnectReason: DR } = await import("livekit-client");
      if (attemptRef.current !== attempt) return;
      const room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      roomRef.current = room;
      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          const el = track.attach();
          el.dataset.voice = "1";
          audioBox.current?.appendChild(el);
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => track.detach().forEach((el) => el.remove()))
        .on(RoomEvent.ParticipantConnected, syncParticipants)
        .on(RoomEvent.ParticipantDisconnected, syncParticipants)
        .on(RoomEvent.ActiveSpeakersChanged, (list: Participant[]) => setSpeaking(new Set(list.map((p) => p.identity))))
        .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
          if (s === CS.Connected) setStatus("connected");
          else if (s === CS.Reconnecting || s === CS.SignalReconnecting) setStatus("reconnecting");
        })
        .on(RoomEvent.ParticipantPermissionsChanged, (_prev, p: Participant) => {
          if (p.identity !== room.localParticipant.identity) return;
          const can = Boolean(p.permissions?.canPublish);
          setCanPublish(can);
          if (!can) setMicOn(false);
        })
        .on(RoomEvent.LocalTrackUnpublished, () => setMicOn(room.localParticipant.isMicrophoneEnabled))
        .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          const removed = reason === DR.PARTICIPANT_REMOVED || reason === DR.ROOM_DELETED;
          cleanup();
          if (removed) {
            setStatus("idle");
            onRemoved();
          } else if (reason === DR.CLIENT_INITIATED) setStatus("idle");
          else setStatus("failed");
        });
      await room.connect(res.url, res.token, { autoSubscribe: true });
      if (attemptRef.current !== attempt) return;
      await room.startAudio().catch(() => {});
      if (attemptRef.current !== attempt) return;
      setCanPublish(Boolean(room.localParticipant.permissions?.canPublish));
      syncParticipants();
      setStatus("connected");
    } catch (e) {
      if (attemptRef.current !== attempt) return;
      console.error("voice connect:", e);
      cleanup();
      setStatus("failed");
    }
  }, [roomId, syncParticipants, cleanup, onRemoved]);

  const leave = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const toggleMic = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = !r.localParticipant.isMicrophoneEnabled;
    try {
      await r.localParticipant.setMicrophoneEnabled(next);
      if (roomRef.current !== r) return;
      setMicProblem(null);
      setMicOn(next);
    } catch (e) {
      if (roomRef.current !== r) return;
      const name = (e as Error)?.name;
      setMicProblem(name === "NotFoundError" || name === "OverconstrainedError" ? "noMic" : "denied");
      setMicOn(false);
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  return { status, inVoice, speaking, micOn, canPublish, micProblem, join, leave, toggleMic, audioBox };
}
