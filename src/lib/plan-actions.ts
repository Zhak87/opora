"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { AIError, aiConfigured, generateJSON } from "@/lib/ai";
import { PLAN_SYSTEM, normalizePlan, planLanguageNote, type PlanProgress } from "@/lib/plan";
import { getLocale } from "@/i18n/server";
import { planMessages } from "@/i18n/plan";
import { JOURNAL_KINDS, type JournalKind } from "@/lib/content";
import { HOUR, tooMany } from "@/lib/rate-limit";

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

export async function createPlan(): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await authed();
  const locale = await getLocale();
  const err = planMessages[locale].errors;
  if (!aiConfigured()) return { error: err.notConnected };
  if (tooMany(`plan:${user.id}`, 10, HOUR)) return { error: err.busy };

  const [{ data: msgs }, { data: notes }, { data: profile }] = await Promise.all([
    supabase.from("messages").select("content, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(80),
    supabase.from("journal_entries").select("kind, content, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  const talk = (msgs ?? [])
    .reverse()
    .map((m) => `— ${m.content.slice(0, 700)}`)
    .join("\n");
  const diary = (notes ?? [])
    .reverse()
    .map((e) => `${JOURNAL_KINDS[e.kind as JournalKind]?.label ?? "Запись"}: ${e.content.slice(0, 600)}`)
    .join("\n");

  const material = [
    profile?.name ? `Имя: ${profile.name}` : "",
    talk ? `Что человек писал в разговорах:\n${talk.slice(-9000)}` : "Разговоров пока не было.",
    diary ? `Записи в дневнике:\n${diary.slice(-5000)}` : "Записей в дневнике пока нет.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let plan = null;
  try {
    plan = normalizePlan(await generateJSON({ system: PLAN_SYSTEM + "\n\n" + planLanguageNote(locale), messages: [{ role: "user", content: material }] }));
  } catch (e) {
    console.error("plan", e);
    if (e instanceof AIError && e.status === 401) return { error: err.badKey };
    return { error: err.busy };
  }
  if (!plan) return { error: err.buildFailed };

  const { error } = await supabase.from("personal_plans").insert({ plan });
  if (error) return { error: err.saveFailed };
  revalidatePath("/play");
  revalidatePath("/");
  return { ok: true };
}

async function updateProgress(planId: string, change: (p: PlanProgress) => PlanProgress) {
  const { supabase } = await authed();
  const { data } = await supabase.from("personal_plans").select("progress").eq("id", planId).single();
  if (!data) return;
  await supabase.from("personal_plans").update({ progress: change((data.progress ?? {}) as PlanProgress) }).eq("id", planId);
}

// day — дата в часовом поясе пользователя (YYYY-MM-DD), её передаёт браузер.
export async function toggleTip(planId: string, index: number, day: string, done: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  await updateProgress(planId, (p) => {
    const tips = { ...(p.tips ?? {}) };
    const days = new Set(tips[index] ?? []);
    if (done) days.add(day);
    else days.delete(day);
    tips[index] = [...days].sort().slice(-120);
    return { ...p, tips };
  });
  revalidatePath("/play/me");
  revalidatePath("/");
}

export async function markGamePlayed(planId: string, index: number) {
  await updateProgress(planId, (p) => ({ ...p, games: { ...(p.games ?? {}), [index]: (p.games?.[index] ?? 0) + 1 } }));
  revalidatePath("/play/me");
}
