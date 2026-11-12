"use server";

import { requireUser } from "@/lib/supabase/server";
import { getSession, UUID_RE, type Session } from "@/lib/sessions";
import { joinState, type ConsultRole, type JoinState } from "./config";
import { closeConsultRooms, consultSpeechEnabled, consultToken, keepDays, roomIdentities, videoConfigured, videoUrl } from "./server";

// Вход в видеокомнату и состояние встречи. Права проверяются здесь, на сервере, на каждый запрос:
// встречу читаем с правами самого пользователя (RLS отдаёт её только психологу и клиенту этой записи),
// затем сверяем роль, формат, статус и время.

type Who = { session: Session; role: ConsultRole; user: string };

async function participant(id: string): Promise<Who | null> {
  if (!UUID_RE.test(id)) return null;
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const s = await getSession(supabase, id);
  if (!s) return null;
  if (s.psychologist_id === user.id) return { session: s, role: "psychologist", user: user.id };
  if (s.client_id === user.id) return { session: s, role: "client", user: user.id };
  return null;
}

export type JoinResult =
  | { ok: true; url: string; token: string; epoch: number; role: ConsultRole; name: string }
  | { ok: false; error: JoinState | "forbidden" | "video_off" | "failed" };

export async function joinConsult(id: string): Promise<JoinResult> {
  const who = await participant(id);
  if (!who) return { ok: false, error: "forbidden" };
  const state = joinState(who.session);
  if (state !== "open") return { ok: false, error: state };
  if (!videoConfigured()) return { ok: false, error: "video_off" };
  const { supabase } = await requireUser();
  let name = "";
  if (who.role === "psychologist") {
    const { data } = await supabase.from("psychologists").select("full_name, status").eq("user_id", who.user).maybeSingle();
    // Приостановленный специалист не проводит встречи.
    if (!data || ["suspended", "rejected"].includes(data.status)) return { ok: false, error: "forbidden" };
    name = data.full_name ?? "";
  } else {
    const { data } = await supabase.from("profiles").select("name").eq("id", who.user).maybeSingle();
    name = data?.name ?? "";
  }
  try {
    const token = await consultToken({ session: who.session.id, epoch: who.session.video_epoch, user: who.user, name });
    return { ok: true, url: videoUrl(), token, epoch: who.session.video_epoch, role: who.role, name };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export type SpeechInfo = { available: boolean; me: boolean; peer: boolean; active: boolean; ver: number | null; keepDays: number };

export type ConsultState = {
  ok: boolean;
  state: JoinState | "forbidden";
  epoch: number;
  peerInRoom: boolean | null;
  speech: SpeechInfo;
};

const noSpeech = (): SpeechInfo => ({ available: false, me: false, peer: false, active: false, ver: null, keepDays: keepDays() });

// Опрашивается обоими участниками раз в несколько секунд: статус встречи, номер комнаты,
// есть ли собеседник в комнате и включена ли обработка речи.
export async function consultState(id: string): Promise<ConsultState> {
  const who = await participant(id);
  if (!who) return { ok: false, state: "forbidden", epoch: -1, peerInRoom: null, speech: noSpeech() };
  const s = who.session;
  const state = joinState(s);
  const peerId = who.role === "psychologist" ? s.client_id : s.psychologist_id;
  const [ids, speech] = await Promise.all([state === "open" ? roomIdentities(s.id, s.video_epoch) : Promise.resolve(null), speechInfo(s, who.user, peerId)]);
  return { ok: true, state, epoch: s.video_epoch, peerInRoom: ids ? ids.includes(peerId) : null, speech };
}

async function speechInfo(s: Session, me: string, peer: string): Promise<SpeechInfo> {
  const info = noSpeech();
  info.available = consultSpeechEnabled() && s.status === "scheduled";
  const { supabase } = await requireUser();
  const [{ data: rows }, { data: ver }] = await Promise.all([
    supabase.from("consult_consents").select("user_id, granted").eq("session_id", s.id),
    supabase.rpc("speech_ticket", { p_session: s.id }),
  ]);
  for (const r of rows ?? []) {
    if (r.user_id === me) info.me = r.granted;
    if (r.user_id === peer) info.peer = r.granted;
  }
  info.ver = typeof ver === "number" ? ver : null;
  info.active = info.available && info.ver != null;
  return info;
}

export async function setSpeechConsent(id: string, granted: boolean): Promise<ConsultState> {
  const who = await participant(id);
  if (who && (!granted || consultSpeechEnabled())) {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("set_speech_consent", { p_session: id, p_granted: granted });
    if (error) console.error("consult: consent change failed");
    // Отзыв: отменяем задания, которые ещё обрабатываются на сервере.
    if (!granted) (await import("./speech-jobs")).cancelJobs(id);
  }
  return consultState(id);
}

// После переноса, отмены или завершения: закрыть устаревшие комнаты встречи.
export async function sweepConsultRooms(id: string) {
  const who = await participant(id);
  if (!who) return;
  await closeConsultRooms(id, joinState(who.session) === "open" ? who.session.video_epoch : undefined);
}
