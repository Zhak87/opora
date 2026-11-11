"use server";

import { track } from "@/lib/track";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { talkOutMessages } from "@/i18n/game-talk-out";
import { JOURNAL_KINDS, journalKinds, type JournalKind } from "@/lib/content";
import { normalizeVoice } from "@/lib/voices";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";
import { profileMessages } from "@/i18n/profile";

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

/* ---------- Разговоры ---------- */

export async function startConversation(formData: FormData) {
  const { supabase } = await authed();
  const locale = await getLocale();
  const t = chatMessages[locale];
  const mode = String(formData.get("mode") || "talk");
  const topic = getTopic(String(formData.get("topic") || ""), locale);
  const prompt = String(formData.get("prompt") || "").trim();

  const title =
    topic?.title ??
    (mode === "hope" ? String(formData.get("title") || t.hopeTitle) : formData.get("opener") ? talkOutMessages[locale].convTitle : t.newConversation);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ mode: topic ? "topic" : mode, topic: topic?.slug ?? null, title })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? t.startFailed);
  await track("chat_start");

  if (topic) {
    await supabase.from("messages").insert({ conversation_id: data.id, role: "assistant", content: topic.opener });
  }
  // Практика «Мне нужно выговориться»: разговор начинается с вопроса собеседника под выбранный режим.
  const opener = String(formData.get("opener") || "");
  const openers = talkOutMessages[locale].openers;
  if (!topic && opener in openers) {
    await supabase.from("messages").insert({ conversation_id: data.id, role: "assistant", content: openers[opener as keyof typeof openers] });
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

// Отмена отправленного сообщения: удаляем последнюю реплику человека и всё, что пришло после неё
// (ответ собеседника). Текст возвращаем, чтобы его можно было поправить и отправить заново.
export async function undoLastMessage(conversationId: string): Promise<{ content: string } | { error: string }> {
  const { supabase } = await authed();
  const t = chatMessages[await getLocale()];
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return { error: t.undoFailed };
  const { data: last } = await supabase
    .from("messages")
    .select("id, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { error: t.undoFailed };
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId)
    .gte("created_at", last.created_at);
  if (error) return { error: t.undoFailed };

  // Если это было первое сообщение обычного разговора, его название больше не подходит.
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("role", "user");
  if (!count) {
    await supabase.from("conversations").update({ title: t.newConversation }).eq("id", conversationId).eq("mode", "talk");
  }
  revalidatePath("/talk");
  return { content: last.content };
}

export async function deleteAllHistory() {
  const { supabase, user } = await authed();
  await supabase.from("conversations").delete().eq("user_id", user.id);
  await supabase.from("journal_entries").delete().eq("user_id", user.id);
  await supabase.from("personal_plans").delete().eq("user_id", user.id);
  await supabase.from("courses").delete().eq("user_id", user.id);
  await supabase.from("practice_runs").delete().eq("user_id", user.id);
  revalidatePath("/", "layout");
  redirect("/profile?cleared=1");
}

// Оценка разговора: помог ли он (3 — да, 2 — немного, 1 — нет). В аналитику идёт только сама оценка.
export async function rateConversation(conversationId: string, value: number): Promise<{ ok: boolean }> {
  const { supabase } = await authed();
  if (!/^[0-9a-f-]{36}$/i.test(conversationId) || ![1, 2, 3].includes(value)) return { ok: false };
  const { error } = await supabase.from("conversations").update({ rating: value }).eq("id", conversationId);
  if (error) return { ok: false };
  await track("chat_rated", { value: String(value) });
  return { ok: true };
}

/* ---------- Дневник ---------- */

export async function addJournalEntry(_: unknown, formData: FormData) {
  const { supabase } = await authed();
  const t = chatMessages[await getLocale()];
  const content = String(formData.get("content") || "").trim();
  const kind = String(formData.get("kind") || "thought") as JournalKind;
  if (!content) return { error: t.journalEmpty };
  if (!(kind in JOURNAL_KINDS)) return { error: t.journalUnknownKind };
  const { error } = await supabase.from("journal_entries").insert({ kind, content: content.slice(0, 10000) });
  if (error) return { error: t.journalSaveFailed };
  await track("journal_entry");
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
  const locale = await getLocale();
  const t = chatMessages[locale];
  const kinds = journalKinds(locale);
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
      const date = new Date(e.created_at).toLocaleDateString(INTL[locale], { day: "numeric", month: "long" });
      const label = kinds[e.kind as JournalKind]?.label ?? t.entry;
      return `${date} · ${label}\n${e.content}`;
    })
    .join("\n\n");

  const intro = id ? t.reflectOneIntro : t.reflectWeekIntro;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ mode: "journal", title: id ? t.reflectOneTitle : t.reflectWeekTitle })
    .select("id")
    .single();
  if (error || !data) throw new Error(t.startFailed);
  await supabase
    .from("messages")
    .insert({ conversation_id: data.id, role: "user", content: `${intro}\n\n${text}`.slice(0, 12000) });
  redirect(`/talk/${data.id}`);
}

/* ---------- Профиль и аккаунт ---------- */

export async function updateProfile(_: unknown, formData: FormData) {
  const { supabase, user } = await authed();
  const t = chatMessages[await getLocale()];
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const { error } = await supabase.from("profiles").upsert({ id: user.id, name: name || null });
  if (error) return { error: t.saveFailed };
  revalidatePath("/", "layout");
  return { ok: t.saved };
}

export async function saveVoice(settings: unknown) {
  const { supabase, user } = await authed();
  const voice = normalizeVoice(settings);
  const { error } = await supabase.from("profiles").update({ voice }).eq("id", user.id);
  if (error) return { error: chatMessages[await getLocale()].saveFailed };
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
  // Слово подтверждения принимаем на любом из языков: язык могли сменить, пока форма была открыта.
  const word = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (!Object.values(profileMessages).some((m) => m.confirmWord === word)) redirect("/profile?confirm=1");
  const { supabase } = await authed();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) redirect("/profile?error=1");
  await supabase.auth.signOut();
  redirect("/welcome?deleted=1");
}
