import { requireUser } from "@/lib/supabase/server";
import { transcribe } from "@/lib/ai";
import { getSession, UUID_RE } from "@/lib/sessions";
import { HOUR, tooMany } from "@/lib/rate-limit";
import { consultSpeechEnabled, keepDays } from "@/lib/consult/server";
import { startJob } from "@/lib/consult/speech-jobs";

export const runtime = "nodejs";
export const maxDuration = 40;

// Фрагмент речи одного участника встречи (WAV, ~15 секунд). Каждый участник отправляет только свой микрофон,
// поэтому реплики различаются по тому, кто отправил. Звук нигде не сохраняется: только распознанный текст,
// и только если оба участника сейчас согласны. В журналы пишутся лишь технические коды.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "not found" }, { status: 404 });
  const { supabase, user } = await requireUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const s = await getSession(supabase, id);
  if (!s || (s.client_id !== user.id && s.psychologist_id !== user.id)) return Response.json({ error: "not found" }, { status: 404 });
  if (!consultSpeechEnabled()) return Response.json({ error: "off" }, { status: 503 });
  if (tooMany(`consult-stt:${user.id}`, 400, HOUR)) return Response.json({ error: "busy" }, { status: 429 });

  // Номер разрешения до начала обработки. Если согласие изменится, пока фрагмент распознаётся, база его не примет.
  const { data: ver } = await supabase.rpc("speech_ticket", { p_session: id });
  if (typeof ver !== "number") return Response.json({ stopped: true }, { status: 409 });
  const claimed = Number(req.headers.get("x-speech-ver"));
  if (Number.isFinite(claimed) && claimed !== ver) return Response.json({ stopped: true }, { status: 409 });

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length < 4000) return Response.json({ ok: true, empty: true });
  if (buf.length > 3_000_000) return Response.json({ error: "too long" }, { status: 413 });
  const saidAt = new Date(Number(req.headers.get("x-said-at")) || Date.now());

  const job = startJob(id);
  try {
    const text = await transcribe(buf, req.headers.get("content-type") || "audio/wav", job.signal);
    if (job.signal.aborted) return Response.json({ stopped: true }, { status: 409 });
    if (!text) return Response.json({ ok: true, empty: true });
    const { data: saved, error } = await supabase.rpc("add_transcript", {
      p_session: id,
      p_ver: ver,
      p_body: text,
      p_said_at: saidAt.toISOString(),
      p_keep_days: keepDays(),
    });
    if (error) return Response.json({ error: "failed" }, { status: 500 });
    if (!saved) return Response.json({ stopped: true }, { status: 409 });
    return Response.json({ ok: true });
  } catch (e) {
    if (job.signal.aborted) return Response.json({ stopped: true }, { status: 409 });
    console.error("consult stt failed", (e as { status?: number }).status ?? "error");
    return Response.json({ error: "failed" }, { status: 502 });
  } finally {
    job.done();
  }
}
