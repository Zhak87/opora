import { Track } from "@/components/Track";
import { requireUser } from "@/lib/supabase/server";
import { catalog, topics as loadTopics } from "@/lib/rooms/data";
import { aiMode } from "@/lib/rooms/companions";
import type { TopicCard } from "@/lib/rooms/types";
import { getTimeZone } from "@/lib/tz";
import { RoomsCatalog } from "@/components/rooms/RoomsCatalog";

export const dynamic = "force-dynamic";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, user } = await requireUser();
  const tz = await getTimeZone();
  // Открытие каталога ИИ не запускает: здесь только чтение из базы.
  const [data, topics] = await Promise.all([
    catalog(supabase, user!.id).catch((e) => (console.error("rooms catalog:", e), null)),
    loadTopics(supabase).catch((e) => (console.error("rooms topics:", e), [] as TopicCard[])),
  ]);

  return (
    <>
      <Track name="room_view" />
      <RoomsCatalog
        me={user!.id}
        tz={tz}
        initialTab={tab === "upcoming" ? "upcoming" : "now"}
        live={data?.live ?? []}
        upcoming={data?.upcoming ?? []}
        counts={data?.counts ?? {}}
        failed={!data}
        topics={topics}
        aiVoice={aiMode() === "voice"}
      />
    </>
  );
}
