"use server";

import { track } from "@/lib/track";
import { after } from "next/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/server";
import { zonedToUtc } from "@/lib/time";
import { getTimeZone } from "@/lib/tz";
import { catalogChanged, disconnect, publish } from "./hub";
import { moderate } from "./moderation";
import { closeVoice, removeFromVoice, setVoicePermission, voiceConfigured, voiceToken, voiceUrl } from "./voice";
import { people, reportList, requestList, roomMessages } from "./data";
import { UUID, type RoomMessage } from "./types";

// Действия в комнатах. Все права проверяет база (supabase/migrations/0012_rooms.sql),
// здесь — только разбор ввода и рассылка живых событий участникам.

type Result = { ok?: true; error?: string };

function code(message: string | undefined) {
  if (!message) return "failed";
  for (const c of ["too many", "forbidden", "speakers full", "starts_at", "title", "empty"]) if (message.includes(c)) return c.replace(" ", "_");
  return "failed";
}

async function broadcastPeople(supabase: SupabaseClient, roomId: string) {
  publish(roomId, "people", await people(supabase, roomId));
}

export async function createRoom(_: Result | undefined, form: FormData): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "forbidden" };
  const scheduled = form.get("when") === "later";
  let startsAt: Date | null = new Date();
  if (scheduled) {
    startsAt = zonedToUtc(String(form.get("starts_at") ?? ""), await getTimeZone());
    if (!startsAt || startsAt.getTime() < Date.now() - 60_000) return { error: "starts_at" };
  }
  const { data: id, error } = await supabase.rpc("create_room", {
    p_title: String(form.get("title") ?? "").slice(0, 80),
    p_description: String(form.get("description") ?? "").slice(0, 300),
    p_format: form.get("format") === "voice" ? "voice" : "chat",
    p_scheduled: scheduled,
    p_starts_at: startsAt.toISOString(),
    p_access: form.get("access") === "request" ? "request" : "open",
    p_max_speakers: Number(form.get("max_speakers") ?? 5) || 5,
  });
  if (error || !id) return { error: code(error?.message) };
  await track("room_create");
  catalogChanged();
  redirect(`/rooms/${id}`);
}

export async function sendRoomMessage(roomId: string, body: string): Promise<{ message?: RoomMessage; error?: string }> {
  const { supabase, user } = await requireUser();
  const text = body.trim().slice(0, 2000);
  if (!user || !UUID.test(roomId) || !text) return { error: "failed" };
  const { data: id, error } = await supabase.rpc("send_room_message", { p_room: roomId, p_body: text });
  if (error || !id) return { error: code(error?.message) };
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const message: RoomMessage = {
    id: id as string,
    sender_id: user.id,
    sender_name: profile?.name ?? null,
    kind: "user",
    body: text,
    flag: null,
    reply_to: null,
    hidden: false,
    created_at: new Date().toISOString(),
  };
  publish(roomId, "message", message);
  // Модератор проверяет сообщение уже после ответа: отправитель не ждёт ИИ.
  after(() => moderate(roomId, { id: message.id, sender_id: user.id, body: text }).catch((e) => console.error("rooms moderate:", e)));
  return { message };
}

export async function hideRoomMessage(roomId: string, messageId: string, hidden: boolean): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(messageId)) return { error: "failed" };
  const { error } = await supabase.rpc("hide_room_message", { p_message: messageId, p_hidden: hidden });
  if (error) return { error: code(error.message) };
  const { data } = await supabase.rpc("room_messages_list", { p_room: roomId, p_limit: 500 });
  const body = ((data ?? []) as RoomMessage[]).find((m) => m.id === messageId)?.body ?? "";
  publish(roomId, "hidden", { id: messageId, hidden, body: hidden ? "" : body });
  publish(roomId, "reports", null);
  return { ok: true };
}

export async function kickRoomMember(roomId: string, userId: string): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(userId)) return { error: "failed" };
  const { error } = await supabase.rpc("kick_room_member", { p_room: roomId, p_user: userId });
  if (error) return { error: code(error.message) };
  publish(roomId, "kicked", null, userId);
  disconnect(roomId, userId);
  await removeFromVoice(roomId, userId);
  await broadcastPeople(supabase, roomId);
  publish(roomId, "reports", null);
  return { ok: true };
}

async function roleOf(supabase: SupabaseClient, roomId: string, userId: string) {
  return (await people(supabase, roomId)).find((p) => p.user_id === userId);
}

export async function muteRoomMember(roomId: string, userId: string, muted: boolean): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(userId)) return { error: "failed" };
  const { error } = await supabase.rpc("mute_room_member", { p_room: roomId, p_user: userId, p_muted: muted });
  if (error) return { error: code(error.message) };
  const p = await roleOf(supabase, roomId, userId);
  await setVoicePermission(roomId, userId, p?.role === "speaker" && !muted);
  await broadcastPeople(supabase, roomId);
  return { ok: true };
}

