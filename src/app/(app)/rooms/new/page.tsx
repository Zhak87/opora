import Link from "next/link";
import { getTimeZone } from "@/lib/tz";
import { toLocalInput } from "@/lib/time";
import { getLocale } from "@/i18n/server";
import { roomsMessages } from "@/i18n/rooms";
import { common } from "@/i18n/common";
import { PageHeader } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { CreateRoomForm } from "@/components/rooms/CreateRoomForm";

export default async function NewRoomPage() {
  const locale = await getLocale();
  const m = roomsMessages[locale];
  const tz = await getTimeZone();
  // По умолчанию предлагаем ближайший ровный час.
  const next = new Date(Math.ceil((Date.now() + 30 * 60_000) / 3_600_000) * 3_600_000);
  return (
    <>
      <Link href="/rooms" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <PageHeader title={m.newTitle}>{m.newLead}</PageHeader>
      <CreateRoomForm tz={tz} defaultStart={toLocalInput(next, tz)} minStart={toLocalInput(new Date(), tz)} />
    </>
  );
}
