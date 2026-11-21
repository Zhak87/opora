import { Track } from "@/components/Track";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { people, reportList, requestList, roomInfo, roomMessages, topicExtras } from "@/lib/rooms/data";
import { aiMode } from "@/lib/rooms/companions";
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

  const moderator = info.can_moderate ?? info.is_creator;
  const [messages, list, requests, reports, extras] = await Promise.all([
    roomMessages(supabase, id),
    people(supabase, id),
    info.is_creator ? requestList(supabase, id) : Promise.resolve([]),
    moderator ? reportList(supabase, id) : Promise.resolve([]),
    info.kind === "topic" ? topicExtras(supabase, id) : Promise.resolve(null),
  ]);

  return (
    <>
    <Track name="room_join" room={id} />
    <RoomView
      me={user!.id}
      room={info}
      tz={tz}
      initialMessages={messages}
      initialPeople={list}
      initialRequests={requests}
      initialReports={reports}
      voiceReady={voiceConfigured()}
      topic={extras ? { ...extras, ai: aiMode() } : null}
    />
    </>
  );
}
