"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { hasConsent } from "@/lib/consent";
import { getLocale } from "@/i18n/server";
import { scheduleMessages, TIMEZONES } from "@/i18n/schedule";
import { careMessages } from "@/i18n/care";
import { CARE_CONSENT_VERSION, isScope } from "@/lib/pro";
import { UUID_RE } from "@/lib/sessions";
import { timeToMinutes, zonedToUtc } from "@/lib/time";

type State = { ok?: string; error?: string } | undefined;

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

async function msg() {
  return scheduleMessages[await getLocale()];
}

function dbError(message: string | undefined, m: Awaited<ReturnType<typeof msg>>) {
  if (!message) return m.pro.errors.generic;
  if (/slot taken|sessions_no_overlap|conflicting key/.test(message)) return m.pro.errors.overlap;
  if (/in past/.test(message)) return m.pro.errors.past;
  return m.pro.errors.generic;
}

/* ---------- Клиент ---------- */

export async function bookSession(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const m = await msg();
  const psychologist = String(formData.get("psychologist") ?? "");
  const startsAt = String(formData.get("slot") ?? "");
  if (!UUID_RE.test(psychologist) || Number.isNaN(Date.parse(startsAt))) return { error: m.book.failed };
  const firstTime = formData.get("first") === "1";
  if (firstTime) {
    if (formData.get("understand") !== "on") return { error: careMessages[await getLocale()].invite.understand };
    const { data: auth } = await supabase.auth.getClaims();
    if (!hasConsent(auth?.claims)) redirect("/consent");
  }
  const { error } = await supabase.rpc("book_session", {
    p_psychologist: psychologist,
    p_starts_at: new Date(startsAt).toISOString(),
    p_format: formData.get("format") === "offline" ? "offline" : "online",
    p_scopes: formData.getAll("scopes").map(String).filter(isScope),
    p_version: CARE_CONSENT_VERSION,
  });
  if (error) return { error: /slot taken/.test(error.message) ? m.book.taken : m.book.failed };
  revalidatePath("/", "layout");
  redirect("/care?booked=1");
}

// Перенос: клиент выбирает новое окно, психолог — любое время (datetime-local в своём поясе).
export async function rescheduleSession(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const m = await msg();
  const id = String(formData.get("session") ?? "");
  let startsAt: Date | null = null;
  const slot = formData.get("slot");
  if (slot) startsAt = new Date(String(slot));
  else startsAt = zonedToUtc(String(formData.get("local") ?? ""), String(formData.get("tz") ?? "UTC"));
  if (!UUID_RE.test(id) || !startsAt || Number.isNaN(startsAt.getTime())) return { error: m.pro.errors.generic };
  const { error } = await supabase.rpc("reschedule_session", { p_session: id, p_starts_at: startsAt.toISOString() });
  if (error) return { error: /slot taken/.test(error.message) ? m.book.taken : dbError(error.message, m) };
  revalidatePath("/", "layout");
  const back = String(formData.get("back") ?? "");
  redirect(back === "pro" ? `/pro/sessions/${id}?moved=1` : "/care?rescheduled=1");
}

export async function cancelSession(formData: FormData) {
  const { supabase } = await authed();
  const id = String(formData.get("session") ?? "");
  if (!UUID_RE.test(id)) return;
  await supabase.rpc("cancel_session", { p_session: id, p_reason: String(formData.get("reason") ?? "").slice(0, 500) || null });
  revalidatePath("/", "layout");
  if (formData.get("back") === "pro") redirect(`/pro/sessions/${id}`);
  redirect("/care?cancelled=1");
}

/* ---------- Психолог ---------- */

export async function createSessionForClient(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const m = await msg();
  const client = String(formData.get("client") ?? "");
  const startsAt = zonedToUtc(String(formData.get("local") ?? ""), String(formData.get("tz") ?? "UTC"));
  const minutes = Math.min(180, Math.max(15, Number(formData.get("minutes")) || 50));
  if (!UUID_RE.test(client) || !startsAt) return { error: m.pro.errors.generic };
  const { error } = await supabase.rpc("create_session", {
    p_client: client,
    p_starts_at: startsAt.toISOString(),
    p_minutes: minutes,
    p_format: formData.get("format") === "offline" ? "offline" : "online",
  });
  if (error) return { error: dbError(error.message, m) };
  revalidatePath("/pro", "layout");
  return { ok: m.pro.saved };
}

