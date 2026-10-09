import { requireUser } from "@/lib/supabase/server";
import { synthesize, ttsConfigured } from "@/lib/ai";
import { TONES, getVoice, type Tone } from "@/lib/voices";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  if (!ttsConfigured()) return new Response("not configured", { status: 503 });

  const { text, voice, tone } = (await req.json().catch(() => ({}))) as { text?: string; voice?: string; tone?: string };
  const clean = String(text ?? "").trim().slice(0, 900);
  if (!clean) return new Response("empty", { status: 400 });
  const style = (TONES[tone as Tone] ?? TONES.calm).prompt;

  try {
    const audio = await synthesize(clean, getVoice(String(voice)).id, style);
    return new Response(audio as BodyInit, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" },
    });
  } catch (e) {
    const status = (e as { status?: number }).status === 429 ? 429 : 502;
    return new Response("failed", { status });
  }
}
