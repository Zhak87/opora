import { requireUser } from "@/lib/supabase/server";
import { watchCatalog } from "@/lib/rooms/hub";
import { eventStream } from "@/lib/rooms/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Каталог комнат: число людей онлайн и сигнал «список изменился».
export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const id = crypto.randomUUID();
  return eventStream(req, (send) => watchCatalog(id, send));
}