export async function completeSession(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const m = await msg();
  const id = String(formData.get("session") ?? "");
  if (!UUID_RE.test(id)) return { error: m.pro.errors.generic };
  const { error } = await supabase.rpc("complete_session", {
    p_session: id,
    p_summary: String(formData.get("summary") ?? ""),
    p_tasks: String(formData.get("tasks") ?? ""),
  });
  if (error) return { error: m.pro.errors.generic };
  revalidatePath("/pro", "layout");
  return { ok: m.pro.saved };
}

export async function acceptRequest(formData: FormData) {
  const { supabase } = await authed();
  await supabase.rpc("accept_request", { p_link: String(formData.get("link") ?? "") });
  revalidatePath("/pro", "layout");
}

export async function declineRequest(formData: FormData) {
  const { supabase } = await authed();
  await supabase.rpc("end_link", { p_link: String(formData.get("link") ?? "") });
  revalidatePath("/pro", "layout");
}

// Рабочие часы: форма присылает пары start/end для каждого дня недели. Заменяем целиком.
export async function saveAvailability(_: State, formData: FormData): Promise<State> {
  const { supabase, user } = await authed();
  const m = await msg();
  const rows: { psychologist_id: string; weekday: number; start_min: number; end_min: number }[] = [];
  for (let day = 1; day <= 7; day++) {
    const starts = formData.getAll(`start-${day}`).map(String);
    const ends = formData.getAll(`end-${day}`).map(String);
    for (let i = 0; i < Math.min(starts.length, ends.length, 6); i++) {
      if (!starts[i] && !ends[i]) continue;
      const a = timeToMinutes(starts[i]);
      const b = ends[i] === "00:00" ? 1440 : timeToMinutes(ends[i]);
      if (a == null || b == null || b <= a) return { error: m.pro.errors.hours };
      rows.push({ psychologist_id: user.id, weekday: day, start_min: a, end_min: b });
    }
  }
  const { error: delError } = await supabase.from("availability").delete().eq("psychologist_id", user.id);
  if (delError) return { error: m.pro.errors.generic };
  if (rows.length) {
    const { error } = await supabase.from("availability").insert(rows);
    if (error) return { error: m.pro.errors.generic };
  }
  revalidatePath("/pro/schedule");
  return { ok: m.pro.saved };
}

export async function saveBookingSettings(_: State, formData: FormData): Promise<State> {
  const { supabase, user } = await authed();
  const m = await msg();
  const clamp = (key: string, min: number, max: number, def: number) => {
    const n = Math.round(Number(formData.get(key)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const tz = String(formData.get("timezone") ?? "");
  const { error } = await supabase
    .from("psychologists")
    .update({
      timezone: (TIMEZONES as readonly string[]).includes(tz) ? tz : "Asia/Almaty",
      buffer_minutes: clamp("buffer_minutes", 0, 60, 10),
      booking_notice_hours: clamp("booking_notice_hours", 0, 168, 12),
      booking_horizon_days: clamp("booking_horizon_days", 1, 90, 30),
    })
    .eq("user_id", user.id);
  if (error) return { error: m.pro.errors.generic };
  revalidatePath("/pro/schedule");
  return { ok: m.pro.saved };
}

export async function addTimeOff(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const m = await msg();
  const tz = String(formData.get("tz") ?? "UTC");
  const from = zonedToUtc(`${formData.get("from")}T00:00`, tz);
  const to = zonedToUtc(`${formData.get("to") || formData.get("from")}T00:00`, tz);
  if (!from || !to) return { error: m.pro.errors.generic };
  to.setUTCDate(to.getUTCDate() + 1);
  if (to <= from) return { error: m.pro.errors.generic };
  const { error } = await supabase
    .from("time_off")
    .insert({ starts_at: from.toISOString(), ends_at: to.toISOString(), note: String(formData.get("note") ?? "").slice(0, 200) });
  if (error) return { error: m.pro.errors.generic };
  revalidatePath("/pro/schedule");
  return { ok: m.pro.saved };
}

export async function deleteTimeOff(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("time_off").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/pro/schedule");
}
