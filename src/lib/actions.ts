"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { JOURNAL_KINDS, type JournalKind } from "@/lib/content";
import { normalizeVoice } from "@/lib/voices";

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

/* ---------- Разговоры ---------- */

export async function startConversation(formData: FormData) {
  const { supabase } = await authed();
  const mode = String(formData.get("mode") || "talk");
  const topic = getTopic(String(formData.get("topic") || ""));
  const prompt = String(formData.get("prompt") || "").trim();

  const title =
    topic?.title ?? (mode === "hope" ? String(formData.get("title") || "Надежда") : "Новый разговор");

  const { data, error } = await supabase
    .from("conversations")
    .insert({ mode: topic ? "topic" : mode, topic: topic?.slug ?? null, title })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Не удалось начать разговор");

  if (topic) {
    await supabase.from("messages").insert({ conversation_id: data.id, role: "assistant", content: topic.opener });
  }
  if (prompt) {
    await supabase.from("messages").insert({ conversation_id: data.id, role: "user", content: prompt.slice(0, 4000) });
  }
  redirect(`/talk/${data.id}`);
}

export async function deleteConversation(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("conversations").delete().eq("id", String(formData.get("id")));
  revalidatePath("/talk");
  if (formData.get("redirect")) redirect("/talk");
}

export async function deleteAllHistory() {
  const { supabase, user } = await authed();
  await supabase.from("conversations").delete().eq("user_id", user.id);
  await supabase.from("journal_entries").delete().eq("user_id", user.id);
  await supabase.from("personal_plans").delete().eq("user_id", user.id);
  revalidatePath("/", "layout");
  redirect("/profile?cleared=1");
}

/* ---------- Дневник ---------- */

export async function addJournalEntry(_: unknown, formData: FormData) {
  const { supabase } = await authed();
  const content = String(formData.get("content") || "").trim();
  const kind = String(formData.get("kind") || "thought") as JournalKind;
  if (!content) return { error: "Запись пока пустая." };
  if (!(kind in JOURNAL_KINDS)) return { error: "Неизвестный тип записи." };
  const { error } = await supabase.from("journal_entries").insert({ kind, content: content.slice(0, 10000) });
  if (error) return { error: "Не получилось сохранить. Попробуйте ещё раз." };
  revalidatePath("/journal");
  return { ok: Date.now() };
}

export async function deleteJournalEntry(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("journal_entries").delete().eq("id", String(formData.get("id")));
  revalidatePath("/journal");
}

export async function reflectOnJournal(formData: FormData) {
  const { supabase } = await authed();
  const id = formData.get("id");

  let entries: { kind: string; content: string; created_at: string }[] = [];
  if (id) {
    const { data } = await supabase.from("journal_entries").select("kind, content, created_at").eq("id", String(id));
    entries = data ?? [];
  } else {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await supabase
      .from("journal_entries")
      .select("kind, content, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(30);
    entries = data ?? [];
  }
  if (!entries.length) redirect("/journal");

  const text = entries
    .map((e) => {
      const date = new Date(e.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      const label = JOURNAL_KINDS[e.kind as JournalKind]?.label ?? "Запись";
      return `${date} · ${label}\n${e.content}`;
    })
    .join("\n\n");

  const intro = id
    ? "Хочу поразмышлять над этой записью из дневника:"
    : "Вот мои записи в дневнике за последнюю неделю. Помоги мне заметить, что в них важного:";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ mode: "journal", title: id ? "Размышление над записью" : "Моя неделя в дневнике" })
    .select("id")
    .single();
  if (error || !data) throw new Error("Не удалось начать разговор");
  await supabase
    .from("messages")
    .insert({ conversation_id: data.id, role: "user", content: `${intro}\n\n${text}`.slice(0, 12000) });
  redirect(`/talk/${data.id}`);
}

/* ---------- Профиль и аккаунт ---------- */

export async function updateProfile(_: unknown, formData: FormData) {
  const { supabase, user } = await authed();
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const { error } = await supabase.from("profiles").upsert({ id: user.id, name: name || null });
  if (error) return { error: "Не получилось сохранить." };
  revalidatePath("/", "layout");
  return { ok: "Сохранено" };
}

export async function saveVoice(settings: unknown) {
  const { supabase, user } = await authed();
  const voice = normalizeVoice(settings);
  const { error } = await supabase.from("profiles").update({ voice }).eq("id", user.id);
  if (error) return { error: "Не получилось сохранить." };
  revalidatePath("/profile");
  revalidatePath("/talk", "layout");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}

export async function deleteAccount(formData: FormData) {
  if (formData.get("confirm") !== "удалить") redirect("/profile?confirm=1");
  const { supabase } = await authed();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) redirect("/profile?error=1");
  await supabase.auth.signOut();
  redirect("/welcome?deleted=1");
}
