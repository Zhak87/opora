import { NextResponse } from "next/server";
import { AIError, aiConfigured, streamReply, type ChatMessage } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { getLocale } from "@/i18n/server";
import { demoMessages } from "@/i18n/demo";
import { DEMO_LIMIT, DEMO_MAX_INPUT } from "@/lib/demo";
import { HOUR, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_NOTE =
  "\n\nЭто пробный разговор: человек ещё не создал аккаунт и только знакомится с «Опорой». Говорите так же тепло и по существу, как всегда. Не упоминайте аккаунт, регистрацию и ограничения: об этом приложение скажет само.";

// Простая защита от злоупотреблений: не больше 30 ответов в час с одного адреса на один сервер.
const PER_HOUR = 30;

export async function POST(req: Request) {
  const locale = await getLocale();
  const { replyFailed: FAILED, replyBusy: BUSY, greeting } = demoMessages[locale];
  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMessage[] = [];
  for (const m of raw.slice(-DEMO_LIMIT * 2 - 1)) {
    const role = (m as ChatMessage)?.role;
    const content = String((m as ChatMessage)?.content ?? "").trim().slice(0, DEMO_MAX_INPUT);
    if ((role !== "user" && role !== "assistant") || !content) continue;
    const last = messages[messages.length - 1];
    if (last?.role === role) last.content += "\n\n" + content;
    else messages.push({ role, content });
  }
  if (messages[0]?.role === "assistant") messages.unshift({ role: "user", content: greeting });

  const userCount = messages.filter((m) => m.role === "user").length;
  if (!userCount || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "nothing to answer" }, { status: 400 });
  }
  if (userCount > DEMO_LIMIT) return NextResponse.json({ error: "limit" }, { status: 403 });

  if (tooMany(`demo:${clientIp(req)}`, PER_HOUR, HOUR)) return textResponse(BUSY, 429);
  if (!aiConfigured()) return textResponse(FAILED, 503);

  let upstream: ReadableStream<string>;
  try {
    upstream = await streamReply({ system: buildSystemPrompt({ mode: "talk", locale }) + DEMO_NOTE, messages });
  } catch (e) {
    console.error(e);
    return textResponse(e instanceof AIError && e.status === 429 ? BUSY : FAILED, 502);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let any = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) any = true;
          controller.enqueue(encoder.encode(value));
        }
      } catch (e) {
        console.error(e);
      }
      if (!any) controller.enqueue(encoder.encode(FAILED));
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
