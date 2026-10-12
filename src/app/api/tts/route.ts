import { requireUser } from "@/lib/supabase/server";
import { synthesize, ttsConfigured } from "@/lib/ai";
import { getVoice } from "@/lib/voices";
import { HOUR, tooMany } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  if (tooMany(`tts:${user.id}`, 300, HOUR)) return new Response("busy", { status: 429 });
  if (!ttsConfigured()) return new Response("not configured", { status: 503 });

  const { text, voice } = (await req.json().catch(() => ({}))) as { text?: string; voice?: string };
  const clean = String(text ?? "").trim().slice(0, 900);
  if (!clean) return new Response("empty", { status: 400 });

  try {
    const audio = await synthesize(clean, getVoice(String(voice)).id);
    return new Response(audio as BodyInit, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" },
    });
  } catch (e) {
    const status = (e as { status?: number }).status === 429 ? 429 : 502;
    return new Response("failed", { status });
  }
}
