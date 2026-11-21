import { requireUser } from "@/lib/supabase/server";
import { aiAudio } from "@/lib/rooms/companions";
import { UUID } from "@/lib/rooms/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Озвучка реплики ИИ-собеседника по кнопке «Слушать ИИ». Одна озвучка на реплику для всей комнаты:
// второй и следующие слушатели получают тот же звук из памяти сервера, без нового запроса к ИИ.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = new URL(req.url).searchParams.get("m") ?? "";
  if (!UUID.test(id) || !UUID.test(message)) return new Response(null, { status: 404 });
  const { user } = await requireUser();
  if (!user) return new Response(null, { status: 401 });
  const wav = await aiAudio(id, message, user.id);
  if (!wav) return new Response(null, { status: 204 });
  return new Response(new Uint8Array(wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=900" } });
}
