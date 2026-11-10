import { requireUser } from "@/lib/supabase/server";
import { join, leave, presence } from "@/lib/rooms/hub";
import { eventStream } from "@/lib/rooms/sse";
import { UUID } from "@/lib/rooms/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Живые события одной комнаты. Право входа проверяется при каждом подключении,
// поэтому удалённый участник или человек без одобренной заявки поток не получит.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("not found", { status: 404 });
  const { supabase, user } = await requireUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { data: access } = await supabase.rpc("enter_room", { p_room: id });
  if (access !== "ok") return new Response(String(access ?? "forbidden"), { status: 403 });
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const connId = crypto.randomUUID();
  return eventStream(req, (send, close) => {
    join(id, { id: connId, userId: user.id, name: profile?.name ?? "", send, close });
    send({ event: "presence", data: presence(id) });
    return () => leave(id, connId);
  });
}
