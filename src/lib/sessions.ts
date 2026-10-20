import type { SupabaseClient } from "@supabase/supabase-js";

// Встречи с психологом: типы и чтение. Создание, перенос и отмена — только через функции базы
// (supabase/migrations/0007_sessions.sql), где проверяются права и свободное время.

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type Session = {
  id: string;
  psychologist_id: string;
  client_id: string;
  link_id: string | null;
  starts_at: string;
  ends_at: string;
  status: SessionStatus;
  format: "online" | "offline";
  price: number | null;
  currency: string | null;
  summary: string | null;
  tasks: string | null;
  video_url: string | null;
  payment_status: "none" | "pending" | "paid" | "refunded";
  cancel_reason: string | null;
  cancelled_by: string | null;
};

export type Slot = { starts_at: string; ends_at: string };

export async function freeSlots(supabase: SupabaseClient, psychologistId: string, days = 21) {
  const { data } = await supabase.rpc("free_slots", { p_psychologist: psychologistId, p_days: days });
  return (data ?? []) as Slot[];
}

type Filter = { psychologist?: string; client?: string; from?: string; to?: string; status?: SessionStatus[] };

export async function listSessions(supabase: SupabaseClient, f: Filter, limit = 200) {
  let q = supabase.from("sessions").select("*").order("starts_at", { ascending: true }).limit(limit);
  if (f.psychologist) q = q.eq("psychologist_id", f.psychologist);
  if (f.client) q = q.eq("client_id", f.client);
  if (f.from) q = q.gte("starts_at", f.from);
  if (f.to) q = q.lt("starts_at", f.to);
  if (f.status) q = q.in("status", f.status);
  const { data } = await q;
  return (data ?? []) as Session[];
}

export async function getSession(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  return (data as Session | null) ?? null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
