import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { AIError, aiConfigured, streamReply, type ChatMessage } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { intakeNote } from "@/lib/intake";
import { practiceNote, recentRuns } from "@/lib/practice-memory";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";
import { HOUR, tooMany } from "@/lib/rate-limit";
import { track } from "@/lib/track";
import { splitStep } from "@/lib/steps";

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
  const started = Date.now();
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

  const [{ data: conversation }, { data: profile }] = await Promise.all([
    supabase.from("conversations").select("mode, topic").eq("id", conversationId).single(),
    supabase.from("profiles").select("name, intake").eq("id", user.id).single(),
  ]);
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });

  // id сохранённой реплики: если человек отменит её, пока собеседник отвечает, ответ не сохраняем.
  let userMessageId: string | null = null;
  let updateConversation: PromiseLike<void> | undefined;
  if (message) {
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content: message })
      .select("id")
      .single();
    userMessageId = inserted?.id ?? null;
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "save failed" }, { status: 500 });
    }

    const updatedAt = new Date().toISOString();
    updateConversation = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user")
      .then(async ({ count }) => {
        const update: { updated_at: string; title?: string } = { updated_at: updatedAt };
        if (count === 1 && conversation.mode === "talk") update.title = makeTitle(message);
        await supabase.from("conversations").update(update).eq("id", conversationId);
      });
    after(async () => { await updateConversation; });
  }

  const { data: history } = await supabase
    .from("messages")
    .select("role, content, step")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  // Собеседнику возвращаем его прошлые метки, чтобы он помнил, что уже предлагал.
  const messages = normalize(
    ((history ?? []) as (ChatMessage & { step?: string | null })[])
      .reverse()
      .map((m) => ({ role: m.role, content: m.step ? `${m.content}\n[[step:${m.step}]]` : m.content })),
  );
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "nothing to answer" }, { status: 400 });
  }

  // Метку «следующий шаг» в текст не сохраняем: шаг лежит отдельно, а текст остаётся чистым
  // (его могут читать вслух, видеть в истории и, с согласия человека, его психолог).
  const save = async (raw: string) => {
    const { text: content, step } = splitStep(raw);
    if (!content.trim()) return;
    await updateConversation;
    if (userMessageId) {
      const { data: still } = await supabase.from("messages").select("id").eq("id", userMessageId).maybeSingle();
      if (!still) return;
    }
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: content.trim(), step });
    if (step) await track("step_offered", { step });
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
        buildSystemPrompt({
          mode: conversation.mode,
          topic: conversation.topic,
          name: profile?.name,
          locale,
          calmTools: !body?.voice,
          steps: !body?.voice,
          intake: intakeNote(profile?.intake),
          practices: practiceNote(await recentRuns(supabase, 8)),
        }) +
        (body?.voice ? VOICE_NOTE : ""),
      messages,
      signal: req.signal,
    });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    const status = e instanceof AIError ? e.status : 0;
    const text = status === 429 ? BUSY : status === 401 ? KEY_PROBLEM : FAILED;
    return textResponse(text, 502);
  }

  const tracking = track("chat_reply");
  after(() => tracking);

  let full = "";
  let cancelled = false;
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!full) console.log(`[chat] first chunk in ${Date.now() - started} ms`);
          full += value;
          controller.enqueue(encoder.encode(value));
        }
      } catch (e) {
        if (!cancelled && !req.signal.aborted) console.error(e);
      } finally {
        reader.releaseLock();
      }
      if (cancelled) return;
      if (req.signal.aborted) {
        controller.close();
        return;
      }
      if (full.trim()) await save(full);
      else controller.enqueue(encoder.encode(FAILED));
      if (!cancelled) controller.close();
    },
    async cancel(reason) {
      cancelled = true;
      await reader.cancel(reason).catch(() => {});
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, no-transform" },
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
