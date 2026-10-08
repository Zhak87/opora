import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured, streamReply, type ChatMessage } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT = 4000;
const HISTORY_LIMIT = 40;

const NOT_CONFIGURED =
  "Я пока не могу ответить: ИИ ещё не подключён к приложению. Но ваши слова сохранены, и вы сможете вернуться к этому разговору позже.";
const FAILED =
  "Простите, мне не удалось ответить прямо сейчас. Ваши слова сохранены. Попробуйте, пожалуйста, ещё раз чуть позже.";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { conversationId?: string; message?: string } | null;
  const conversationId = body?.conversationId;
  const message = body?.message?.trim().slice(0, MAX_INPUT);
  if (!conversationId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, mode, topic, title")
    .eq("id", conversationId)
    .single();
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (message) {
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content: message });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user");
    const update: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (count === 1 && conversation.mode === "talk") update.title = makeTitle(message);
    await supabase.from("conversations").update(update).eq("id", conversationId);
  }

  const [{ data: history }, { data: profile }] = await Promise.all([
    supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  const messages = normalize(((history ?? []) as ChatMessage[]).reverse());
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "nothing to answer" }, { status: 400 });
  }

  const save = async (content: string) => {
    if (!content.trim()) return;
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: content.trim() });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  if (!aiConfigured()) {
    await save(NOT_CONFIGURED);
    return textResponse(NOT_CONFIGURED);
  }

  let upstream: ReadableStream<string>;
  try {
    upstream = await streamReply({
      system: buildSystemPrompt({ mode: conversation.mode, topic: conversation.topic, name: profile?.name }),
      messages,
    });
  } catch (e) {
    console.error(e);
    return textResponse(FAILED, 502);
  }

  let full = "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += value;
          controller.enqueue(encoder.encode(value));
        }
      } catch (e) {
        console.error(e);
      }
      if (full.trim()) await save(full);
      else controller.enqueue(encoder.encode(FAILED));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function textResponse(text: string, status = 200) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function makeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? clean.slice(0, 46).trimEnd() + "…" : clean;
}

// Gemini требует, чтобы история начиналась с реплики пользователя и роли чередовались.
function normalize(messages: ChatMessage[]) {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else out.push({ ...m });
  }
  if (out[0]?.role === "assistant") out.unshift({ role: "user", content: "Здравствуйте." });
  return out;
}
