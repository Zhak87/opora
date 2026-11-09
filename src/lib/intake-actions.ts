"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { normalizeIntake } from "@/lib/intake";
import { looksLikeCrisis } from "@/lib/prompt";
import { getLocale } from "@/i18n/server";
import { intakeMessages } from "@/i18n/intake";

export async function saveIntake(raw: unknown): Promise<{ ok: true; crisis: boolean } | { error: string }> {
  const { supabase, user } = await requireUser();
  const m = intakeMessages[await getLocale()];
  if (!user) return { error: m.error };
  const intake = normalizeIntake(raw);
  const { error } = await supabase.from("profiles").update({ intake }).eq("id", user.id);
  if (error) {
    console.error(error);
    return { error: m.error };
  }
  revalidatePath("/", "layout");
  return { ok: true, crisis: looksLikeCrisis(intake.note) };
}

// «Не сейчас» на главной: больше не напоминаем, анкета остаётся доступной в профиле.
export async function skipIntake() {
  const { supabase, user } = await requireUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ intake: { skipped: true, at: new Date().toISOString() } })
    .eq("id", user.id);
  revalidatePath("/");
}

export async function clearIntake() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  await supabase
    .from("profiles")
    .update({ intake: { skipped: true, at: new Date().toISOString() } })
    .eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/profile");
}
