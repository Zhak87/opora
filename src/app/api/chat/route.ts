import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { AIError, aiConfigured, streamReply, type ChatMessage } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";
import { HOUR, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT = 4000;
const HISTORY_LIMIT = 40;
// Больше, чем успевает живой человек даже голосом, но не даёт выжечь ключ ИИ скриптом.
const PER_HOUR = 150;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// В голосовом режиме ответ сразу звучит вслух, поэтому он короче и без списков.
const VOICE_NOTE =
  "\n\nСейчас вы разговариваете голосом: человек говорит вслух, а ваш ответ будет озвучен. Отвечайте как в живом разговоре: 2–4 коротких предложения, без списков, нумерации, скобок и смайликов. Если нужен совет из нескольких шагов, предложите сначала один шаг и спросите, продолжить ли. Человек говорит вслух, поэтому в его словах могут быть ошибки распознавания речи: понимайте смысл.";

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { conversationId?: string; message?: string; voice?: boolean } | null;
  const conversationId = body?.conversationId;
  const message = body?.message?.trim().slice(0, MAX_INPUT);
  if (!conversationId || !UUID.test(conversationId)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const locale = await getLocale();
  const t = chatMessages[locale];
  const { notConfigured: NOT_CONFIGURED, busy: BUSY, keyProblem: KEY_PROBLEM, failed: FAILED } = t;
  if (tooMany(`chat:${user.id}`, PER_HOUR, HOUR)) return textResponse(BUSY, 429);

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
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "save failed" }, { status: 500 });
    }

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
      system:
        buildSystemPrompt({ mode: conversation.mode, topic: conversation.topic, name: profile?.name, locale }) +
        (body?.voice ? VOICE_NOTE : ""),
      messages,
    });
  } catch (e) {
    console.error(e);
    const status = e instanceof AIError ? e.status : 0;
    const text = status === 429 ? BUSY : status === 401 ? KEY_PROBLEM : FAILED;
    return textResponse(text, 502);
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
