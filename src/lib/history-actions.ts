"use server";

import { requireUser } from "@/lib/supabase/server";
import { readMeta, type ReplyMeta } from "@/lib/steps";
import { unseal, unsealRows } from "@/lib/vault";

// История разговоров с ИИ. В базе текст зашифрован (см. lib/vault.ts), поэтому читаем её только через
// сервер: он открывает текст ключом человека и отдаёт его только самому человеку (сайт и приложение).

export type HistoryMessage = { id: string; role: "user" | "assistant"; content: string; step: string | null; meta: ReplyMeta | null };
export type ConversationRow = { id: string; title: string; mode: string; topic: string | null; rating: number | null; updated_at: string };

export async function listConversations(limit = 100): Promise<ConversationRow[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];
  const { data } = await supabase
    .from("conversations")
    .select("id, title, mode, topic, rating, updated_at")
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit) || 100, 200)));
  return (data ?? []).map((c) => ({ ...c, title: unseal(user.id, c.title) })) as ConversationRow[];
}

export async function loadConversation(id: string): Promise<{ conversation: ConversationRow; messages: HistoryMessage[] } | null> {
  const { supabase, user } = await requireUser();
  if (!user || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("id, title, mode, topic, rating, updated_at").eq("id", id).maybeSingle(),
    supabase.from("messages").select("id, role, content, step, meta").eq("conversation_id", id).order("created_at"),
  ]);
  if (!conversation) return null;
  return {
    conversation: { ...conversation, title: unseal(user.id, conversation.title) } as ConversationRow,
    messages: unsealRows(user.id, messages).map((m) => ({ ...m, meta: readMeta(m.meta) })) as HistoryMessage[],
  };
}
