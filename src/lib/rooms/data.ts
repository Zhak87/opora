import type { SupabaseClient } from "@supabase/supabase-js";
import { onlineCounts } from "./hub";
import { ensureTopicRooms } from "./topic-sync";
import type { RoomCard, RoomInfo, RoomMessage, RoomPerson, RoomPersona, RoomReport, RoomRequest, SampleLine, TopicCard } from "./types";

// Чтение данных комнат для страниц. Права проверяют функции базы.

// Комната без людей и сообщений дольше этого срока не показывается в «Сейчас», пока в неё кто-нибудь не зайдёт.
const QUIET_MS = 12 * 60 * 60 * 1000;

function strip(r: RoomCard & { last_activity_at?: string }): RoomCard {
  const { last_activity_at, ...rest } = r;
  void last_activity_at;
  return rest;
}

// Тематические комнаты «Опоры» с их ИИ-собеседниками. Открытие каталога ИИ не запускает: это просто чтение.
export async function topics(supabase: SupabaseClient): Promise<TopicCard[]> {
  await ensureTopicRooms();
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, slug, format, content, sort")
    .eq("kind", "topic")
    .is("ended_at", null)
    .order("sort");
  if (error) throw error;
  const ids = (rooms ?? []).map((r) => r.id as string);
  const { data: personas } = ids.length
    ? await supabase.from("room_personas").select("id, room_id, slug, voice, content, sort").in("room_id", ids).eq("active", true).order("sort")
    : { data: [] };
  return (rooms ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    format: r.format,
    content: r.content,
    personas: ((personas ?? []) as (RoomPersona & { room_id: string })[]).filter((p) => p.room_id === r.id).map(({ room_id, ...p }) => (void room_id, p)),
  }));
}

// Персонажи и «Пример разговора» для страницы тематической комнаты.
export async function topicExtras(supabase: SupabaseClient, roomId: string) {
  const [{ data: personas }, { data: samples }] = await Promise.all([
    supabase.from("room_personas").select("id, slug, voice, content, sort, active").eq("room_id", roomId).order("sort"),
    supabase.from("room_samples").select("locale, lines").eq("room_id", roomId),
  ]);
  return {
    personas: (personas ?? []) as (RoomPersona & { active: boolean })[],
    samples: Object.fromEntries(((samples ?? []) as { locale: string; lines: SampleLine[] }[]).map((x) => [x.locale, x.lines])) as Record<string, SampleLine[]>,
  };
}

export async function catalog(supabase: SupabaseClient, me: string) {
  const now = new Date().toISOString();
  const [{ data: rooms, error }, { data: requests }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, title, description, format, access, scheduled, starts_at, creator_id, last_activity_at")
      .eq("kind", "user")
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
