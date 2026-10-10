"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
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
    topic?.title ?? (mode === "hope" ? String(formData.get("title") || t.hopeTitle) : t.newConversation);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ mode: topic ? "topic" : mode, topic: topic?.slug ?? null, title })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? t.startFailed);

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
  const t = chatMessages[await getLocale()];
  const content = String(formData.get("content") || "").trim();
  const kind = String(formData.get("kind") || "thought") as JournalKind;
  if (!content) return { error: t.journalEmpty };
  if (!(kind in JOURNAL_KINDS)) return { error: t.journalUnknownKind };
  const { error } = await supabase.from("journal_entries").insert({ kind, content: content.slice(0, 10000) });
  if (error) return { error: t.journalSaveFailed };
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

/* ---------- Пробный разговор ---------- */

// Переносит разговор, начатый без аккаунта, в только что созданный аккаунт.
export async function importDemo(messages: { role: string; content: string }[]): Promise<string | null> {
  const { supabase } = await authed();
  const clean = (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(0, 40)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.trim().slice(0, 4000) }));
  const first = clean.find((m) => m.role === "user");
  if (!first) return null;

  const words = first.content.replace(/\s+/g, " ");
  const title = words.length > 48 ? words.slice(0, 46).trimEnd() + "…" : words;
  const { data, error } = await supabase.from("conversations").insert({ mode: "talk", title }).select("id").single();
  if (error || !data) return null;

  // Отдельное время для каждой реплики, чтобы порядок сохранился.
  const start = Date.now() - clean.length * 1000;
  await supabase.from("messages").insert(
    clean.map((m, i) => ({
      conversation_id: data.id,
      role: m.role,
      content: m.content,
      created_at: new Date(start + i * 1000).toISOString(),
    })),
  );
  revalidatePath("/", "layout");
  return data.id;
}
