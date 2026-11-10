import type { SupabaseClient } from "@supabase/supabase-js";
import { onlineCounts } from "./hub";
import type { RoomCard, RoomInfo, RoomMessage, RoomPerson, RoomReport, RoomRequest } from "./types";

// Чтение данных комнат для страниц. Права проверяют функции базы.

// Комната без людей и сообщений дольше этого срока не показывается в «Сейчас», пока в неё кто-нибудь не зайдёт.
const QUIET_MS = 12 * 60 * 60 * 1000;

function strip(r: RoomCard & { last_activity_at?: string }): RoomCard {
  const { last_activity_at, ...rest } = r;
  void last_activity_at;
  return rest;
}

export async function catalog(supabase: SupabaseClient, me: string) {
  const now = new Date().toISOString();
  const [{ data: rooms, error }, { data: requests }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, title, description, format, access, scheduled, starts_at, creator_id, last_activity_at")
      .is("ended_at", null)
      .order("starts_at", { ascending: true })
      .limit(300),
    supabase.from("room_requests").select("room_id, status").eq("user_id", me),
  ]);
  if (error) throw error;
  const status = new Map(((requests ?? []) as { room_id: string; status: RoomCard["request"] }[]).map((r) => [r.room_id, r.status]));
  const counts = onlineCounts();
  const all = ((rooms ?? []) as (RoomCard & { last_activity_at: string })[]).map((r) => ({ ...r, request: status.get(r.id) ?? null }));
  const live = all
    .filter((r) => r.starts_at <= now)
    .filter((r) => counts[r.id] || r.creator_id === me || Date.now() - new Date(r.last_activity_at).getTime() < QUIET_MS)
    .map(strip);
  const upcoming = all.filter((r) => r.starts_at > now).map(strip);
  return { live, upcoming, counts };
}

export async function roomInfo(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("room_info", { p_room: id }).maybeSingle();
  return (data as RoomInfo | null) ?? null;
}

export async function roomMessages(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("room_messages_list", { p_room: id, p_limit: 200 });
  return (data ?? []) as RoomMessage[];
}

export async function people(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("room_people", { p_room: id });
  return (data ?? []) as RoomPerson[];
}

export async function requestList(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("room_request_list", { p_room: id });
  return (data ?? []) as RoomRequest[];
}

export async function reportList(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.rpc("room_report_list", { p_room: id });
  return (data ?? []) as RoomReport[];
}
