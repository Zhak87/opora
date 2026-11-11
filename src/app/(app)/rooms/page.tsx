import { Track } from "@/components/Track";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { catalog } from "@/lib/rooms/data";
import { getTimeZone } from "@/lib/tz";
import { getLocale } from "@/i18n/server";
import { roomsMessages } from "@/i18n/rooms";
import { PageHeader, buttonStyles } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { RoomsCatalog } from "@/components/rooms/RoomsCatalog";

export const dynamic = "force-dynamic";

// «Комнаты»: каталог открытых сейчас и запланированных встреч.
export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = roomsMessages[locale];
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
      <PageHeader eyebrow={m.eyebrow} title={m.title}>
        {m.lead}
      </PageHeader>
      <div className="mb-6 -mt-3 flex">
        <Link href="/rooms/new" className={`${buttonStyles.primary} w-full sm:w-auto`}>
          <PlusIcon className="h-5 w-5" /> {m.create}
        </Link>
      </div>
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
