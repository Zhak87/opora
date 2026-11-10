import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { people, reportList, requestList, roomInfo, roomMessages } from "@/lib/rooms/data";
import { voiceConfigured } from "@/lib/rooms/voice";
import { UUID, type AccessState } from "@/lib/rooms/types";
import { getTimeZone } from "@/lib/tz";
import { RoomView } from "@/components/rooms/RoomView";
import { RoomGate } from "@/components/rooms/RoomGate";

export const dynamic = "force-dynamic";

// Страница комнаты. Право входа проверяется здесь, на сервере, в том числе при переходе по прямой ссылке:
// до начала встречи и без одобренной заявки человек видит только карточку встречи, без чата и участников.
export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const info = await roomInfo(supabase, id);
  if (!info) notFound();
  const { data: access } = await supabase.rpc("enter_room", { p_room: id });
  const state = (access ?? "not_found") as AccessState;
  const tz = await getTimeZone();

  if (state !== "ok") {
    const requests = info.is_creator && state === "not_started" ? await requestList(supabase, id) : [];
    return <RoomGate room={info} state={state} tz={tz} requests={requests} />;
  }

  const [messages, list, requests, reports] = await Promise.all([
    roomMessages(supabase, id),
    people(supabase, id),
    info.is_creator ? requestList(supabase, id) : Promise.resolve([]),
    info.is_creator ? reportList(supabase, id) : Promise.resolve([]),
  ]);

  return (
    <RoomView
      me={user!.id}
      room={info}
      tz={tz}
      initialMessages={messages}
      initialPeople={list}
      initialRequests={requests}
      initialReports={reports}
      voiceReady={voiceConfigured()}
    />
  );
}
