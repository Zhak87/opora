import { requireUser } from "@/lib/supabase/server";
import { getSession, UUID_RE } from "@/lib/sessions";
import { HOUR, tooMany } from "@/lib/rate-limit";
import { getLocale } from "@/i18n/server";
import { consultAiEnabled } from "@/lib/consult/server";
import { answerQuestion, maybeHint, prepQuestions, recentMessages, transcriptCount } from "@/lib/consult/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

// Панель помощника. Только для психолога этой встречи: клиент и другие пользователи получают 404.
async function psychologistOnly(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const s = await getSession(supabase, id);
  if (!s || s.psychologist_id !== user.id) return null;
  return { supabase, s, user };
}

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await psychologistOnly((await params).id);
  if (!ctx) return notFound();
  const after = Number(new URL(req.url).searchParams.get("after")) || 0;
  const live = new URL(req.url).searchParams.get("live") === "1";
  const ai = consultAiEnabled();
  let hintFailed = false;
  if (ai && live && ctx.s.status === "scheduled") {
    try {
      await maybeHint(ctx.supabase, ctx.s, await getLocale());
    } catch {
      hintFailed = true;
    }
  }
  const [messages, heard] = await Promise.all([recentMessages(ctx.supabase, ctx.s.id, after), transcriptCount(ctx.supabase, ctx.s.id)]);
  return Response.json({ ai, messages, heard, hintFailed });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await psychologistOnly((await params).id);
  if (!ctx) return notFound();
  if (!consultAiEnabled()) return Response.json({ error: "off" }, { status: 503 });
  if (tooMany(`consult-ai:${ctx.user.id}`, 120, HOUR)) return Response.json({ error: "busy" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { kind?: string; text?: string };
  const locale = await getLocale();
  try {
    if (body.kind === "prep") {
      // Материалы клиента — только в пределах его разрешений (функция базы проверяет согласие на аналитику).
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
      const { data } = await ctx.supabase.rpc("client_ai_material", { p_client: ctx.s.client_id, p_from: from, p_to: to });
      const msg = await prepQuestions(ctx.supabase, ctx.s, locale, (data as { data?: unknown } | null)?.data ?? null);
      return Response.json({ messages: msg ? [msg] : [] });
    }
    const text = String(body.text ?? "").trim().slice(0, 2000);
    if (!text) return Response.json({ error: "empty" }, { status: 400 });
    return Response.json({ messages: await answerQuestion(ctx.supabase, ctx.s, text, locale) });
  } catch (e) {
    console.error("consult assistant failed", (e as { status?: number }).status ?? "error");
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
