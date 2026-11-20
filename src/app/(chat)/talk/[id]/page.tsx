import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { Chat } from "@/components/Chat";
import { normalizeVoice } from "@/lib/voices";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";
import { loadConversation } from "@/lib/history-actions";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [loaded, { data: profile }] = await Promise.all([
    loadConversation(id),
    supabase.from("profiles").select("voice").eq("id", user!.id).maybeSingle(),
  ]);
  if (!loaded) notFound();
  const { conversation, messages } = loaded;
  const locale = await getLocale();
  const t = chatMessages[locale];

  return (
    <Chat
      key={conversation.id}
      conversationId={conversation.id}
      title={conversation.title}
      topic={conversation.topic}
      label={getTopic(conversation.topic, locale)?.title ?? t.modeLabel[conversation.mode] ?? t.defaultLabel}
      voice={normalizeVoice(profile?.voice)}
      rating={conversation.rating}
      initialMessages={messages}
    />
  );
}
