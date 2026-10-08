import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { Chat } from "@/components/Chat";

const MODE_LABEL: Record<string, string> = { talk: "Разговор", hope: "Надежда", journal: "Дневник" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("id, title, mode, topic").eq("id", id).maybeSingle(),
    supabase.from("messages").select("id, role, content").eq("conversation_id", id).order("created_at"),
  ]);
  if (!conversation) notFound();

  return (
    <Chat
      key={conversation.id}
      conversationId={conversation.id}
      title={conversation.title}
      label={getTopic(conversation.topic)?.title ?? MODE_LABEL[conversation.mode] ?? "Разговор"}
      initialMessages={(messages ?? []) as { id: string; role: "user" | "assistant"; content: string }[]}
    />
  );
}