export async function setRoomSpeaker(roomId: string, userId: string, speaker: boolean): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(userId)) return { error: "failed" };
  const { error } = await supabase.rpc("set_room_speaker", { p_room: roomId, p_user: userId, p_speaker: speaker });
  if (error) return { error: code(error.message) };
  const p = await roleOf(supabase, roomId, userId);
  await setVoicePermission(roomId, userId, speaker && !p?.muted);
  await broadcastPeople(supabase, roomId);
  return { ok: true };
}

export async function setRoomMaxSpeakers(roomId: string, max: number): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return { error: "failed" };
  const { error } = await supabase.rpc("set_room_max_speakers", { p_room: roomId, p_max: Math.round(max) });
  if (error) return { error: code(error.message) };
  publish(roomId, "room", { max_speakers: Math.min(Math.max(Math.round(max), 1), 20) });
  return { ok: true };
}

export async function raiseHand(roomId: string, raise: boolean): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return { error: "failed" };
  const { error } = await supabase.rpc("raise_room_hand", { p_room: roomId, p_raise: raise });
  if (error) return { error: code(error.message) };
  await broadcastPeople(supabase, roomId);
  return { ok: true };
}

export async function endRoom(roomId: string): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return { error: "failed" };
  const { error } = await supabase.rpc("end_room", { p_room: roomId });
  if (error) return { error: code(error.message) };
  publish(roomId, "ended", null);
  disconnect(roomId);
  await closeVoice(roomId);
  catalogChanged();
  return { ok: true };
}

export async function requestRoom(roomId: string): Promise<{ status?: string; error?: string }> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return { error: "failed" };
  const { data, error } = await supabase.rpc("request_room", { p_room: roomId });
  if (error) return { error: code(error.message) };
  catalogChanged();
  publish(roomId, "requests", null);
  return { status: data as string };
}

export async function decideRequest(roomId: string, userId: string, approve: boolean): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(userId)) return { error: "failed" };
  const { error } = await supabase.rpc("decide_room_request", { p_room: roomId, p_user: userId, p_approve: approve });
  if (error) return { error: code(error.message) };
  catalogChanged();
  publish(roomId, "requests", null);
  return { ok: true };
}

export async function reportMember(roomId: string, targetId: string, reason: string, messageId?: string): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId) || !UUID.test(targetId) || (messageId && !UUID.test(messageId))) return { error: "failed" };
  const { error } = await supabase.rpc("report_room_member", {
    p_room: roomId,
    p_target: targetId,
    p_reason: reason.slice(0, 300),
    p_message: messageId ?? null,
  });
  if (error) return { error: code(error.message) };
  const { data: room } = await supabase.from("rooms").select("creator_id").eq("id", roomId).maybeSingle();
  if (room) publish(roomId, "reports", null, room.creator_id);
  return { ok: true };
}

export async function resolveReport(roomId: string, reportId: string): Promise<Result> {
  const { supabase } = await requireUser();
  if (!UUID.test(reportId)) return { error: "failed" };
  const { error } = await supabase.rpc("resolve_room_report", { p_report: reportId });
  if (error) return { error: code(error.message) };
  return { ok: true };
}

// Пропуск в голос. Проверяем право входа заново: ссылку на комнату могли открыть напрямую.
export async function joinVoice(roomId: string): Promise<{ url?: string; token?: string; speak?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user || !UUID.test(roomId)) return { error: "failed" };
  if (!voiceConfigured()) return { error: "voice_off" };
  const { data: info } = await supabase.rpc("room_info", { p_room: roomId }).maybeSingle();
  const room = info as { format: string; my_role: string | null; my_muted: boolean } | null;
  const { data: access } = await supabase.rpc("room_access", { p_room: roomId });
  if (access !== "ok" || !room) return { error: "forbidden" };
  if (room.format !== "voice") return { error: "failed" };
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const speak = room.my_role === "speaker" && !room.my_muted;
  const token = await voiceToken({ room: roomId, user: user.id, name: profile?.name || "", speak });
  return { url: voiceUrl(), token, speak };
}

// Свежие списки для панели создателя и участников (после живого события).
export async function loadPanel(roomId: string) {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return { people: [], requests: [], reports: [] };
  const [p, requests, reports] = await Promise.all([people(supabase, roomId), requestList(supabase, roomId), reportList(supabase, roomId)]);
  return { people: p, requests, reports };
}

export async function loadMessages(roomId: string) {
  const { supabase } = await requireUser();
  if (!UUID.test(roomId)) return [];
  return roomMessages(supabase, roomId);
}
