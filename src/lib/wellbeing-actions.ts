"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { AREAS, FEELINGS, wellbeingMessages } from "@/i18n/wellbeing";
import { dayKey } from "@/lib/time";
import { getTimeZone } from "@/lib/tz";
import { UUID_RE } from "@/lib/sessions";

type State = { ok?: string; error?: string } | undefined;

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user, m: wellbeingMessages[await getLocale()] };
}

const scale = (v: FormDataEntryValue | null, max: number) => {
  const n = Math.round(Number(v));
  return v !== null && v !== "" && Number.isFinite(n) && n >= (max === 5 ? 1 : 0) && n <= max ? n : null;
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

// Отметка дня: одна на день, повторная обновляет.
export async function saveCheckin(_: State, formData: FormData): Promise<State> {
  const { supabase, user, m } = await authed();
  const mood = scale(formData.get("mood"), 5);
  if (!mood) return { error: m.errors.mood };
  const feelings = formData
    .getAll("feelings")
    .map(String)
    .filter((f) => (FEELINGS as readonly string[]).includes(f))
    .slice(0, 8);
  const row = {
    user_id: user.id,
    day: dayKey(new Date(), await getTimeZone()),
    mood,
    energy: scale(formData.get("energy"), 5),
    calm: scale(formData.get("calm"), 5),
    sleep: scale(formData.get("sleep"), 5),
    feelings,
    note: text(formData.get("note"), 1000),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("checkins").upsert(row, { onConflict: "user_id,day" });
  if (error) return { error: m.errors.generic };
  revalidatePath("/wellbeing");
  revalidatePath("/");
  return { ok: m.checkin.saved };
}

export async function saveBalance(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const answers: Record<string, number> = {};
  for (const a of AREAS) {
    const v = scale(formData.get(a), 10);
    if (v === null) return { error: m.errors.generic };
    answers[a] = v;
  }
  const { error } = await supabase.from("self_assessments").insert({ kind: "balance", answers, note: text(formData.get("note"), 1000) });
  if (error) return { error: m.errors.generic };
  revalidatePath("/wellbeing");
  return { ok: m.balance.saved };
}

export async function createGoal(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const title = text(formData.get("title"), 200);
  if (!title) return { error: m.errors.title };
  const target = String(formData.get("target_date") ?? "");
  const { error } = await supabase.from("goals").insert({
    title,
    why: text(formData.get("why"), 1000),
    target_date: /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : null,
  });
  if (error) return { error: m.errors.generic };
  revalidatePath("/wellbeing");
  return { ok: " " };
}

// Шаг к цели: заметка и новый процент. Процент цели обновляется вместе с отметкой.
export async function addGoalStep(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const goal = String(formData.get("goal") ?? "");
  if (!UUID_RE.test(goal)) return { error: m.errors.generic };
  const progress = scale(formData.get("progress"), 100);
  const note = text(formData.get("note"), 1000);
  if (!note && progress === null) return { error: m.errors.generic };
  const { error } = await supabase.from("goal_updates").insert({ goal_id: goal, note, progress });
  if (error) return { error: m.errors.generic };
  if (progress !== null) {
    await supabase
      .from("goals")
      .update({ progress, updated_at: new Date().toISOString(), ...(progress === 100 ? { status: "done" } : {}) })
      .eq("id", goal);
  } else await supabase.from("goals").update({ updated_at: new Date().toISOString() }).eq("id", goal);
  revalidatePath("/wellbeing");
  return { ok: " " };
}

export async function setGoalStatus(formData: FormData) {
  const { supabase } = await authed();
  const goal = String(formData.get("goal") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID_RE.test(goal) || !["active", "done", "paused", "dropped"].includes(status)) return;
  await supabase
    .from("goals")
    .update({ status, updated_at: new Date().toISOString(), ...(status === "done" ? { progress: 100 } : {}) })
    .eq("id", goal);
  revalidatePath("/wellbeing");
}

export async function deleteGoal(formData: FormData) {
  const { supabase } = await authed();
  const goal = String(formData.get("goal") ?? "");
  if (!UUID_RE.test(goal)) return;
  await supabase.from("goals").delete().eq("id", goal);
  revalidatePath("/wellbeing");
}

