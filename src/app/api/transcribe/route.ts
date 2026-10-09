import { requireUser } from "@/lib/supabase/server";
import { aiConfigured, transcribe } from "@/lib/ai";

export const maxDuration = 60;

// Принимает короткую запись голоса (WAV) и возвращает распознанный текст.
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!aiConfigured()) return Response.json({ error: "not configured" }, { status: 503 });

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length < 2000) return Response.json({ text: "" });
  if (buf.length > 4_000_000) return Response.json({ error: "too long" }, { status: 413 });

  try {
    const text = await transcribe(buf, req.headers.get("content-type") || "audio/wav");
    return Response.json({ text });
  } catch (e) {
    const status = (e as { status?: number }).status === 429 ? 429 : 502;
    return Response.json({ error: "failed" }, { status });
  }
}
