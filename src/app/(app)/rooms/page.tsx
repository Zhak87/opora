import { Track } from "@/components/Track";
import { requireUser } from "@/lib/supabase/server";
import { catalog } from "@/lib/rooms/data";
import { getTimeZone } from "@/lib/tz";
import { RoomsCatalog } from "@/components/rooms/RoomsCatalog";

export const dynamic = "force-dynamic";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, user } = await requireUser();
  const tz = await getTimeZone();
  let data: Awaited<ReturnType<typeof catalog>> | null = null;
  try {
    data = await catalog(supabase, user!.id);
  } catch (e) {
    console.error("rooms catalog:", e);
  }

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
      />
    </>
  );
}
