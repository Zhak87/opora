import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { Chat } from "@/components/Chat";
import { normalizeVoice } from "@/lib/voices";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: conversation }, { data: messages }, { data: profile }] = await Promise.all([
    supabase.from("conversations").select("id, title, mode, topic").eq("id", id).maybeSingle(),
    supabase.from("messages").select("id, role, content").eq("conversation_id", id).order("created_at"),
    supabase.from("profiles").select("voice").eq("id", user!.id).maybeSingle(),
  ]);
  if (!conversation) notFound();
  const locale = await getLocale();
  const t = chatMessages[locale];

  return (
    <Chat
      key={conversation.id}
      conversationId={conversation.id}
      title={conversation.title}
      label={getTopic(conversation.topic, locale)?.title ?? t.modeLabel[conversation.mode] ?? t.defaultLabel}
      voice={normalizeVoice(profile?.voice)}
      initialMessages={(messages ?? []) as { id: string; role: "user" | "assistant"; content: string }[]}
    />
  );
}
