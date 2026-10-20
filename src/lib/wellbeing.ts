import type { SupabaseClient } from "@supabase/supabase-js";
import { AREAS, METRICS, type Area, type Metric } from "@/i18n/wellbeing";
import { addDays, dayKey } from "./time";

// Моё состояние: отметки самочувствия, колесо баланса, цели. Чтение своих данных — напрямую (RLS),
// чтение психологом — только через функции базы client_* с проверкой согласия (0009_wellbeing.sql).

export type Checkin = {
  id: string;
  user_id: string;
  day: string;
  mood: number;
  energy: number | null;
  calm: number | null;
  sleep: number | null;
  feelings: string[];
  note: string | null;
};
export type Assessment = { id: string; kind: "balance"; answers: Partial<Record<Area, number>>; note: string | null; created_at: string };
export type GoalUpdate = { note: string | null; progress: number | null; at: string };
export type Goal = {
  id: string;
  title: string;
  why: string | null;
  status: "active" | "done" | "paused" | "dropped";
  progress: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  updates: GoalUpdate[];
};

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const toPeriod = (v: unknown): Period => (PERIODS.includes(Number(v) as Period) ? (Number(v) as Period) : 30);

const CHECKIN_COLUMNS = "id, user_id, day, mood, energy, calm, sleep, feelings, note";

export async function myCheckins(supabase: SupabaseClient, userId: string, from: string) {
  const { data } = await supabase.from("checkins").select(CHECKIN_COLUMNS).eq("user_id", userId).gte("day", from).order("day");
  return (data ?? []) as Checkin[];
}

export async function myAssessments(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("self_assessments")
    .select("id, kind, answers, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Assessment[];
}

export async function myGoals(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("goals")
    .select("id, title, why, status, progress, target_date, created_at, updated_at, goal_updates (note, progress, created_at)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return ((data ?? []) as (Omit<Goal, "updates"> & { goal_updates: { note: string | null; progress: number | null; created_at: string }[] })[]).map(
    ({ goal_updates, ...g }) => ({
      ...g,
      updates: goal_updates
        .map((u) => ({ note: u.note, progress: u.progress, at: u.created_at }))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 10),
    }),
  );
}

// Для психолога: null — клиент не дал согласия (или связь закрыта).
export async function clientCheckins(supabase: SupabaseClient, client: string, from: string) {
  const { data, error } = await supabase.rpc("client_checkins", { p_client: client, p_from: from });
  return error ? null : ((data ?? []) as Checkin[]);
}
export async function clientAssessments(supabase: SupabaseClient, client: string) {
  const { data, error } = await supabase.rpc("client_assessments", { p_client: client });
  return error ? null : ((data ?? []) as Assessment[]);
}
export async function clientGoals(supabase: SupabaseClient, client: string) {
  const { data, error } = await supabase.rpc("client_goals", { p_client: client });
  return error ? null : ((data ?? []) as Goal[]);
}

// Границы периода: последние n дней, включая сегодня, и столько же дней перед ними.
export function periodRange(period: Period, tz: string) {
  const today = dayKey(new Date(), tz);
  const from = addDays(today, 1 - period);
  return { today, from, prevFrom: addDays(from, -period), days: Array.from({ length: period }, (_, i) => addDays(from, i)) };
}

export function average(rows: Checkin[], metric: Metric) {
  const vals = rows.map((r) => r[metric]).filter((v): v is number => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function periodStats(rows: Checkin[], from: string) {
  const cur = rows.filter((r) => r.day >= from);
  const prev = rows.filter((r) => r.day < from);
  return METRICS.map((metric) => ({ metric, now: average(cur, metric), before: average(prev, metric) }));
}

export function topFeelings(rows: Checkin[], n = 3) {
  const count = new Map<string, number>();
  for (const r of rows) for (const f of r.feelings) count.set(f, (count.get(f) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export const balanceAreas = (a: Assessment | undefined) => AREAS.map((k) => (a ? Number(a.answers[k] ?? 0) : 0));
